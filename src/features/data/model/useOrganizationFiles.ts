import { useCallback, useEffect, useState } from "react";
import { getOrganizationFiles } from "../api/dataApi";
import type { DataSourceFilesPage, DataSourceFilesQuery } from "./types";

const SEARCH_DEBOUNCE_MS = 300;

export function useOrganizationFiles(
  organizationId: string | null,
  workspaceId: string,
  query: DataSourceFilesQuery,
) {
  const [result, setResult] = useState<DataSourceFilesPage | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (!organizationId || !workspaceId) {
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getOrganizationFiles(
      organizationId,
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
              : "Unable to load workspace files.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    debouncedSearch,
    organizationId,
    query.page,
    query.pageSize,
    query.sortBy,
    query.sortOrder,
    refreshToken,
    workspaceId,
  ]);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);
  return { result, loading, error, refresh };
}
