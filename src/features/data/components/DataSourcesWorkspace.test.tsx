import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SavedDataSourceProfile } from "@/shared/types/data-source-profile";
import type {
  DataFile,
  DataHealthFilter,
  DataSource,
  DataSourceFilesPage,
  IngestionJob,
} from "../model/types";

const api = vi.hoisted(() => ({
  getDataSourceFileCount: vi.fn(),
  getDataSourceFiles: vi.fn(),
}));

vi.mock("../api/dataApi", () => ({
  getDataSourceFileCount: api.getDataSourceFileCount,
  getDataSourceFiles: api.getDataSourceFiles,
}));

vi.mock("./DataSourceFileInspector", () => ({
  DataSourceFileInspector: ({
    file,
    onBack,
  }: {
    file: DataFile;
    onBack: () => void;
  }) => (
    <div>
      <span>Inspecting {file.name}</span>
      <button type="button" onClick={onBack}>
        Back to files
      </button>
    </div>
  ),
}));

import { DataSourcesWorkspace } from "./DataSourcesWorkspace";

function ControlledWorkspace(
  props: Omit<
    React.ComponentProps<typeof DataSourcesWorkspace>,
    "healthFilter" | "onHealthFilterChange"
  > & {
    onHealthFilterChange?: (filter: DataHealthFilter | null) => void;
  },
) {
  const { onHealthFilterChange, ...workspaceProps } = props;
  const [healthFilter, setHealthFilter] = useState<DataHealthFilter | null>(
    "all",
  );
  return (
    <DataSourcesWorkspace
      {...workspaceProps}
      healthFilter={healthFilter}
      onHealthFilterChange={(filter) => {
        setHealthFilter(filter);
        onHealthFilterChange?.(filter);
      }}
    />
  );
}

function dataFile(
  name: string,
  status: DataFile["status"],
  canInspect = false,
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
    runId: canInspect ? "run-1" : null,
    documentId: canInspect ? "document-1" : null,
    canInspect,
  };
}

const externalSource: DataSource = {
  id: "source-1",
  organizationId: "org-1",
  workspaceId: "workspace-1",
  name: "Finance evidence",
  type: "s3",
  createdAt: "2026-08-18T08:00:00Z",
  updatedAt: "2026-08-19T08:00:00Z",
};

const profile: SavedDataSourceProfile = {
  id: "profile-1",
  organizationId: "org-1",
  type: "s3",
  name: "Finance reconnect",
  createdAt: "2026-08-18T08:00:00Z",
  updatedAt: "2026-08-19T08:00:00Z",
  linkedJobIds: ["job-1"],
  backendDatasourceId: "source-1",
  config: { region: "eu-west-1", bucketName: "finance-evidence" },
};

const job: IngestionJob = {
  job_id: "job-1",
  datasource_id: "source-1",
  organization_id: "org-1",
  workspace_id: "workspace-1",
  datasource_type: "s3",
  status: "completed",
  records_pulled: 3,
  objects_written: 3,
  manifest: null,
  error_message: null,
  created_at: "2026-08-19T07:00:00Z",
  updated_at: "2026-08-19T08:00:00Z",
  started_at: "2026-08-19T07:00:00Z",
  finished_at: "2026-08-19T08:00:00Z",
  healthStatus: "success",
};

function externalPage(search = ""): DataSourceFilesPage {
  const externalFile = {
    ...dataFile("quarterly-report.pdf", "success", true),
    datasourceId: "source-1",
  };
  return {
    organizationId: "org-1",
    datasourceId: "source-1",
    bucket: "axiom-data",
    files: search && !externalFile.name.includes(search) ? [] : [externalFile],
    page: 1,
    pageSize: 20,
    totalCount: search && !externalFile.name.includes(search) ? 0 : 1,
    totalPages: 1,
    totalUnfilteredCount: 3,
    warning: null,
  };
}

