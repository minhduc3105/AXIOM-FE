import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

const fixtures = vi.hoisted(() => {
  const workspace = {
    id: "workspace-1",
    organization_id: "org-1",
    name: "Evidence operations",
    slug: "evidence-operations",
    description: null,
    status: "active",
    is_default: true,
    role: "editor" as const,
  };
  return {
    workspace,
    selectedWorkspace: workspace as typeof workspace | null,
    files: [
      {
        key: "ready.pdf",
        name: "ready.pdf",
        type: "PDF file",
        size: 1024,
        lastModified: "2026-08-19T08:00:00Z",
        etag: null,
        downloadUrl: "/ready.pdf",
        status: "success" as const,
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
      },
      {
        key: "failed.pdf",
        name: "failed.pdf",
        type: "PDF file",
        size: 2048,
        lastModified: "2026-08-19T08:00:00Z",
        etag: null,
        downloadUrl: "/failed.pdf",
        status: "failed" as const,
        sourceStatus: "failed",
        statusDetail: "failed",
        errorMessage: "Parser failed",
        organizationId: "org-1",
        workspaceId: "workspace-1",
        datasourceId: null,
        bucket: "axiom-data",
        runId: null,
        documentId: null,
        canInspect: false,
      },
    ],
  };
});

const workspaceComponent = vi.hoisted(() => ({
  render: vi.fn(),
}));

const dashboard = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("./model/DataWorkspaceProvider", () => ({
  useDataWorkspace: () => ({
    workspaces: [fixtures.workspace],
    selectedWorkspace: fixtures.selectedWorkspace,
    loading: false,
    error: null,
    selectWorkspace: vi.fn(),
    refreshWorkspaces: vi.fn(),
  }),
}));

vi.mock("./model/useDataDashboard", () => ({
  useDataDashboard: () => ({
    snapshot: {
      organizationId: "org-1",
      workspaceId: "workspace-1",
      bucket: "axiom-data",
      bucketMetadata: {},
      files: fixtures.files,
      datasources: [],
      ingestionJobs: [],
      warnings: [],
    },
    loading: false,
    error: null,
    refresh: dashboard.refresh,
  }),
}));

vi.mock("@/shared/hooks/use-data-source-profiles", () => ({
  useDataSourceProfiles: () => ({
    profiles: [],
    error: null,
    remove: vi.fn(),
  }),
}));

vi.mock("./components/DataSourcesWorkspace", () => ({
  DataSourcesWorkspace: (props: unknown) => {
    workspaceComponent.render(props);
    return (
      <div data-testid="data-sources-workspace">
        <button
          type="button"
          onClick={() =>
            (
              props as {
                onImportSource: (datasource: {
                  id: string;
                  organizationId: string;
                  workspaceId: string;
                  name: string;
                  type: string;
                  createdAt: string;
                  updatedAt: string;
                }) => void;
              }
            ).onImportSource({
              id: "source-1",
              organizationId: "org-1",
              workspaceId: "workspace-1",
              name: "Amazon S3",
              type: "s3",
              createdAt: "2026-08-19T08:00:00Z",
              updatedAt: "2026-08-19T08:00:00Z",
            })
          }
        >
          Open import
        </button>
      </div>
    );
  },
}));

vi.mock("./components/DataSourceImportDialog", () => ({
  DataSourceImportDialog: ({ onCompleted }: { onCompleted: () => void }) => (
    <button type="button" onClick={onCompleted}>
      Complete import
    </button>
  ),
}));

import { DataPage } from "./DataPage";

describe("DataPage health summary", () => {
  afterEach(() => {
    fixtures.selectedWorkspace = fixtures.workspace;
    workspaceComponent.render.mockClear();
    dashboard.refresh.mockClear();
    cleanup();
  });

  it("renders the data source workspace without view tabs", () => {
    render(
      <TooltipProvider>
        <DataPage organizationId="org-1" onCreateIngestion={vi.fn()} />
      </TooltipProvider>,
    );

    expect(screen.getByTestId("data-sources-workspace")).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("passes workspace-wide health counts into the inventory workspace", () => {
    render(
      <TooltipProvider>
        <DataPage organizationId="org-1" onCreateIngestion={vi.fn()} />
      </TooltipProvider>,
    );

    expect(workspaceComponent.render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        summary: {
          loading: false,
          total: 2,
          ready: 1,
          processing: 0,
          failed: 1,
        },
      }),
    );
  });

  it("passes the ingestion launcher into the inventory toolbar", () => {
    render(
      <TooltipProvider>
        <DataPage
          organizationId="org-1"
          onCreateIngestion={vi.fn()}
          ingestionControl={<div data-testid="ingestion-control" />}
        />
      </TooltipProvider>,
    );

    expect(workspaceComponent.render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ingestionControl: expect.anything(),
      }),
    );
  });

  it("refreshes the imported datasource file list when import completes", () => {
    render(
      <TooltipProvider>
        <DataPage organizationId="org-1" onCreateIngestion={vi.fn()} />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open import" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete import" }));

    expect(dashboard.refresh).toHaveBeenCalledOnce();
    expect(workspaceComponent.render).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sourceRefresh: { datasourceId: "source-1", version: 1 },
      }),
    );
    expect(
      screen.queryByRole("button", { name: "Complete import" }),
    ).toBeNull();
  });

  it("keeps every workspace-scoped inventory action unavailable without a workspace", () => {
    fixtures.selectedWorkspace = null;
    render(
      <TooltipProvider>
        <DataPage organizationId="org-1" onCreateIngestion={vi.fn()} />
      </TooltipProvider>,
    );

    expect(screen.getAllByText("Select a workspace").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("data-sources-workspace")).toBeNull();
  });
});
