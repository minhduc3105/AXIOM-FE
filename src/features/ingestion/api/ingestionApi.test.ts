import { afterEach, describe, expect, it, vi } from "vitest";
import { configureAuthFetch } from "@/features/auth/model/authFetch";
import { uploadFiles } from "./ingestionApi";

afterEach(() => {
  vi.restoreAllMocks();
  configureAuthFetch({
    getAccessToken: () => null,
    refreshAccessToken: async () => false,
    onUnauthorized: () => undefined,
  });
});

describe("uploadFiles", () => {
  it("uploads into the workspace selected by the user", async () => {
    let requestBody: BodyInit | null | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        requestBody = init?.body;
        return new Response(
          JSON.stringify({
            job_id: "job-1",
            status: "completed",
            organization_id: "org-1",
            workspace_id: "research",
            bucket: "documents",
            count: 1,
            files: [
              {
                key: "organizations/org-1/workspaces/research/sources/report.pdf",
                filename: "report.pdf",
                content_type: "application/pdf",
              },
            ],
            bucket_metadata: {},
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    await uploadFiles(
      "org-1",
      "research",
      [new File(["report"], "report.pdf", { type: "application/pdf" })],
    );

    expect(requestBody).toBeInstanceOf(FormData);
    expect((requestBody as FormData).get("workspace_id")).toBe("research");
  });
});
