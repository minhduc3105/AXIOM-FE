import { describe, expect, it } from "vitest";
import { filterWorkspaceRecords } from "./workspaceScope";

describe("workspace data filtering", () => {
  it("keeps only files, data sources, and jobs from the selected workspace", () => {
    const result = filterWorkspaceRecords(
      [
        { key: "default.pdf", workspace_id: "default" },
        { key: "research.pdf", workspace_id: "research" },
      ],
      [
        { id: "source-default", workspace_id: "default" },
        { id: "source-research", workspace_id: "research" },
      ],
      [
        { job_id: "job-default", workspace_id: "default" },
        { job_id: "job-research", workspace_id: "research" },
      ],
      "research",
    );

    expect(result.files.map((file) => file.key)).toEqual(["research.pdf"]);
    expect(result.datasources.map((source) => source.id)).toEqual([
      "source-research",
    ]);
    expect(result.jobs.map((job) => job.job_id)).toEqual(["job-research"]);
  });
});
