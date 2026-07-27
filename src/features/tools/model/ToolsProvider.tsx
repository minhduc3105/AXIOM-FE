import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { updateToolEnabled } from "../api/toolsApi";
import { getToolPresentation } from "./toolPresentation";
import type { ToolKind } from "./types";

type ToolOverride = {
  enabled: boolean;
  revision?: number | null;
};

type EnabledTools = Record<string, ToolOverride>;
type ToolFlags = Record<string, boolean>;
type ToolErrors = Record<string, string | null>;

type ToolsContextValue = {
  isToolEnabled: (name: string, kind?: ToolKind, apiEnabled?: boolean) => boolean;
  getToolRevision: (name: string, apiRevision?: number | null) => number | null;
  isToolUpdating: (name: string) => boolean;
  getToolError: (name: string) => string | null;
  setToolEnabled: (
    name: string,
    enabled: boolean,
    expectedRevision?: number | null,
  ) => void;
  toggleTool: (
    name: string,
    kind?: ToolKind,
    apiEnabled?: boolean,
    apiRevision?: number | null,
  ) => void;
};

const ToolsContext = createContext<ToolsContextValue | null>(null);

export function ToolsProvider({ children }: { children: React.ReactNode }) {
  const [enabledTools, setEnabledTools] = useState<EnabledTools>({});
  const [updatingTools, setUpdatingTools] = useState<ToolFlags>({});
  const [toolErrors, setToolErrors] = useState<ToolErrors>({});

  const isToolEnabled = useCallback(
    (name: string, kind: ToolKind = "utility_method", apiEnabled?: boolean) =>
      enabledTools[name]?.enabled ??
      apiEnabled ??
      getToolPresentation(name, kind).defaultEnabled,
    [enabledTools],
  );

  const getToolRevision = useCallback(
    (name: string, apiRevision?: number | null) =>
      enabledTools[name]?.revision ?? apiRevision ?? null,
    [enabledTools],
  );

  const isToolUpdating = useCallback(
    (name: string) => Boolean(updatingTools[name]),
    [updatingTools],
  );

  const getToolError = useCallback(
    (name: string) => toolErrors[name] ?? null,
    [toolErrors],
  );

  const setToolEnabled = useCallback(
    (name: string, enabled: boolean, expectedRevision?: number | null) => {
      const revision = getToolRevision(name, expectedRevision);
      if (typeof revision !== "number") {
        const message = "Tool status is unavailable until Methods-Hub returns a revision.";
        setToolErrors((current) => ({ ...current, [name]: message }));
        toast.error("Unable to update tool status", {
          description: message,
        });
        return;
      }

      const hadOverride = Object.prototype.hasOwnProperty.call(enabledTools, name);
      const previousOverride = enabledTools[name];

      setEnabledTools((current) => ({
        ...current,
        [name]: { enabled, revision },
      }));
      setUpdatingTools((current) => ({ ...current, [name]: true }));
      setToolErrors((current) => ({ ...current, [name]: null }));

      void updateToolEnabled(name, enabled, revision)
        .then((response) => {
          const confirmedEnabled =
            response.enabled ?? response.tool?.enabled ?? enabled;
          const confirmedRevision = response.tool?.revision ?? revision + 1;
          setEnabledTools((current) => ({
            ...current,
            [name]: {
              enabled: confirmedEnabled,
              revision: confirmedRevision,
            },
          }));
          toast.success(`${name} ${confirmedEnabled ? "enabled" : "disabled"}`);
        })
        .catch((error: unknown) => {
          setEnabledTools((current) => {
            if (current[name]?.enabled !== enabled) return current;
            const next = { ...current };
            if (hadOverride && previousOverride) {
              next[name] = previousOverride;
            } else {
              delete next[name];
            }
            return next;
          });

          const message =
            error instanceof Error
              ? error.message
              : "Unable to update tool status.";
          setToolErrors((current) => ({ ...current, [name]: message }));
          toast.error("Unable to update tool status", {
            description: message,
          });
        })
        .finally(() => {
          setUpdatingTools((current) => ({ ...current, [name]: false }));
        });
    },
    [enabledTools, getToolRevision],
  );

  const toggleTool = useCallback(
    (
      name: string,
      kind: ToolKind = "utility_method",
      apiEnabled?: boolean,
      apiRevision?: number | null,
    ) => {
      setToolEnabled(
        name,
        !isToolEnabled(name, kind, apiEnabled),
        getToolRevision(name, apiRevision),
      );
    },
    [getToolRevision, isToolEnabled, setToolEnabled],
  );

  const value = useMemo(
    () => ({
      isToolEnabled,
      getToolRevision,
      isToolUpdating,
      getToolError,
      setToolEnabled,
      toggleTool,
    }),
    [
      isToolEnabled,
      getToolRevision,
      isToolUpdating,
      getToolError,
      setToolEnabled,
      toggleTool,
    ],
  );

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}

export function useToolsState() {
  const context = useContext(ToolsContext);
  if (!context) {
    throw new Error("useToolsState must be used within ToolsProvider.");
  }
  return context;
}
