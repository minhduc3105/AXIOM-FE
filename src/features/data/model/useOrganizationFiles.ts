import { useCallback, useEffect, useState } from "react";
import { getOrganizationFiles } from "../api/dataApi";
import type { DataSourceFilesPage, DataSourceFilesQuery } from "./types";

const SEARCH_DEBOUNCE_MS = 300;
const PROCESSING_POLL_INTERVAL_MS = 2000;

type RefreshRequest = {
  id: number;
  background: boolean;
};

export function useOrganizationFiles(
  organizationId: string | null,
  workspaceId: string,
  query: DataSourceFilesQuery,
) {
  const [result, setResult] = useState<DataSourceFilesPage | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (!organizationId || !workspaceId) {
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    if (!refreshRequest.background) setLoading(true);
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

  useEffect(() => {
    if (!result?.files.some((file) => file.status === "processing")) {
      return;
    }

    const timer = window.setInterval(
      refreshInBackground,
      PROCESSING_POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [refreshInBackground, result]);

  return { result, loading, error, refresh };
}
