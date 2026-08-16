import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  listMyWorkspaces,
  type AssignedWorkspace,
} from "@/features/auth/api/authzApi";
import { useAuth } from "@/features/auth/model/AuthProvider";
import {
  dataWorkspaceStorageKey,
  resolveSelectedWorkspace,
} from "./workspaceSelection";

type DataWorkspaceContextValue = {
  workspaces: AssignedWorkspace[];
  selectedWorkspace: AssignedWorkspace | null;
  loading: boolean;
  error: string | null;
  selectWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => void;
};

const DataWorkspaceContext = createContext<DataWorkspaceContextValue | null>(null);

export function DataWorkspaceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [workspaces, setWorkspaces] = useState<AssignedWorkspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<AssignedWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!auth.accessToken || !auth.user) {
      setWorkspaces([]);
      setSelectedWorkspace(null);
      return;
    }
    const controller = new AbortController();
    const storageKey = dataWorkspaceStorageKey(
      auth.user.organization_id,
      auth.user.id,
    );
    setLoading(true);
    setError(null);
    void listMyWorkspaces(auth.user.organization_id, auth.accessToken, controller.signal)
      .then((assigned) => {
        const selected = resolveSelectedWorkspace(
          assigned,
          window.localStorage.getItem(storageKey),
        );
        setWorkspaces(assigned);
        setSelectedWorkspace(selected);
        if (selected) window.localStorage.setItem(storageKey, selected.id);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load assigned workspaces.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.accessToken, auth.user, refreshToken]);

  const selectWorkspace = useCallback((workspaceId: string) => {
    setSelectedWorkspace((current) => {
      const selected = workspaces.find((workspace) => workspace.id === workspaceId);
      if (!selected || selected.id === current?.id) return current;
      if (auth.user) {
        window.localStorage.setItem(
          dataWorkspaceStorageKey(auth.user.organization_id, auth.user.id),
          selected.id,
        );
      }
      return selected;
    });
  }, [auth.user, workspaces]);

  const refreshWorkspaces = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  const value = useMemo(() => ({
    workspaces,
    selectedWorkspace,
    loading,
    error,
    selectWorkspace,
    refreshWorkspaces,
  }), [error, loading, refreshWorkspaces, selectWorkspace, selectedWorkspace, workspaces]);

  return (
    <DataWorkspaceContext.Provider value={value}>
      {children}
    </DataWorkspaceContext.Provider>
  );
}

export function useDataWorkspace() {
  const value = useContext(DataWorkspaceContext);
  if (!value) throw new Error("useDataWorkspace must be used inside DataWorkspaceProvider");
  return value;
}
