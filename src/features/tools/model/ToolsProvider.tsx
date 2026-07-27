import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getToolPresentation } from "./toolPresentation";
import type { ToolKind } from "./types";

const STORAGE_KEY = "axiom.tools.enabled.v1";

type EnabledTools = Record<string, boolean>;

type ToolsContextValue = {
  isToolEnabled: (name: string, kind?: ToolKind) => boolean;
  setToolEnabled: (name: string, enabled: boolean) => void;
  toggleTool: (name: string, kind?: ToolKind) => void;
};

const ToolsContext = createContext<ToolsContextValue | null>(null);

function readStoredState(): EnabledTools {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as EnabledTools) : {};
  } catch {
    return {};
  }
}

export function ToolsProvider({ children }: { children: React.ReactNode }) {
  const [enabledTools, setEnabledTools] = useState<EnabledTools>(readStoredState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledTools));
  }, [enabledTools]);

  const isToolEnabled = useCallback(
    (name: string, kind: ToolKind = "utility_method") =>
      enabledTools[name] ?? getToolPresentation(name, kind).defaultEnabled,
    [enabledTools],
  );

  const setToolEnabled = useCallback((name: string, enabled: boolean) => {
    setEnabledTools((current) => ({ ...current, [name]: enabled }));
  }, []);

  const toggleTool = useCallback(
    (name: string, kind: ToolKind = "utility_method") => {
      setEnabledTools((current) => ({
        ...current,
        [name]: !(current[name] ?? getToolPresentation(name, kind).defaultEnabled),
      }));
    },
    [],
  );

  const value = useMemo(
    () => ({ isToolEnabled, setToolEnabled, toggleTool }),
    [isToolEnabled, setToolEnabled, toggleTool],
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
