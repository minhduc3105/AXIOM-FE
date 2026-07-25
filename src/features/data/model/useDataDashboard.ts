import { useCallback, useEffect, useState } from "react";
import { getDataDashboard } from "../api/dataApi";
import type { DataDashboardSnapshot } from "./types";

export function useDataDashboard(organizationId: string) {
  const [snapshot, setSnapshot] = useState<DataDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void getDataDashboard(organizationId, controller.signal)
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
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [organizationId, refreshToken]);

  const refresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  return { snapshot, loading, error, refresh };
}
