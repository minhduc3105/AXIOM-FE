import { afterEach, describe, expect, it, vi } from "vitest";

const authFetch = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/model/authFetch", () => ({ authFetch }));

import { getDocumentProcessingStatuses } from "./ingestionApi";

describe("getDocumentProcessingStatuses", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("scopes status polling to the selected workspace", async () => {
    authFetch.mockResolvedValueOnce(
      Response.json({
        results: [
          {
            object_key: "reports/summary.pdf",
            found: true,
            run_id: "run-1",
            document_id: "document-1",
            status: "completed",
            error_message: null,
            started_at: "2026-08-20T10:00:00Z",
            finished_at: "2026-08-20T10:01:00Z",
            created_at: "2026-08-20T10:00:00Z",
          },
        ],
      }),
    );

    await getDocumentProcessingStatuses(
      "workspace-1",
      "axiom-data",
      ["reports/summary.pdf"],
    );

    const [, request] = authFetch.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toEqual({
      workspace_id: "workspace-1",
      bucket: "axiom-data",
      object_keys: ["reports/summary.pdf"],
    });
  });
});
