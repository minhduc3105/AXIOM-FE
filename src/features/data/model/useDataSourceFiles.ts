import { useCallback, useEffect, useState } from "react";
import { getDataSourceFiles } from "../api/dataApi";
import type {
  DataSourceFileSortField,
  DataSourceFileSortOrder,
  DataSourceFilesPage,
} from "./types";

const SEARCH_DEBOUNCE_MS = 300;

export function useDataSourceFiles(datasourceId: string, workspaceId: string) {
  const [result, setResult] = useState<DataSourceFilesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeValue] = useState(20);
  const [sortBy, setSortBy] = useState<DataSourceFileSortField>("last_modified");
  const [sortOrder, setSortOrder] = useState<DataSourceFileSortOrder>("desc");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getDataSourceFiles(
      datasourceId,
      workspaceId,
      { page, pageSize, search: debouncedSearch, sortBy, sortOrder },
      controller.signal,
    )
      .then((nextResult) => {
        setResult(nextResult);
        if (nextResult.totalPages > 0 && page > nextResult.totalPages) {
          setPage(nextResult.totalPages);
        }
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
  }, [datasourceId, debouncedSearch, page, pageSize, refreshToken, sortBy, sortOrder, workspaceId]);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);
  const setPageSize = useCallback((value: number) => {
    setPageSizeValue(value);
    setPage(1);
  }, []);
  const changeSort = useCallback((field: DataSourceFileSortField) => {
    setSortOrder((current) =>
      sortBy === field && current === "asc" ? "desc" : "asc",
    );
    setSortBy(field);
    setPage(1);
  }, [sortBy]);
  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  return {
    result,
    loading,
    error,
    search,
    page,
    pageSize,
    sortBy,
    sortOrder,
    setSearch,
    setPage,
    setPageSize,
    changeSort,
    refresh,
  };
}
