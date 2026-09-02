import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { DataSourceFilesPage, DataSourceFilesQuery } from "./types";

const api = vi.hoisted(() => ({
  getDataSourceFiles: vi.fn(),
  getProcessingStatuses: vi.fn(),
  mergeFileProcessingStatus: vi.fn(
    (file: { status: string }, status: { status: string }) => ({
      ...file,
      status: status.status === "completed" ? "success" : "processing",
    }),
  ),
}));

vi.mock("../api/dataApi", () => ({
  getDataSourceFiles: api.getDataSourceFiles,
  getProcessingStatuses: api.getProcessingStatuses,
  mergeFileProcessingStatus: api.mergeFileProcessingStatus,
}));

import { useDataSourceFiles } from "./useDataSourceFiles";

const query: DataSourceFilesQuery = {
  page: 2,
  pageSize: 50,
  search: "  quarterly report  ",
  sortBy: "name",
  sortOrder: "asc",
};

function page(datasourceId: string): DataSourceFilesPage {
  return {
    organizationId: "org-1",
    datasourceId,
    bucket: "axiom-data",
    files: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
    totalUnfilteredCount: 0,
    warning: null,
  };
}

function processingPage(
  datasourceId: string,
  status: "processing" | "completed",
) {
  const healthStatus =
    status === "completed" ? ("success" as const) : ("processing" as const);
  return {
    ...page(datasourceId),
    files: [
      {
        key: "report.pdf",
        name: "report.pdf",
        type: "PDF file",
        size: 100,
        lastModified: null,
        etag: null,
        downloadUrl: "/report.pdf",
        status: healthStatus,
        sourceStatus: status,
        statusDetail: status,
        errorMessage: null,
        organizationId: "org-1",
        workspaceId: "workspace-1",
        datasourceId,
        bucket: "axiom-data",
        runId: null,
        documentId: null,
        datasetId: "dataset-1",
        canInspect: status === "completed",
      },
    ],
  };
}

function processingStatus(status: "processing" | "completed") {
  return {
    object_key: "report.pdf",
    found: true,
    run_id: "run-1",
    document_id: "document-1",
    status,
    error_message: null,
    started_at: "2026-08-19T08:00:00Z",
    finished_at: status === "completed" ? "2026-08-19T08:01:00Z" : null,
    created_at: "2026-08-19T08:00:00Z",
  };
}

describe("useDataSourceFiles", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("debounces the controlled search while preserving pagination and sort", async () => {
    vi.useFakeTimers();
    api.getDataSourceFiles.mockResolvedValue(page("source-1"));
    renderHook(() => useDataSourceFiles("source-1", "workspace-1", query));

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    const calls = api.getDataSourceFiles.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall?.[0]).toBe("source-1");
    expect(lastCall?.[2]).toEqual({
      ...query,
      search: "quarterly report",
    });
  });

  it("aborts the previous source request and never exposes its result", async () => {
    const pending = new Map<string, (value: DataSourceFilesPage) => void>();
    const signals = new Map<string, AbortSignal>();
    api.getDataSourceFiles.mockImplementation(
      (
        datasourceId: string,
        _workspaceId: string,
        _query: unknown,
        signal: AbortSignal,
      ) => {
        signals.set(datasourceId, signal);
        return new Promise<DataSourceFilesPage>((resolve) => {
          pending.set(datasourceId, resolve);
        });
      },
    );
    const { result, rerender } = renderHook(
      ({ datasourceId }) =>
        useDataSourceFiles(datasourceId, "workspace-1", {
          ...query,
          search: "",
        }),
      { initialProps: { datasourceId: "source-old" } },
    );

    rerender({ datasourceId: "source-new" });
    expect(signals.get("source-old")?.aborted).toBe(true);
    await act(async () => pending.get("source-old")?.(page("source-old")));
    expect(result.current.result).toBeNull();

    await act(async () => pending.get("source-new")?.(page("source-new")));
    expect(result.current.result?.datasourceId).toBe("source-new");
  });

  it("refreshes processing files until the backend reports completion", async () => {
    vi.useFakeTimers();
    const onProcessingStatusChange = vi.fn();
    let resolveSecondRequest:
      | ((value: ReturnType<typeof processingStatus>[]) => void)
      | undefined;
    api.getDataSourceFiles.mockResolvedValueOnce(
      processingPage("source-1", "processing"),
    );
    api.getProcessingStatuses.mockImplementationOnce(
      () =>
        new Promise<ReturnType<typeof processingStatus>[]>((resolve) => {
          resolveSecondRequest = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useDataSourceFiles(
        "source-1",
        "workspace-1",
        {
          ...query,
          search: "",
        },
        onProcessingStatusChange,
      ),
    );

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(api.getDataSourceFiles).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(api.getDataSourceFiles).toHaveBeenCalledTimes(1);
    expect(api.getProcessingStatuses).toHaveBeenCalledTimes(1);
    expect(onProcessingStatusChange).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    await act(async () => {
      resolveSecondRequest?.([processingStatus("completed")]);
    });
    await vi.waitFor(() => {
      expect(onProcessingStatusChange).toHaveBeenCalledOnce();
      expect(result.current.result?.files[0]?.status).toBe("success");
    });
  });
});
