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
    render(
      <ReportHistory
        reports={[report]}
        onDownload={vi.fn()}
      />,
    );

    expect(screen.getByText("Weekly report")).toBeTruthy();
    expect(screen.getByText("A concise weekly summary.")).toBeTruthy();
    expect(screen.queryByText("source.pdf")).toBeNull();
    expect(screen.queryByText(/2026|Aug|08:00/)).toBeNull();
    expect(screen.getByText("Weekly report").closest("button")).toBeNull();
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
      (screen.getByRole("button", {
        name: "Previous reports page",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);

    await actor.click(screen.getByRole("button", { name: "Next reports page" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
