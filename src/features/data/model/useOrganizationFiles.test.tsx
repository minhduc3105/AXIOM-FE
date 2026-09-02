import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { DataSourceFilesPage, DataSourceFilesQuery } from "./types";

const api = vi.hoisted(() => ({
  getOrganizationFiles: vi.fn(),
  getProcessingStatuses: vi.fn(),
  mergeFileProcessingStatus: vi.fn(
    (file: { status: string }, status: { status: string }) => ({
      ...file,
      status: status.status === "completed" ? "success" : "processing",
    }),
  ),
}));

vi.mock("../api/dataApi", () => ({
  getOrganizationFiles: api.getOrganizationFiles,
  getProcessingStatuses: api.getProcessingStatuses,
  mergeFileProcessingStatus: api.mergeFileProcessingStatus,
}));

import { useOrganizationFiles } from "./useOrganizationFiles";

const query: DataSourceFilesQuery = {
  page: 1,
  pageSize: 20,
  search: "",
  sortBy: "last_modified",
  sortOrder: "desc",
};

function page(status: "processing" | "success"): DataSourceFilesPage {
  return {
    organizationId: "org-1",
    datasourceId: "__organization_files__",
    bucket: "axiom-data",
    files: [
      {
        key: "report.pdf",
        name: "report.pdf",
        type: "PDF file",
        size: 100,
        lastModified: null,
        etag: null,
        downloadUrl: "/report.pdf",
        status,
        sourceStatus: status === "success" ? "completed" : "processing",
        statusDetail: status,
        errorMessage: null,
        organizationId: "org-1",
        workspaceId: "workspace-1",
        datasourceId: null,
        bucket: "axiom-data",
        runId: null,
        documentId: null,
        datasetId: "dataset-1",
        canInspect: status === "success",
      },
    ],
    page: 1,
    pageSize: 20,
    totalCount: 1,
    totalPages: 1,
    totalUnfilteredCount: 1,
    warning: null,
  };
}

function processingStatus(status: "processing" | "success") {
  return {
    object_key: "report.pdf",
    found: true,
    run_id: "run-1",
    document_id: "document-1",
    status: status === "success" ? "completed" : "running",
    error_message: null,
    started_at: "2026-08-19T08:00:00Z",
    finished_at: status === "success" ? "2026-08-19T08:01:00Z" : null,
    created_at: "2026-08-19T08:00:00Z",
  };
}

describe("useOrganizationFiles", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("notifies the dashboard when processing status is polled", async () => {
    vi.useFakeTimers();
    const onProcessingStatusChange = vi.fn();
    let resolveSecondRequest:
      | ((value: ReturnType<typeof processingStatus>[]) => void)
      | undefined;
    api.getOrganizationFiles.mockResolvedValueOnce(page("processing"));
    api.getProcessingStatuses.mockImplementationOnce(
      () =>
        new Promise<ReturnType<typeof processingStatus>[]>((resolve) => {
          resolveSecondRequest = resolve;
        }),
    );

    renderHook(() =>
      useOrganizationFiles(
        "org-1",
        "workspace-1",
        query,
        onProcessingStatusChange,
      ),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(api.getOrganizationFiles).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(api.getOrganizationFiles).toHaveBeenCalledTimes(1);
    expect(api.getProcessingStatuses).toHaveBeenCalledTimes(1);
    expect(onProcessingStatusChange).not.toHaveBeenCalled();

    await act(async () => {
      resolveSecondRequest?.([processingStatus("success")]);
    });
    await vi.waitFor(() =>
      expect(onProcessingStatusChange).toHaveBeenCalledOnce(),
    );
  });
});
