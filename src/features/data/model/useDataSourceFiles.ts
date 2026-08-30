import { useCallback, useEffect, useState } from "react";
import { getDataSourceFiles } from "../api/dataApi";
import type { DataSourceFilesPage, DataSourceFilesQuery } from "./types";

const SEARCH_DEBOUNCE_MS = 300;
const PROCESSING_POLL_INTERVAL_MS = 2000;

type RefreshRequest = {
  id: number;
  background: boolean;
};

export function useDataSourceFiles(
  datasourceId: string | null,
  workspaceId: string,
  query: DataSourceFilesQuery,
) {
  const [result, setResult] = useState<DataSourceFilesPage | null>(null);
  const [loading, setLoading] = useState(Boolean(datasourceId));
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshRequest, setRefreshRequest] = useState<RefreshRequest>({
    id: 0,
    background: false,
  });

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(query.search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [query.search]);

  useEffect(() => {
    if (!datasourceId || !workspaceId) {
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    if (!refreshRequest.background) setLoading(true);
    setError(null);
    void getDataSourceFiles(
      datasourceId,
      workspaceId,
      { ...query, search: debouncedSearch },
      controller.signal,
    )
      .then(setResult)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load files for this data source.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    datasourceId,
    debouncedSearch,
    query.page,
    query.pageSize,
    query.sortBy,
    query.sortOrder,
    refreshRequest,
    workspaceId,
  ]);

  const refresh = useCallback(
    () =>
      setRefreshRequest((current) => ({
        id: current.id + 1,
        background: false,
      })),
    [],
  );
  const refreshInBackground = useCallback(
    () =>
      setRefreshRequest((current) => ({
        id: current.id + 1,
        background: true,
      })),
    [],
  );

  const currentResult =
    datasourceId && result?.datasourceId === datasourceId ? result : null;

  useEffect(() => {
    if (!currentResult?.files.some((file) => file.status === "processing")) {
      return;
    }

    const timer = window.setInterval(
      refreshInBackground,
      PROCESSING_POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [currentResult, refreshInBackground]);

  return {
    result: currentResult,
    loading,
    error,
    refresh,
  };
}
