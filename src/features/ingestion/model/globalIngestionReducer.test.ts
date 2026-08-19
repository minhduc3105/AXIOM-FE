import { describe, expect, it } from "vitest";
import {
  createGlobalIngestionJob,
  globalIngestionReducer,
} from "./globalIngestionReducer";

describe("globalIngestionReducer", () => {
  it("marks a terminal batch with a failed object as partial failure", () => {
    const job = createGlobalIngestionJob({
      id: "local-1",
      source: "upload",
      title: "2 uploaded files",
      objects: [
        { key: "imports/a.pdf", name: "a.pdf" },
        { key: "imports/b.pdf", name: "b.pdf" },
      ],
    });

    const next = globalIngestionReducer(
      { jobs: [job] },
      {
        type: "PROCESSING_UPDATED",
        jobId: job.id,
        results: [
          {
            object_key: "imports/a.pdf",
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
            object_key: "imports/b.pdf",
            found: true,
            status: "failed",
            run_id: null,
            document_id: null,
            error_message: "Parser stopped",
            started_at: null,
            finished_at: null,
            created_at: null,
          },
        ],
      },
    );

    expect(next.jobs[0]).toMatchObject({
      status: "partial_failure",
      objects: [
        { key: "imports/a.pdf", status: "indexed", runId: "run-a" },
        {
          key: "imports/b.pdf",
          status: "failed",
          errorMessage: "Parser stopped",
        },
      ],
    });
  });
});
