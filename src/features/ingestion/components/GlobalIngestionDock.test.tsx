import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalIngestionProvider } from "../model/GlobalIngestionProvider";
import { writeStoredIngestionJobs } from "../model/globalIngestionStorage";
import type { GlobalIngestionJob } from "../model/globalIngestionTypes";
import { GlobalIngestionDock } from "./GlobalIngestionDock";

function createJob(
  status: GlobalIngestionJob["objects"][number]["status"],
): GlobalIngestionJob {
  return {
    id: "job-1",
    source: "upload",
    title: "1 uploaded file",
    status: status === "indexed" ? "complete" : "processing",
    serverJobId: "server-job-1",
    batch: {
      job_id: "server-job-1",
      organization_id: "org-1",
      workspace_id: "workspace-1",
      bucket: "uploads",
      count: 1,
      source_kind: "upload",
      files: [
        {
          key: "uploads/invoice.pdf",
          filename: "invoice.pdf",
          contentType: "application/pdf",
        },
      ],
    },
    objects: [
      {
        key: "uploads/invoice.pdf",
        name: "invoice.pdf",
        status,
        runId: status === "indexed" ? "run-1" : null,
        documentId: status === "indexed" ? "document-1" : null,
        errorMessage: null,
      },
    ],
    errorMessage: null,
    retry: null,
    createdAt: "2026-08-19T00:00:00.000Z",
  };
}

function renderDock(
  job: GlobalIngestionJob,
  onOpenDetails: (jobId: string, objectKey: string) => void = () => {},
) {
  writeStoredIngestionJobs("org-1", "workspace-1", [job]);
  return render(
    <GlobalIngestionProvider organizationId="org-1" workspaceId="workspace-1">
      <GlobalIngestionDock onOpenDetails={onOpenDetails} />
    </GlobalIngestionProvider>,
  );
}

describe("GlobalIngestionDock", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("keeps detail unavailable until an object is indexed", async () => {
    const actor = userEvent.setup();
    renderDock(createJob("processing"));

    await actor.click(
      screen.getByRole("button", { name: "Open ingestion jobs" }),
    );

    expect(
      screen.queryByRole("button", { name: "View details for invoice.pdf" }),
    ).toBeNull();
  });

  it("opens the document page for an indexed object", async () => {
    const actor = userEvent.setup();
    let opened: [string, string] | null = null;
    renderDock(createJob("indexed"), (jobId, objectKey) => {
      opened = [jobId, objectKey];
    });

    await actor.click(
      screen.getByRole("button", { name: "Open ingestion jobs" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "View details for invoice.pdf" }),
    );

    expect(opened).toEqual(["job-1", "uploads/invoice.pdf"]);
  });
});
