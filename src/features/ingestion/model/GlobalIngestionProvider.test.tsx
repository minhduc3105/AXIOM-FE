import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const api = vi.hoisted(() => ({
  createS3IngestionJob: vi.fn(),
  getAllFilesForJob: vi.fn(),
  getDocumentProcessingStatuses: vi.fn(),
  getIngestionJob: vi.fn(),
  listIngestionJobs: vi.fn(),
  uploadFiles: vi.fn(),
}));

vi.mock("../api/ingestionApi", () => api);

import {
  GlobalIngestionProvider,
  useGlobalIngestion,
} from "./GlobalIngestionProvider";
import { writeStoredIngestionJobs } from "./globalIngestionStorage";

function Probe({ onReady }: { onReady: (value: ReturnType<typeof useGlobalIngestion>) => void }) {
  const ingestion = useGlobalIngestion();
  onReady(ingestion);
  return null;
}

function renderProvider(onReady: (value: ReturnType<typeof useGlobalIngestion>) => void) {
  return render(
    <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
      <Probe onReady={onReady} />
    </GlobalIngestionProvider>,
  );
}

describe("GlobalIngestionProvider upload recovery", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("reconciles a lost upload response with the server job instead of leaving a failed spinner", async () => {
    api.uploadFiles.mockRejectedValue(new TypeError("Failed to fetch"));
    api.listIngestionJobs.mockResolvedValue([
      {
        job_id: "server-job-1",
        datasource_id: "source-1",
        organization_id: "org-1",
        workspace_id: "workspace-1",
        datasource_type: "UPLOAD",
        status: "completed",
        records_pulled: 0,
        objects_written: 1,
        manifest: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: null,
        finished_at: new Date().toISOString(),
      },
    ]);
    api.getAllFilesForJob.mockResolvedValue({
      organization_id: "org-1",
      datasource_id: "source-1",
      bucket: "uploads",
      count: 1,
      files: [
        {
          key: "uploads/invoice.pdf",
          size: 10,
          last_modified: null,
          etag: null,
          presigned_url: "http://example.test/invoice.pdf",
        },
      ],
    });
    api.getDocumentProcessingStatuses.mockResolvedValue([
      {
        object_key: "uploads/invoice.pdf",
        found: true,
        run_id: "run-1",
        document_id: "document-1",
        status: "completed",
        error_message: null,
        started_at: null,
        finished_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ]);

    let ingestion: ReturnType<typeof useGlobalIngestion> | null = null;
    renderProvider((value) => {
      ingestion = value;
    });

    await act(async () => {
      await ingestion?.startUpload([
        {
          id: "upload-1",
          name: "invoice.pdf",
          extension: "pdf",
          sizeLabel: "7 B",
          file: new File(["invoice"], "invoice.pdf", {
            type: "application/pdf",
          }),
        },
      ]);
    });

    await waitFor(() => {
      expect(api.listIngestionJobs).toHaveBeenCalledWith("org-1");
      expect(ingestion?.jobs).toEqual([]);
    });
  });

  it("reconciles a stored lost-response job after a page refresh", async () => {
    writeStoredIngestionJobs("org-1", "workspace-1", [
      {
        id: "local-job-1",
        source: "upload",
        title: "1 uploaded file",
        status: "failed",
        serverJobId: null,
        batch: null,
        objects: [
          {
            key: "invoice.pdf",
            name: "invoice.pdf",
            status: "waiting",
            runId: null,
            documentId: null,
            errorMessage: null,
          },
        ],
        errorMessage: "Failed to fetch",
        retry: "start_new_upload",
        createdAt: new Date().toISOString(),
      },
    ]);
    api.listIngestionJobs.mockResolvedValue([]);

    let ingestion: ReturnType<typeof useGlobalIngestion> | null = null;
    renderProvider((value) => {
      ingestion = value;
    });

    await waitFor(() => {
      expect(api.listIngestionJobs).toHaveBeenCalledWith("org-1");
      expect(ingestion?.jobs[0]).toMatchObject({
        status: "failed",
        retry: "retry_upload_confirmation",
      });
    });
  });
});
