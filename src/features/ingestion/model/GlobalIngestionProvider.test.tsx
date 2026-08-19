import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalIngestionProvider, useGlobalIngestion } from "./GlobalIngestionProvider";
import { writeStoredIngestionJobs } from "./globalIngestionStorage";

const mocks = vi.hoisted(() => ({
  uploadFiles: vi.fn(),
  getDocumentProcessingStatuses: vi.fn(),
  createS3IngestionJob: vi.fn(),
  getAllFilesForJob: vi.fn(),
  getIngestionJob: vi.fn(),
}));

vi.mock("../api/ingestionApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/ingestionApi")>()),
  uploadFiles: mocks.uploadFiles,
  getDocumentProcessingStatuses: mocks.getDocumentProcessingStatuses,
  createS3IngestionJob: mocks.createS3IngestionJob,
  getAllFilesForJob: mocks.getAllFilesForJob,
  getIngestionJob: mocks.getIngestionJob,
}));

function StartUploadButton() {
  const ingestion = useGlobalIngestion();
  const file = new File(["id,name\n1,Ada"], "people.csv", {
    type: "text/csv",
  });

  return (
    <button
      type="button"
      onClick={() =>
        void ingestion.startUpload([
          {
            id: "people",
            file,
            name: file.name,
            extension: "CSV",
            sizeLabel: "13 B",
          },
        ])
      }
    >
      Start test upload
    </button>
  );
}

function JobCount() {
  const ingestion = useGlobalIngestion();
  return <span>{ingestion.jobs.length} active job</span>;
}

function JobStatus() {
  const ingestion = useGlobalIngestion();
  return <span>{ingestion.jobs[0]?.status ?? "no job"}</span>;
}

function JobObjectKey() {
  const ingestion = useGlobalIngestion();
  return <span>{ingestion.jobs[0]?.objects[0]?.key ?? "no object"}</span>;
}

function StartS3Button() {
  const ingestion = useGlobalIngestion();
  return (
    <button
      type="button"
      onClick={() =>
        void ingestion.startS3Import({
          connection: {
            accessKeyId: "key",
            secretAccessKey: "secret",
            region: "us-east-1",
            bucketName: "contracts",
          },
          files: [
            {
              key: "contracts/a.pdf",
              name: "a.pdf",
              size: 1280,
              uploadedDate: "2026-08-19T00:00:00.000Z",
            },
          ],
          selectedKeys: ["contracts/a.pdf"],
        })
      }
    >
      Start test S3 import
    </button>
  );
}

