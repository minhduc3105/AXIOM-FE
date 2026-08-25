import { describe, expect, it } from "vitest";
import {
  createGlobalIngestionJob,
  globalIngestionReducer,
} from "./globalIngestionReducer";

describe("globalIngestionReducer", () => {
  it("removes a successfully processed job from the transient launcher", () => {
    const job = createGlobalIngestionJob({
      id: "local-complete",
      source: "upload",
      title: "1 uploaded file",
      objects: [{ key: "imports/a.pdf", name: "a.pdf" }],
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
        ],
      },
    );

    expect(next.jobs).toEqual([]);
  });

  it("stops waiting file indicators when an upload fails before processing starts", () => {
    const job = createGlobalIngestionJob({
      id: "local-failed",
      source: "upload",
      title: "1 uploaded file",
      objects: [{ key: "imports/a.pdf", name: "a.pdf" }],
    });

    const next = globalIngestionReducer(
      { jobs: [job] },
      {
        type: "JOB_FAILED",
        jobId: job.id,
        message: "Upload failed with HTTP 400.",
        retry: "start_new_upload",
      },
    );

    expect(next.jobs[0]).toMatchObject({
      status: "failed",
      objects: [
        {
          status: "failed",
          errorMessage: "Upload failed with HTTP 400.",
        },
      ],
    });
  });

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
