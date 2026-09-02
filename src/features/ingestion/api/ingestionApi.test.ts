import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  authFetch: vi.fn(),
}));

vi.mock("@/features/auth/model/authFetch", () => ({
  authFetch: api.authFetch,
}));

import { listIngestionJobs, uploadFiles } from "./ingestionApi";

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(""),
  };
}

function ingestionJob(status: string) {
  return {
    job_id: "job-1",
    datasource_id: "source-1",
    organization_id: "org-1",
    workspace_id: "workspace-1",
    datasource_type: "UPLOAD",
    status,
    records_pulled: 0,
    objects_written: 1,
    manifest: [],
    error_message: null,
    created_at: "2026-09-03T00:00:00Z",
    updated_at: "2026-09-03T00:00:00Z",
    started_at: "2026-09-03T00:00:00Z",
    finished_at: status === "committed" ? "2026-09-03T00:01:00Z" : null,
  };
}

describe("ingestion API response validation", () => {
  afterEach(() => vi.clearAllMocks());

  it("accepts the committed status returned by the upload endpoint", async () => {
    api.authFetch.mockResolvedValue(
      jsonResponse(
        {
          job_id: "job-1",
          status: "committed",
          organization_id: "org-1",
          workspace_id: "workspace-1",
          bucket: "axiom-data",
          count: 1,
          files: [
            {
              key: "report.pdf",
              filename: "report.pdf",
              content_type: "application/pdf",
            },
          ],
          bucket_metadata: {},
        },
        201,
      ),
    );

    await expect(
      uploadFiles("org-1", "workspace-1", [
        new File(["report"], "report.pdf", { type: "application/pdf" }),
      ]),
    ).resolves.toMatchObject({ status: "committed" });
  });

  it("accepts committed upload jobs in ingestion history", async () => {
    api.authFetch.mockResolvedValue(jsonResponse([ingestionJob("committed")]));

    await expect(listIngestionJobs("org-1")).resolves.toMatchObject([
      { status: "committed" },
    ]);
  });
});
