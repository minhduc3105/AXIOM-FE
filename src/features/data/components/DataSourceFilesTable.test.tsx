import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DataFile, DataSourceFilesPage } from "../model/types";
import { DataSourceFilesTable } from "./DataSourceFilesTable";

const file: DataFile = {
  key: "ready.pdf",
  name: "ready.pdf",
  type: "PDF file",
  size: 1024,
  lastModified: "2026-08-19T08:00:00Z",
  etag: null,
  downloadUrl: "/ready.pdf",
  status: "success",
  sourceStatus: "completed",
  statusDetail: "completed",
  errorMessage: null,
  organizationId: "org-1",
  workspaceId: "workspace-1",
  datasourceId: null,
  bucket: "axiom-data",
  runId: null,
  documentId: null,
  canInspect: false,
};

const failedFile: DataFile = {
  ...file,
  key: "failed.jpg",
  name: "failed.jpg",
  datasetId: "dataset-1",
  status: "failed",
  sourceStatus: "failed",
  statusDetail: "failed",
  errorMessage: "Unsupported image format",
};

const result: DataSourceFilesPage = {
  organizationId: "org-1",
  datasourceId: "source-1",
  bucket: "axiom-data",
  files: [file],
  page: 1,
  pageSize: 20,
  totalCount: 1,
  totalPages: 1,
  totalUnfilteredCount: 1,
  warning: null,
};

const emptyResult: DataSourceFilesPage = {
  ...result,
  files: [],
  totalCount: 0,
  totalPages: 0,
  totalUnfilteredCount: 0,
};

describe("DataSourceFilesTable", () => {
  it("hides the empty-state add-files action for imported sources", () => {
    render(
      <TooltipProvider>
        <DataSourceFilesTable
          result={emptyResult}
          loading={false}
          search=""
          page={1}
          pageSize={20}
          sortBy="name"
          sortOrder="asc"
          onSearchChange={vi.fn()}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
          onSortChange={vi.fn()}
          onInspect={vi.fn()}
          onCreateIngestion={vi.fn()}
          showEmptyStateAction={false}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("No files in this source")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add files" })).toBeNull();
  });

  it("keeps the table header and pagination outside the scrolling file rows", () => {
    render(
      <TooltipProvider>
        <DataSourceFilesTable
          result={result}
          loading={false}
          search=""
          page={1}
          pageSize={20}
          sortBy="name"
          sortOrder="asc"
          onSearchChange={vi.fn()}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
          onSortChange={vi.fn()}
          onInspect={vi.fn()}
        />
      </TooltipProvider>,
    );

    const body = screen.getByTestId("data-file-table-body");
    const fileHeader = screen.getByRole("columnheader", { name: "File" });
    const pagination = screen.getByText("Page 1 of 1");

    expect(body.className).toContain("overflow-y-auto");
    expect(
      within(body).queryByRole("columnheader", { name: "File" }),
    ).toBeNull();
    expect(body.contains(fileHeader)).toBe(false);
    expect(body.contains(pagination)).toBe(false);
  });

  it("offers retry for every failed file", () => {
    render(
      <TooltipProvider>
        <DataSourceFilesTable
          result={{ ...result, files: [failedFile] }}
          loading={false}
          search=""
          page={1}
          pageSize={20}
          sortBy="name"
          sortOrder="asc"
          onSearchChange={vi.fn()}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
          onSortChange={vi.fn()}
          onInspect={vi.fn()}
          onRetryIndexing={vi.fn()}
          onBulkRetry={vi.fn()}
          selectedFileKeys={[failedFile.key]}
        />
      </TooltipProvider>,
    );

    expect(
      screen.queryByRole("button", { name: "Retry indexing failed.jpg" }),
    ).not.toBeNull();
    expect(screen.queryByText("Retry failed (1)")).not.toBeNull();
  });
});
