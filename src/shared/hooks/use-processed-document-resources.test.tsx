import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  getIngestedDocumentData: vi.fn(),
  presignFileForPreview: vi.fn(),
}));

vi.mock("@/shared/lib/document-results-api", () => api);

import { useProcessedDocumentResources } from "./use-processed-document-resources";

const file = {
  key: "reports/summary.pdf",
  filename: "summary.pdf",
  contentType: "application/pdf",
};

const processingResult = {
  status: "completed",
  run_id: "run-1",
  document_id: "document-1",
};

describe("useProcessedDocumentResources", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("reloads workspace-scoped resources after the workspace changes", async () => {
    api.presignFileForPreview.mockResolvedValue({
      url: "/storage/summary.pdf",
      key: file.key,
      bucket: "axiom-data",
      expiresIn: 900,
      expiresAt: Date.now() + 900_000,
    });
    api.getIngestedDocumentData.mockResolvedValue({
      document: {
        document_id: "document-1",
        organization_id: "org-1",
        file_name: "summary.pdf",
        bucket: "axiom-data",
        object_key: file.key,
        current_status: "completed",
        latest_run_id: "run-1",
        size_bytes: 128,
      },
      processingRun: null,
      blocks: [],
      readingOrder: [],
      mainText: "",
      contentTypes: [],
    });

    const { rerender } = renderHook(
      ({ workspaceId }) =>
        useProcessedDocumentResources({
          workspaceId,
          bucket: "axiom-data",
          file,
          result: processingResult,
        }),
      { initialProps: { workspaceId: "workspace-1" } },
    );

    await waitFor(() => {
      expect(api.presignFileForPreview).toHaveBeenCalledTimes(1);
      expect(api.getIngestedDocumentData).toHaveBeenCalledTimes(1);
    });

    rerender({ workspaceId: "workspace-2" });

    await waitFor(() => {
      expect(api.presignFileForPreview).toHaveBeenCalledTimes(2);
      expect(api.getIngestedDocumentData).toHaveBeenCalledTimes(2);
    });
    expect(api.getIngestedDocumentData).toHaveBeenLastCalledWith(
      {
        workspaceId: "workspace-2",
        bucket: "axiom-data",
        objectKey: file.key,
        documentId: "document-1",
      },
      expect.any(AbortSignal),
    );
  });
});
