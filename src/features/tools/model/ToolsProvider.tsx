import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { updateToolEnabled } from "../api/toolsApi";

type ToolOverride = {
  enabled: boolean;
};

type EnabledTools = Record<string, ToolOverride>;
type ToolFlags = Record<string, boolean>;

type ToolsContextValue = {
  isToolEnabled: (name: string, apiEnabled: boolean) => boolean;
  isToolUpdating: (name: string) => boolean;
  setToolEnabled: (name: string, enabled: boolean) => void;
};

const ToolsContext = createContext<ToolsContextValue | null>(null);

export function ToolsProvider({ children }: { children: React.ReactNode }) {
  const [enabledTools, setEnabledTools] = useState<EnabledTools>({});
  const [updatingTools, setUpdatingTools] = useState<ToolFlags>({});

  const isToolEnabled = useCallback(
    (name: string, apiEnabled: boolean) => enabledTools[name]?.enabled ?? apiEnabled,
    [enabledTools],
  );

  const isToolUpdating = useCallback(
    (name: string) => Boolean(updatingTools[name]),
    [updatingTools],
  );

  const setToolEnabled = useCallback(
    (name: string, enabled: boolean) => {
      const hadOverride = Object.prototype.hasOwnProperty.call(enabledTools, name);
      const previousOverride = enabledTools[name];

      setEnabledTools((current) => ({
        ...current,
        [name]: { enabled },
      }));
      setUpdatingTools((current) => ({ ...current, [name]: true }));

      void updateToolEnabled(name, enabled)
        .then((response) => {
          setEnabledTools((current) => ({
            ...current,
            [name]: {
              enabled: response.enabled,
            },
          }));
          toast.success(`${name} ${response.enabled ? "enabled" : "disabled"}`, {
            description: "This visibility change resets when Methods-Hub restarts.",
          });
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
          toast.error("Unable to update tool status", {
            description: message,
          });
        })
        .finally(() => {
          setUpdatingTools((current) => ({ ...current, [name]: false }));
        });
    },
    [enabledTools],
  );

  const value = useMemo(
    () => ({
      isToolEnabled,
      isToolUpdating,
      setToolEnabled,
    }),
    [
      isToolEnabled,
      isToolUpdating,
      setToolEnabled,
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
