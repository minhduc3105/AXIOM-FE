import { describe, expect, it } from "vitest";
import {
  createConnectorProcessingBatch,
  createUploadProcessingBatch,
  getDocumentProcessingUiStatus,
} from "./globalIngestionProcessing";

describe("global ingestion processing helpers", () => {
  it("preserves an upload response as a document-processing batch", () => {
    const batch = createUploadProcessingBatch({
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

    expect(batch).toEqual({
      job_id: "upload-1",
      organization_id: "org-1",
      workspace_id: "workspace-1",
      bucket: "uploads",
      count: 1,
      source_kind: "upload",
      files: [
        {
          key: "org-1/people.csv",
          filename: "people.csv",
          contentType: "text/csv",
        },
      ],
    });
  });

  it("reports complete with errors only after every object is terminal", () => {
    expect(
      getDocumentProcessingUiStatus([
        {
          object_key: "org-1/a.pdf",
          found: true,
          status: "completed",
          run_id: "run-a",
          document_id: "doc-a",
          error_message: null,
          started_at: null,
          finished_at: null,
          created_at: null,
        },
        {
          object_key: "org-1/b.pdf",
          found: true,
          status: "failed",
          run_id: null,
          document_id: null,
          error_message: "Parser stopped",
          started_at: null,
          finished_at: null,
          created_at: null,
        },
      ]),
    ).toBe("completed_with_errors");
  });

  it("turns completed S3 job files into a processing batch", () => {
    expect(
      createConnectorProcessingBatch(
        {
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
        },
        {
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
        },
      ),
    ).toMatchObject({
      job_id: "s3-job-1",
      source_kind: "s3",
      bucket: "axiom-ingestion",
      files: [{ key: "jobs/s3-job-1/a.pdf", filename: null }],
    });
  });
});
