import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DataFile, DataSourceFilesPage } from "../model/types";
import { DataSourceFilesTable } from "./DataSourceFilesTable";

function file(name: string, canInspect = true): DataFile {
  return {
    key: `workspace-1/${name}`,
    name,
    type: "PDF file",
    size: 1536,
    lastModified: "2026-08-19T08:00:00Z",
    etag: null,
    downloadUrl: `/downloads/${name}`,
    status: canInspect ? "success" : "processing",
    sourceStatus: canInspect ? "completed" : "processing",
    statusDetail: canInspect ? "completed" : "parsing document",
    errorMessage: null,
    organizationId: "org-1",
    workspaceId: "workspace-1",
    datasourceId: "source-1",
    bucket: "axiom-data",
    runId: canInspect ? "run-1" : null,
    documentId: canInspect ? "document-1" : null,
    canInspect,
  };
}

function result(files: DataFile[]): DataSourceFilesPage {
  return {
    organizationId: "org-1",
    datasourceId: "source-1",
    bucket: "axiom-data",
    files,
    page: 1,
    pageSize: 20,
    totalCount: files.length,
    totalPages: files.length > 0 ? 1 : 0,
    totalUnfilteredCount: files.length,
    warning: null,
  };
}

function renderTable(
  overrides: Partial<React.ComponentProps<typeof DataSourceFilesTable>> = {},
) {
  const props: React.ComponentProps<typeof DataSourceFilesTable> = {
    result: result([
      file("a-very-long-quarterly-evidence-report-for-operations.pdf"),
      file("processing.pdf", false),
    ]),
    loading: false,
    search: "",
    page: 1,
    pageSize: 20,
    sortBy: "last_modified",
    sortOrder: "desc",
    onSearchChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onSortChange: vi.fn(),
    onInspect: vi.fn(),
    onCreateIngestion: vi.fn(),
    ...overrides,
  };
  return {
    props,
    ...render(
      <TooltipProvider>
        <DataSourceFilesTable {...props} />
      </TooltipProvider>,
    ),
  };
}

describe("DataSourceFilesTable", () => {
  afterEach(cleanup);

  it("opens inspectable files from the complete row with mouse and keyboard", async () => {
    const user = userEvent.setup();
    const onInspect = vi.fn();
    renderTable({ onInspect });
    const readyFile = screen.getByRole("row", {
      name: /open a-very-long-quarterly/i,
    });

    await user.click(readyFile);
    await user.click(
      screen.getByText(
        "a-very-long-quarterly-evidence-report-for-operations.pdf",
      ),
    );
    readyFile.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onInspect).toHaveBeenCalledTimes(4);
    expect(readyFile.getAttribute("tabindex")).toBe("0");
  });

  it("keeps embedded actions independent and explains unavailable inspection", async () => {
    const user = userEvent.setup();
    const onInspect = vi.fn();
    renderTable({ onInspect });

    await user.click(
      screen.getByRole("button", {
        name: /view processed result for a-very-long/i,
      }),
    );
    expect(onInspect).toHaveBeenCalledTimes(1);

    const unavailable = screen.getByRole("button", {
      name: "View processed result for processing.pdf",
    }) as HTMLButtonElement;
    expect(unavailable.disabled).toBe(true);
    expect(unavailable.title).toBe("Processed result is not ready");
  });

  it("exposes file type, full-name tooltip, sticky header and sort state", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const { container } = renderTable({ onSortChange });
    const filename = screen.getByText(
      "a-very-long-quarterly-evidence-report-for-operations.pdf",
    );

    expect(screen.getAllByText("PDF file").length).toBe(2);
    await user.hover(filename);
    expect(
      screen.getAllByText(
        "a-very-long-quarterly-evidence-report-for-operations.pdf",
      ).length,
    ).toBeGreaterThan(1);
    expect(
      screen
        .getByRole("columnheader", { name: /updated/i })
        .getAttribute("aria-sort"),
    ).toBe("descending");
    expect(container.querySelector("thead")?.className).toContain("sticky");

    await user.click(screen.getByRole("button", { name: /^file$/i }));
    expect(onSortChange).toHaveBeenCalledWith("name");
  });

  it("distinguishes an empty source from a search no-result state", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const { rerender } = renderTable({
      result: result([]),
      onSearchChange,
    });
    expect(screen.getByText("No files in this source")).toBeTruthy();

    const filtered = {
      ...result([]),
      totalUnfilteredCount: 12,
    };
    rerender(
      <TooltipProvider>
        <DataSourceFilesTable
          {...renderTableProps({
            result: filtered,
            search: "missing-file",
            onSearchChange,
          })}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText("No matching files")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });
});

function renderTableProps(
  overrides: Partial<React.ComponentProps<typeof DataSourceFilesTable>> = {},
): React.ComponentProps<typeof DataSourceFilesTable> {
  return {
    result: result([]),
    loading: false,
    search: "",
    page: 1,
    pageSize: 20,
    sortBy: "last_modified",
    sortOrder: "desc",
    onSearchChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onSortChange: vi.fn(),
    onInspect: vi.fn(),
    ...overrides,
  };
}
