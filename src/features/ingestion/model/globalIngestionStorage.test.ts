import { beforeEach, describe, expect, it } from "vitest";
import type { GlobalIngestionJob } from "./globalIngestionTypes";
import {
  readStoredIngestionJobs,
  writeStoredIngestionJobs,
} from "./globalIngestionStorage";

const job: GlobalIngestionJob = {
  id: "local-1",
  source: "s3",
  title: "Contracts",
  status: "processing",
  serverJobId: "job-1",
  batch: null,
  objects: [
    {
      key: "contracts/a.pdf",
      name: "a.pdf",
      status: "processing",
      runId: null,
      documentId: null,
      errorMessage: null,
    },
  ],
  errorMessage: null,
  retry: null,
  createdAt: "2026-08-19T00:00:00.000Z",
};

describe("global ingestion storage", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("stores tracking metadata without unknown credential fields", () => {
    writeStoredIngestionJobs("org-1", "workspace-1", [
      {
        ...job,
        credentials: { secretAccessKey: "must-not-persist" },
      } as GlobalIngestionJob,
    ]);

    const stored = window.sessionStorage.getItem(
      "axiom:ingestion:org-1:workspace-1",
    );
    expect(stored).not.toContain("must-not-persist");
    expect(readStoredIngestionJobs("org-1", "workspace-1")).toEqual([job]);
  });

  it("ignores malformed stored data", () => {
    window.sessionStorage.setItem(
      "axiom:ingestion:org-1:workspace-1",
      "not-json",
    );

    expect(readStoredIngestionJobs("org-1", "workspace-1")).toEqual([]);
  });
});
