import { useEffect, useMemo, useState } from "react";
import { getOrganizationFiles } from "@/features/data/api/dataApi";
import type {
  DataFile,
  DataSourceFilesPage,
} from "@/features/data/model/types";

export const REPORT_SOURCE_PAGE_SIZE = 20;

type UseReportSourcePickerOptions = {
  organizationId: string | null;
  workspaceId: string | null;
  open: boolean;
};

export function useReportSourcePicker({
  organizationId,
  workspaceId,
  open,
}: UseReportSourcePickerOptions) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<DataSourceFilesPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Map<string, DataFile>>(
    () => new Map(),
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setPage(1);
      setSearch("");
      setDebouncedSearch("");
      setSelectedFiles(new Map());
      setLoading(false);
      setError(null);
      return;
    }
    if (!organizationId || !workspaceId) {
      setResult(null);
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
      {
        page,
        pageSize: REPORT_SOURCE_PAGE_SIZE,
        search: debouncedSearch,
        sortBy: "last_modified",
        sortOrder: "desc",
      },
      controller.signal,
    )
      .then(setResult)
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load workspace files.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedSearch, open, organizationId, page, workspaceId]);

  useEffect(() => {
    if (search.trim() !== debouncedSearch) setPage(1);
  }, [debouncedSearch, search]);

  const readyFiles = useMemo(
    () => (result?.files ?? []).filter((file) => file.status === "success"),
    [result],
  );
  const selectedSourceIds = useMemo(
    () => Array.from(selectedFiles.keys()),
    [selectedFiles],
  );

  const toggleFile = (file: DataFile) => {
    if (file.status !== "success") return;
    setSelectedFiles((current) => {
      const next = new Map(current);
      if (next.has(file.key)) next.delete(file.key);
      else next.set(file.key, file);
      return next;
    });
  };

  const clearSelection = () => setSelectedFiles(new Map());

  return {
    search,
    setSearch,
    page,
    setPage,
    result,
    readyFiles,
    selectedFiles: Array.from(selectedFiles.values()),
    selectedSourceIds,
    loading,
    error,
    clearSelection,
    toggleFile,
  };
}
