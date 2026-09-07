import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AutoReport } from "../api/reportsApi";
import { ReportHistory } from "./ReportHistory";

const report: AutoReport = {
  report_id: "report-1",
  status: "completed",
  created_at: "2026-08-27T08:00:00Z",
  completed_at: "2026-08-27T08:05:00Z",
  title: "Weekly report",
  summary: "A concise weekly summary.",
  signal: null,
  report_available: true,
  primary_source: {
    source_id: "source-1",
    document_id: "document-1",
    object_key: "organizations/test-org/sources/source.pdf",
    filename: "source.pdf",
    content_type: "application/pdf",
    source_last_modified: null,
    role: "primary",
  },
  related_source_count: 1,
};

describe("ReportHistory", () => {
  afterEach(cleanup);

  it("shows each report title and description without source or time metadata", () => {
    render(<ReportHistory reports={[report]} onDownload={vi.fn()} />);

    expect(screen.getByText("Weekly report")).toBeTruthy();
    expect(screen.getByText("A concise weekly summary.")).toBeTruthy();
    expect(screen.queryByText("source.pdf")).toBeNull();
    expect(screen.queryByText(/2026|Aug|08:00/)).toBeNull();
    expect(screen.getByText("Weekly report").closest("button")).toBeNull();
  });

  it("prefers the extracted signal title and description over history metadata", () => {
    const reportWithSignal = {
      ...report,
      title: "Automated report for source.pdf",
      summary: "The raw report-generation summary.",
      signal: {
        title: "CodeJIT and HgtJIT improve vulnerability detection",
        description: "Both approaches raise F1 across the evaluated projects.",
      },
    } satisfies AutoReport;

    render(<ReportHistory reports={[reportWithSignal]} onDownload={vi.fn()} />);

    expect(
      screen.getByText("CodeJIT and HgtJIT improve vulnerability detection"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Both approaches raise F1 across the evaluated projects.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Automated report for source.pdf")).toBeNull();
    expect(screen.queryByText("The raw report-generation summary.")).toBeNull();
  });

  it("constrains long report copy so actions remain within the report row", () => {
    const longTitle =
      "Cross-domain analysis with an intentionally very long title";

    render(
      <ReportHistory
        reports={[{ ...report, title: longTitle }]}
        onDownload={vi.fn()}
      />,
    );

    const copyRegion = screen.getByText(longTitle).parentElement?.parentElement;
    const reportList = screen
      .getByText(longTitle)
      .closest('[data-slot="card-content"]');

    expect(copyRegion?.classList.contains("min-w-0")).toBe(true);
    expect(copyRegion?.classList.contains("flex-1")).toBe(true);
    expect(reportList?.classList.contains("min-w-0")).toBe(true);
    expect(reportList?.classList.contains("grid-cols-[minmax(0,1fr)]")).toBe(
      true,
    );
  });

  it("changes pages through the pagination controls", async () => {
    const actor = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <ReportHistory
        reports={[report]}
        pagination={{
          page: 1,
          limit: 5,
          total_items: 6,
          total_pages: 2,
          has_next: true,
          has_previous: false,
        }}
        onDownload={vi.fn()}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Previous reports page",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    await actor.click(
      screen.getByRole("button", { name: "Next reports page" }),
    );

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
