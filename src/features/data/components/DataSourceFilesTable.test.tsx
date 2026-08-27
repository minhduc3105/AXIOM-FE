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

describe("DataSourceFilesTable", () => {
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
    expect(within(body).queryByRole("columnheader", { name: "File" })).toBeNull();
    expect(body.contains(fileHeader)).toBe(false);
    expect(body.contains(pagination)).toBe(false);
  });
});
