import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { DataFile } from "../model/types";
import { DataSourcesWorkspace } from "./DataSourcesWorkspace";

function dataFile(
  name: string,
  status: DataFile["status"],
): DataFile {
  return {
    key: `workspace-1/${name}`,
    name,
    type: "PDF file",
    size: 1024,
    lastModified: "2026-08-19T08:00:00Z",
    etag: null,
    downloadUrl: `/downloads/${name}`,
    status,
    sourceStatus: status,
    statusDetail: status,
    errorMessage: status === "failed" ? "Parser failed" : null,
    organizationId: "org-1",
    workspaceId: "workspace-1",
    datasourceId: null,
    bucket: "axiom-data",
    runId: null,
    documentId: null,
    canInspect: false,
  };
}

function renderWorkspace(healthFilter: "all" | "success" | "processing" | "failed") {
  return render(
    <DataSourcesWorkspace
      datasources={[]}
      files={[
        dataFile("ready-report.pdf", "success"),
        dataFile("failed-report.pdf", "failed"),
      ]}
      jobs={[]}
      profiles={[]}
      loading={false}
      healthFilter={healthFilter}
      profileError={null}
      onCreateIngestion={vi.fn()}
      onDeleteProfile={vi.fn()}
      onHealthFilterChange={vi.fn()}
      onViewJobs={vi.fn()}
    />,
  );
}

describe("DataSourcesWorkspace health filtering", () => {
  afterEach(cleanup);

  it("shows the complete aggregate inventory for All files", () => {
    renderWorkspace("all");

    expect(screen.getByText("ready-report.pdf")).toBeTruthy();
    expect(screen.getByText("failed-report.pdf")).toBeTruthy();
  });

  it("filters the aggregate inventory by workspace health status", () => {
    renderWorkspace("failed");

    expect(screen.getByText("failed-report.pdf")).toBeTruthy();
    expect(screen.queryByText("ready-report.pdf")).toBeNull();
    expect(screen.getByText("Filtered: Failed")).toBeTruthy();
    expect(screen.getAllByText("All workspace files").length).toBeGreaterThan(0);
  });
});