describe("GlobalIngestionProvider", () => {
  afterEach(() => {
    cleanup();
    mocks.uploadFiles.mockReset();
    mocks.getDocumentProcessingStatuses.mockReset();
    mocks.createS3IngestionJob.mockReset();
    mocks.getAllFilesForJob.mockReset();
    mocks.getIngestionJob.mockReset();
    vi.useRealTimers();
    window.sessionStorage.clear();
  });

  it("keeps a started upload job available after child content changes", async () => {
    mocks.uploadFiles.mockReturnValue(new Promise(() => undefined));
    const actor = userEvent.setup();

    const view = render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <StartUploadButton />
        <JobCount />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Start test upload" }),
    );
    expect(await screen.findByText("1 active job")).toBeTruthy();

    view.rerender(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <JobCount />
      </GlobalIngestionProvider>,
    );
    expect(screen.getByText("1 active job")).toBeTruthy();
  });

  it("moves a completed transfer into document processing", async () => {
    mocks.uploadFiles.mockResolvedValue({
      job_id: "upload-1",
      status: "completed",
      organization_id: "org-1",
      workspace_id: "workspace-1",
      bucket: "uploads",
      count: 1,
      files: [
        {
          key: "org-1/people.csv",
          filename: "people.csv",
          content_type: "text/csv",
        },
      ],
      bucket_metadata: {},
    });
    mocks.getDocumentProcessingStatuses.mockReturnValue(
      new Promise(() => undefined),
    );
    const actor = userEvent.setup();

    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <StartUploadButton />
        <JobStatus />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Start test upload" }),
    );
    expect(await screen.findByText("processing")).toBeTruthy();
  });

  it("persists a started job without browser file contents", async () => {
    mocks.uploadFiles.mockReturnValue(new Promise(() => undefined));
    const actor = userEvent.setup();

    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <StartUploadButton />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Start test upload" }),
    );
    await waitFor(() => {
      const stored = window.sessionStorage.getItem(
        "axiom:ingestion:org-1:workspace-1",
      );
      expect(stored).toContain("people.csv");
      expect(stored).not.toContain("id,name");
    });
  });

  it("restores safe job metadata when the provider mounts", () => {
    writeStoredIngestionJobs("org-1", "workspace-1", [
      {
        id: "stored-1",
        source: "s3",
        title: "Stored contracts",
        status: "processing",
        serverJobId: null,
        batch: null,
        objects: [],
        errorMessage: null,
        retry: null,
        createdAt: "2026-08-19T00:00:00.000Z",
      },
    ]);

    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <JobCount />
      </GlobalIngestionProvider>,
    );

    expect(screen.getByText("1 active job")).toBeTruthy();
  });

  it("creates a global job after an S3 import is accepted", async () => {
    let acceptImport: (value: unknown) => void = () => undefined;
    mocks.createS3IngestionJob.mockReturnValue(
      new Promise((resolve) => {
        acceptImport = resolve;
      }),
    );
    const actor = userEvent.setup();

    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <StartS3Button />
        <JobCount />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Start test S3 import" }),
    );
    expect(screen.getByText("0 active job")).toBeTruthy();

    acceptImport({
      job_id: "s3-job-accepted",
      datasource_id: "source-1",
      organization_id: "org-1",
      workspace_id: "workspace-1",
      datasource_type: "s3",
      status: "pending",
      records_pulled: 0,
      objects_written: 0,
      manifest: null,
      error_message: null,
      created_at: "2026-08-19T00:00:00.000Z",
      updated_at: "2026-08-19T00:00:00.000Z",
      started_at: null,
      finished_at: null,
    });
    expect(await screen.findByText("1 active job")).toBeTruthy();
  });

  it("monitors S3 objects after an import has completed", async () => {
    mocks.createS3IngestionJob.mockResolvedValue({
      job_id: "s3-job-1",
      datasource_id: "source-1",
      organization_id: "org-1",
      workspace_id: "workspace-1",
      datasource_type: "s3",
      status: "completed",
      records_pulled: 1,
      objects_written: 1,
      manifest: null,
      error_message: null,
      created_at: "2026-08-19T00:00:00.000Z",
      updated_at: "2026-08-19T00:00:00.000Z",
      started_at: "2026-08-19T00:00:00.000Z",
      finished_at: "2026-08-19T00:00:00.000Z",
    });
    mocks.getAllFilesForJob.mockResolvedValue({
      organization_id: "org-1",
      datasource_id: "source-1",
      bucket: "axiom-ingestion",
      count: 1,
      files: [
        {
          key: "jobs/s3-job-1/a.pdf",
          size: 1280,
          last_modified: null,
          etag: null,
          presigned_url: "https://storage.test/a.pdf",
        },
      ],
    });
    mocks.getDocumentProcessingStatuses.mockReturnValue(
      new Promise(() => undefined),
    );
    const actor = userEvent.setup();

    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <StartS3Button />
        <JobObjectKey />
      </GlobalIngestionProvider>,
    );

    await actor.click(
      screen.getByRole("button", { name: "Start test S3 import" }),
    );
    expect(await screen.findByText("jobs/s3-job-1/a.pdf")).toBeTruthy();
  });

  it("polls an accepted S3 job until its objects are available", async () => {
    vi.useFakeTimers();
    mocks.createS3IngestionJob.mockResolvedValue({
      job_id: "s3-job-pending",
      datasource_id: "source-1",
      organization_id: "org-1",
      workspace_id: "workspace-1",
      datasource_type: "s3",
      status: "pending",
      records_pulled: 0,
      objects_written: 0,
      manifest: null,
      error_message: null,
      created_at: "2026-08-19T00:00:00.000Z",
      updated_at: "2026-08-19T00:00:00.000Z",
      started_at: null,
      finished_at: null,
    });
    render(
      <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
        <StartS3Button />
      </GlobalIngestionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start test S3 import" }));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2000);

    expect(mocks.getIngestionJob).toHaveBeenCalledWith(
      "s3-job-pending",
      expect.any(AbortSignal),
    );
  });
});
