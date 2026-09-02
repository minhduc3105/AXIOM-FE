import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDataSourceFiles,
  getProcessingStatuses,
  mergeFileProcessingStatus,
} from "../api/dataApi";
import type { DataSourceFilesPage, DataSourceFilesQuery } from "./types";

const SEARCH_DEBOUNCE_MS = 300;
const PROCESSING_POLL_INTERVAL_MS = 2000;

type RefreshRequest = {
  id: number;
  background: boolean;
};

function hasHealthStatusChanged(
  previous: DataSourceFilesPage | null,
  next: DataSourceFilesPage,
) {
  if (!previous) return false;
  if (previous.files.length !== next.files.length) return true;
  const previousStatuses = new Map(
    previous.files.map((file) => [file.key, file.status]),
  );
  return next.files.some(
    (file) => previousStatuses.get(file.key) !== file.status,
  );
}

async function pollProcessingStatuses(
  currentResult: DataSourceFilesPage,
  workspaceId: string,
  signal: AbortSignal,
) {
  const processingFiles = currentResult.files.filter(
    (file) => file.status === "processing",
  );
  if (!processingFiles.length) return currentResult;

  try {
    const processingStatuses = await getProcessingStatuses(
      workspaceId,
      currentResult.bucket,
      processingFiles.map((file) => file.key),
      signal,
    );
    const statusByObjectKey = new Map(
      processingStatuses.map((status) => [status.object_key, status]),
    );
    return {
      ...currentResult,
      files: currentResult.files.map((file) => {
        const processingStatus = statusByObjectKey.get(file.key);
        return processingStatus
          ? mergeFileProcessingStatus(file, processingStatus)
          : file;
      }),
      warning: null,
    };
  } catch (error) {
    if (signal.aborted) throw error;
    return currentResult;
  }
}

export function useDataSourceFiles(
  datasourceId: string | null,
  workspaceId: string,
  query: DataSourceFilesQuery,
  onProcessingStatusChange?: () => void,
) {
  const [result, setResult] = useState<DataSourceFilesPage | null>(null);
  const resultRef = useRef<DataSourceFilesPage | null>(null);
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
    const currentResult = resultRef.current;
    const request =
      refreshRequest.background && currentResult
        ? pollProcessingStatuses(currentResult, workspaceId, controller.signal)
        : getDataSourceFiles(
            datasourceId,
            workspaceId,
            { ...query, search: debouncedSearch },
            controller.signal,
          );
    void request
      .then((nextResult) => {
        if (
          refreshRequest.background &&
          hasHealthStatusChanged(resultRef.current, nextResult)
        ) {
          onProcessingStatusChange?.();
        }
        resultRef.current = nextResult;
        setResult(nextResult);
      })
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
    onProcessingStatusChange,
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