function renderWorkspace(healthFilter: "all" | "success" | "processing" | "failed") {
  return render(
    <DataSourcesWorkspace
      workspaceId="workspace-1"
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
  beforeEach(() => {
    api.getDataSourceFileCount.mockResolvedValue(3);
    api.getDataSourceFiles.mockImplementation(
      (_sourceId: string, _workspaceId: string, query: { search: string }) =>
        Promise.resolve(externalPage(query.search)),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

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

  it("shows source counts and preserves search and sort when changing source", async () => {
    const user = userEvent.setup();
    const onHealthFilterChange = vi.fn();
    render(
      <ControlledWorkspace
        workspaceId="workspace-1"
        datasources={[externalSource]}
        files={[dataFile("workspace-report.pdf", "success")]}
        jobs={[job]}
        profiles={[profile]}
        loading={false}
        profileError={null}
        onCreateIngestion={vi.fn()}
        onDeleteProfile={vi.fn()}
        onHealthFilterChange={onHealthFilterChange}
        onViewJobs={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getAllByText("3 files").length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: /^file$/i }));
    await user.type(screen.getByRole("textbox", { name: /search data source files/i }), "quarterly");
    const sourceButton = screen.getByText("Finance evidence").closest("button");
    expect(sourceButton).toBeTruthy();
    await user.click(sourceButton!);

    await waitFor(() => {
      const calls = api.getDataSourceFiles.mock.calls;
      const lastQuery = calls[calls.length - 1]?.[2];
      expect(lastQuery).toMatchObject({
        page: 1,
        pageSize: 20,
        search: "quarterly",
        sortBy: "name",
        sortOrder: "asc",
      });
    });
    expect(onHealthFilterChange).toHaveBeenCalledWith(null);
  });

  it("uses the compact selector and keeps a failed source count explicit", async () => {
    const user = userEvent.setup();
    api.getDataSourceFileCount.mockRejectedValue(new Error("Unavailable"));
    render(
      <ControlledWorkspace
        workspaceId="workspace-1"
        datasources={[externalSource]}
        files={[]}
        jobs={[]}
        profiles={[]}
        loading={false}
        profileError={null}
        onCreateIngestion={vi.fn()}
        onDeleteProfile={vi.fn()}
        onViewJobs={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0),
    );
    const compactSelector = screen.getByRole("button", {
      name: /select data source\. current source: all workspace files/i,
    });
    compactSelector.focus();
    fireEvent.keyDown(compactSelector, { key: "ArrowDown" });
    expect(screen.getAllByText("Data sources").length).toBeGreaterThan(1);
    await user.click(
      screen.getByRole("menuitem", { name: "Select Finance evidence" }),
    );
    expect(
      screen.getByRole("button", {
        name: /current source: finance evidence/i,
      }),
    ).toBeTruthy();
  });

  it("resets source selection and inventory query when workspace changes", async () => {
    const user = userEvent.setup();
    const props = {
      jobs: [job],
      profiles: [profile],
      loading: false,
      healthFilter: null,
      profileError: null,
      onCreateIngestion: vi.fn(),
      onDeleteProfile: vi.fn(),
      onHealthFilterChange: vi.fn(),
      onViewJobs: vi.fn(),
    };
    const { rerender } = render(
      <DataSourcesWorkspace
        {...props}
        workspaceId="workspace-1"
        datasources={[externalSource]}
        files={[dataFile("workspace-one.pdf", "success")]}
      />,
    );
    await user.click(screen.getByText("Finance evidence").closest("button")!);
    await user.type(
      screen.getByRole("textbox", { name: /search data source files/i }),
      "quarterly",
    );

    const workspaceTwoSource = {
      ...externalSource,
      id: "source-2",
      workspaceId: "workspace-2",
      name: "Research evidence",
    };
    rerender(
      <DataSourcesWorkspace
        {...props}
        workspaceId="workspace-2"
        datasources={[workspaceTwoSource]}
        files={[
          {
            ...dataFile("workspace-two.pdf", "success"),
            workspaceId: "workspace-2",
          },
        ]}
      />,
    );

    await waitFor(() =>
      expect(
        (screen.getByRole("textbox", {
          name: /search data source files/i,
        }) as HTMLInputElement).value,
      ).toBe(""),
    );
    expect(
      screen.getByRole("button", {
        name: /current source: all workspace files/i,
      }),
    ).toBeTruthy();
  });

  it("keeps inventory state after inspecting a file", async () => {
    const user = userEvent.setup();
    render(
      <DataSourcesWorkspace
        workspaceId="workspace-1"
        datasources={[]}
        files={[dataFile("ready-report.pdf", "success", true)]}
        jobs={[]}
        profiles={[]}
        loading={false}
        healthFilter="all"
        profileError={null}
        onCreateIngestion={vi.fn()}
        onDeleteProfile={vi.fn()}
        onHealthFilterChange={vi.fn()}
        onViewJobs={vi.fn()}
      />,
    );
    const search = screen.getByRole("textbox", { name: /search data source files/i });
    await user.type(search, "ready");
    await user.click(screen.getByRole("row", { name: "Open ready-report.pdf" }));
    expect(screen.getByText("Inspecting ready-report.pdf")).toBeTruthy();
    expect(
      screen.queryByRole("complementary", { name: "Data sources" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Back to files" }));
    expect(
      screen.getByRole("complementary", { name: "Data sources" }),
    ).toBeTruthy();
    expect(
      (screen.getByRole("textbox", {
        name: /search data source files/i,
      }) as HTMLInputElement).value,
    ).toBe("ready");
  });

  it("opens the add-source menu and launches the selected connector", async () => {
    const user = userEvent.setup();
    const onCreateIngestion = vi.fn();
    render(
      <DataSourcesWorkspace
        workspaceId="workspace-1"
        datasources={[]}
        files={[]}
        jobs={[]}
        profiles={[]}
        loading={false}
        healthFilter="all"
        profileError={null}
        onCreateIngestion={onCreateIngestion}
        onDeleteProfile={vi.fn()}
        onHealthFilterChange={vi.fn()}
        onViewJobs={vi.fn()}
      />,
    );

    const addSourceButtons = screen.getAllByRole("button", {
      name: "Add external source",
    });
    addSourceButtons[0].focus();
    fireEvent.keyDown(addSourceButtons[0], { key: "ArrowDown" });
    expect(screen.getByText("Connect a source")).toBeTruthy();

    await user.click(screen.getByRole("menuitem", { name: "Amazon S3" }));
    expect(onCreateIngestion).toHaveBeenCalledWith({ connector: "s3" });
  });

  it("separates reconnect, jobs, and destructive profile removal", async () => {
    const user = userEvent.setup();
    const onCreateIngestion = vi.fn();
    const onDeleteProfile = vi.fn();
    const onViewJobs = vi.fn();
    render(
      <ControlledWorkspace
        workspaceId="workspace-1"
        datasources={[externalSource]}
        files={[]}
        jobs={[job]}
        profiles={[profile]}
        loading={false}
        profileError={null}
        onCreateIngestion={onCreateIngestion}
        onDeleteProfile={onDeleteProfile}
        onViewJobs={onViewJobs}
      />,
    );
    await user.click(screen.getByText("Finance evidence").closest("button")!);

    await user.click(screen.getByRole("button", { name: "Reconnect" }));
    expect(onCreateIngestion).toHaveBeenCalledWith({
      connector: "s3",
      profileId: "profile-1",
    });
    await user.click(screen.getByRole("button", { name: "View jobs" }));
    expect(onViewJobs).toHaveBeenCalledWith("job-1");

    await user.click(screen.getByRole("button", { name: "Forget settings" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/saved non-secret reconnect settings/i)).toBeTruthy();
    expect(within(dialog).getByText(/backend data source, files, and ingestion history remain/i)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onDeleteProfile).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Forget settings" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Forget settings",
      }),
    );
    expect(onDeleteProfile).toHaveBeenCalledWith("profile-1");
  });
});
