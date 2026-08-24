import { afterEach, describe, expect, it, vi } from "vitest";

const authFetch = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/model/authFetch", () => ({ authFetch }));

import { getIngestedDocumentData } from "./document-results-api";

describe("getIngestedDocumentData", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("scopes parsed content to the selected workspace", async () => {
    authFetch.mockResolvedValueOnce(
      Response.json({
        document: {
          document_id: "document-1",
          organization_id: "org-1",
          file_name: "summary.pdf",
          bucket: "axiom-data",
          object_key: "reports/summary.pdf",
          current_status: "completed",
          latest_run_id: "run-1",
          size_bytes: 128,
        },
        processing_run: null,
        contents: [],
        content_summary: { content_types: [] },
      }),
    );

    await getIngestedDocumentData({
      workspaceId: "workspace-1",
      bucket: "axiom-data",
      objectKey: "reports/summary.pdf",
      documentId: "document-1",
    });

    const [, request] = authFetch.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toEqual({
      workspace_id: "workspace-1",
      bucket: "axiom-data",
      object_key: "reports/summary.pdf",
      document_id: "document-1",
      match_mode: "exact",
      mode: "all",
    });
  });
});
