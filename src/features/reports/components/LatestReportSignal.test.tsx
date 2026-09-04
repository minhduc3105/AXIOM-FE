import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AutoReportDetail } from "../api/reportsApi";
import { LatestReportSignal } from "./LatestReportSignal";

const report: AutoReportDetail = {
  report_id: "report-1",
  status: "completed",
  created_at: "2026-08-27T06:10:00Z",
  completed_at: "2026-08-27T06:10:00Z",
  title: "Weather report",
  summary: "Summary",
  signal: null,
  report_available: true,
  primary_source: {
    source_id: "source-1",
    document_id: "document-1",
    object_key: "organizations/test-org/sources/weather.pdf",
    filename: "weather.pdf",
    content_type: "application/pdf",
    source_last_modified: null,
    role: "primary",
  },
  related_source_count: 1,
  sources: [
    {
      source_id: "source-1",
      document_id: "document-1",
      object_key: "organizations/test-org/sources/weather.pdf",
      filename: "weather.pdf",
      content_type: "application/pdf",
      source_last_modified: null,
      role: "primary",
    },
    {
      source_id: "source-2",
      document_id: null,
      object_key: "organizations/test-org/sources/brief.docx",
      filename: "brief.docx",
      content_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      source_last_modified: null,
      role: "related",
    },
  ],
  error_code: null,
  error_message: null,
  dashboard: null,
  dashboard_extraction: null,
};

describe("LatestReportSignal", () => {
  it("replaces source inspection with reference links", async () => {
    const user = userEvent.setup();
    render(
      <LatestReportSignal
        report={report}
        dashboard={null}
        loading={false}
        onDownload={vi.fn()}
      />,
    );

    expect(screen.queryByText("Inspect source")).toBeNull();
    expect(screen.queryByText("Source")).toBeNull();
    expect(screen.queryByText("Generated")).toBeNull();

    const title = screen.getByText("Weather report");
    const openPdfButton = screen.getByRole("button", { name: "Open PDF" });
    expect(openPdfButton.parentElement?.contains(title)).toBe(true);

    await user.click(screen.getByRole("button", { name: "References" }));

    const reference = screen.getByText("weather.pdf").closest("a");
    expect(reference).not.toBeNull();
    expect(reference?.getAttribute("href")).toBe(
      "/data/document/organizations%2Ftest-org%2Fsources%2Fweather.pdf?bucket=axiom-documents&source=All+workspace+files&filename=weather.pdf&document_id=document-1",
    );
    expect(reference?.getAttribute("target")).toBe("_blank");
    expect(
      screen.getByText("brief.docx").closest("a")?.getAttribute("target"),
    ).toBe("_blank");
  });
});
