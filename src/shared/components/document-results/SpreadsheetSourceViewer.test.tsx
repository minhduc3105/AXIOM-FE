import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as XLSX from "xlsx";
import SpreadsheetSourceViewer from "./SpreadsheetSourceViewer";

function workbookResponse() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Name", "Count", "Active", "Date", "Empty"],
      ["Alpha", 2, true, new Date("2026-08-29T00:00:00Z"), ""],
    ]),
    "Summary",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["Detail"], ["Second sheet"]]),
    "Details",
  );
  const array = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return {
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(array),
  } as unknown as Response;
}

describe("SpreadsheetSourceViewer", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the first sheet in an accessible local table and navigates sheets", async () => {
    vi.mocked(fetch).mockResolvedValue(workbookResponse());
    render(<SpreadsheetSourceViewer url="/workbook.xlsx" fileName="workbook.xlsx" onRetry={vi.fn()} />);

    expect(
      await screen.findByRole("table", {
        name: "Spreadsheet preview for workbook.xlsx, sheet Summary",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("Showing up to 2 populated rows and 5 columns")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous page" })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(
      await screen.findByRole("table", {
        name: "Spreadsheet preview for workbook.xlsx, sheet Details",
      }),
    ).toBeTruthy();
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next page" })).toHaveProperty("disabled", true);
  });

  it("rejects workbooks that have no visible sheets", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Hidden"]]), "Private");
    workbook.Workbook = { Sheets: [{ Hidden: 1 }] };
    const array = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(array),
    } as unknown as Response);

    render(<SpreadsheetSourceViewer url="/hidden.xlsx" fileName="hidden.xlsx" onRetry={vi.fn()} />);
    expect(await screen.findByText("Spreadsheet preview failed")).toBeTruthy();
  });

  it("shows a retry action after an HTTP failure", async () => {
    const retry = vi.fn();
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response);
    render(<SpreadsheetSourceViewer url="/error.xlsx" fileName="error.xlsx" onRetry={retry} />);

    expect(await screen.findByText("Spreadsheet preview failed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight fetch when unmounted", () => {
    let signal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_url, init) => {
      signal = (init as RequestInit).signal as AbortSignal;
      return new Promise(() => {});
    });
    const { unmount } = render(
      <SpreadsheetSourceViewer url="/pending.xlsx" fileName="pending.xlsx" onRetry={vi.fn()} />,
    );
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
