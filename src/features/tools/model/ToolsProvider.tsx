import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { updateToolEnabled } from "../api/toolsApi";
import type { ToolSummary } from "./types";

type ToolOverride = { enabled: boolean };
type EnabledTools = Record<string, ToolOverride>;
type ToolFlags = Record<string, boolean>;
type ToolUpdateError = { message: string; attemptedEnabled: boolean };
type ToolErrors = Record<string, ToolUpdateError | undefined>;

type ToolsContextValue = {
  isToolEnabled: (name: string, apiEnabled: boolean) => boolean;
  isToolUpdating: (name: string) => boolean;
  getToolUpdateError: (name: string) => string | null;
  setToolEnabled: (name: string, enabled: boolean) => Promise<boolean>;
  retryToolUpdate: (name: string) => Promise<boolean>;
  reconcileCatalogTools: (tools: ToolSummary[]) => void;
};

const ToolsContext = createContext<ToolsContextValue | null>(null);

export function ToolsProvider({ children }: { children: React.ReactNode }) {
  const [enabledTools, setEnabledTools] = useState<EnabledTools>({});
  const [updatingTools, setUpdatingTools] = useState<ToolFlags>({});
  const [toolErrors, setToolErrors] = useState<ToolErrors>({});
  const enabledToolsRef = useRef<EnabledTools>({});
  const updatingToolsRef = useRef<ToolFlags>({});

  const isToolEnabled = useCallback(
    (name: string, apiEnabled: boolean) => enabledTools[name]?.enabled ?? apiEnabled,
    [enabledTools],
  );

  const isToolUpdating = useCallback(
    (name: string) => Boolean(updatingTools[name]),
    [updatingTools],
  );

  const getToolUpdateError = useCallback(
    (name: string) => toolErrors[name]?.message ?? null,
    [toolErrors],
  );

  const setToolEnabled = useCallback(async (name: string, enabled: boolean) => {
    if (updatingToolsRef.current[name]) return false;

    const previousTools = enabledToolsRef.current;
    const hadOverride = Object.prototype.hasOwnProperty.call(previousTools, name);
    const previousOverride = previousTools[name];
    const optimisticTools = { ...previousTools, [name]: { enabled } };

    enabledToolsRef.current = optimisticTools;
    updatingToolsRef.current = { ...updatingToolsRef.current, [name]: true };
    setEnabledTools(optimisticTools);
    setUpdatingTools(updatingToolsRef.current);
    setToolErrors((current) => ({ ...current, [name]: undefined }));

    try {
      const response = await updateToolEnabled(name, enabled);
      const nextTools = {
        ...enabledToolsRef.current,
        [name]: { enabled: response.enabled },
      };
      enabledToolsRef.current = nextTools;
      setEnabledTools(nextTools);
      toast.success(`${name} ${response.enabled ? "enabled" : "disabled"}`, {
        description: "This visibility change resets when Methods-Hub restarts.",
      });
      return true;
    } catch (error: unknown) {
      const nextTools = { ...enabledToolsRef.current };
      if (hadOverride && previousOverride) nextTools[name] = previousOverride;
      else delete nextTools[name];
      enabledToolsRef.current = nextTools;
      setEnabledTools(nextTools);

      const message = error instanceof Error ? error.message : "Unable to update tool status.";
      setToolErrors((current) => ({
        ...current,
        [name]: { message, attemptedEnabled: enabled },
      }));
      toast.error("Unable to update tool status", { description: message });
      return false;
    } finally {
      const nextUpdatingTools = { ...updatingToolsRef.current, [name]: false };
      updatingToolsRef.current = nextUpdatingTools;
      setUpdatingTools(nextUpdatingTools);
    }
  }, []);

  const retryToolUpdate = useCallback(async (name: string) => {
    const failedUpdate = toolErrors[name];
    if (!failedUpdate) return false;
    return setToolEnabled(name, failedUpdate.attemptedEnabled);
  }, [setToolEnabled, toolErrors]);

  const reconcileCatalogTools = useCallback((tools: ToolSummary[]) => {
    const catalogToolNames = new Set(tools.map((tool) => tool.name));
    const nextTools = Object.fromEntries(
      Object.entries(enabledToolsRef.current).filter(([name]) =>
        !catalogToolNames.has(name) || updatingToolsRef.current[name],
      ),
    );
    enabledToolsRef.current = nextTools;
    setEnabledTools(nextTools);
  }, []);

  const value = useMemo(
    () => ({
      isToolEnabled,
      isToolUpdating,
      getToolUpdateError,
      setToolEnabled,
      retryToolUpdate,
      reconcileCatalogTools,
    }),
    [getToolUpdateError, isToolEnabled, isToolUpdating, reconcileCatalogTools, retryToolUpdate, setToolEnabled],
  );

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}

export function useToolsState() {
  const context = useContext(ToolsContext);
  if (!context) throw new Error("useToolsState must be used within ToolsProvider.");
  return context;
}
