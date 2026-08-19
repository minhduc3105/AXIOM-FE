import { useCallback, useEffect, useRef, useState } from "react";
import { getDataDashboard } from "../api/dataApi";
import type { DataDashboardSnapshot } from "./types";

export function useDataDashboard(organizationId: string, workspaceId: string) {
  const [snapshot, setSnapshot] = useState<DataDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const loadingRef = useRef(true);

  useEffect(() => {
    if (!workspaceId) {
      setSnapshot(null);
      setError(null);
      setLoading(false);
      loadingRef.current = false;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    loadingRef.current = true;
    setError(null);

    void getDataDashboard(organizationId, workspaceId, controller.signal)
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load the data dashboard.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          loadingRef.current = false;
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [organizationId, refreshToken, workspaceId]);

  const refresh = useCallback(() => {
    if (!workspaceId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setRefreshToken((current) => current + 1);
  }, [workspaceId]);

  return { snapshot, loading, error, refresh };
}
