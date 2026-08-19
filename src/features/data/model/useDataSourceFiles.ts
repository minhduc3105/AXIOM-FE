import { useCallback, useEffect, useState } from "react";
import { getDataSourceFiles } from "../api/dataApi";
import type {
  DataSourceFilesPage,
  DataSourceFilesQuery,
} from "./types";

const SEARCH_DEBOUNCE_MS = 300;

export function useDataSourceFiles(
  datasourceId: string | null,
  workspaceId: string,
  query: DataSourceFilesQuery,
) {
  const [result, setResult] = useState<DataSourceFilesPage | null>(null);
  const [loading, setLoading] = useState(Boolean(datasourceId));
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

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
    setLoading(true);
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
    refreshToken,
    workspaceId,
  ]);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  const currentResult =
    datasourceId && result?.datasourceId === datasourceId ? result : null;

  return {
    result: currentResult,
    loading,
    error,
    refresh,
  };
}
