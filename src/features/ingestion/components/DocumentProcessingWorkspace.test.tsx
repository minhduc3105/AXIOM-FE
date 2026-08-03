import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentProcessingStatus } from "../api/ingestionApi";
import type { DocumentProcessingBatch } from "../model/types";
import { DocumentProcessingWorkspace } from "./DocumentProcessingWorkspace";

const batch: DocumentProcessingBatch = {
  job_id: "job-1",
  organization_id: "test-org",
  bucket: "test-org",
  count: 2,
  source_kind: "upload",
  files: [
    { key: "first.txt", filename: "first.txt", contentType: "text/plain" },
    { key: "second.txt", filename: "second.txt", contentType: "text/plain" },
  ],
};

function status(objectKey: string, value: string | null): DocumentProcessingStatus {
  return {
    object_key: objectKey,
    found: value !== null,
    run_id: value ? `run-${objectKey}` : null,
    document_id: value ? `document-${objectKey}` : null,
    status: value,
    error_message: null,
    started_at: null,
    finished_at: null,
    created_at: null,
  };
}

function parsedPayload(objectKey: string) {
  return {
    error: null,
    message: null,
    document: {
      document_id: `document-${objectKey}`,
      organization_id: "test-org",
      file_name: objectKey,
      bucket: "test-org",
      object_key: objectKey,
      current_status: "indexed",
      latest_run_id: `run-${objectKey}`,
      size_bytes: 10,
    },
    processing_run: {
      run_id: `run-${objectKey}`,
      status: "completed",
      error_message: null,
    },
    content_summary: { content_types: ["main_text"] },
    contents: [{ content_id: "main", type: "main_text", text: `Parsed ${objectKey}` }],
    chunks: [],
  };
}

describe("DocumentProcessingWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body)) as { object_key: string };
      return Response.json(parsedPayload(body.object_key));
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens only indexed files and switches parsed results by exact object key", async () => {
    const user = userEvent.setup();
    const initialResults = [status("first.txt", "completed"), status("second.txt", null)];
    const { rerender } = render(
      <DocumentProcessingWorkspace
        batch={batch}
        status="polling"
        results={initialResults}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /second.txt.*waiting/i }).hasAttribute("disabled")).toBe(true);
    expect(await screen.findByText("Parsed first.txt")).toBeTruthy();

    const completedResults = [status("first.txt", "completed"), status("second.txt", "completed")];
    rerender(
      <DocumentProcessingWorkspace
        batch={batch}
        status="complete"
        results={completedResults}
        error={null}
        onRetry={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /second.txt.*indexed/i }));
    await waitFor(() => expect(screen.getByText("Parsed second.txt")).toBeTruthy());
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/corpus/documents/ingested-data",
      expect.objectContaining({
        body: expect.stringContaining('"object_key":"second.txt"'),
      }),
    );
  });
});
