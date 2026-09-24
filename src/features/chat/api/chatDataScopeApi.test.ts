import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getChatDataScopePreference,
  replaceChatDataScopePreference,
} from "./chatDataScopeApi";

describe("chat data scope preference API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the current workspace preference", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            organization_id: "org-1",
            workspace_id: "workspace/1",
            excluded_resource_ids: ["file-1"],
            updated_at: "2026-09-24T10:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getChatDataScopePreference("workspace/1")).resolves.toEqual({
      excludedResourceIds: ["file-1"],
      updatedAt: "2026-09-24T10:00:00Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/intelligence-service/api/v1/workspaces/workspace%2F1/chat-data-scope-preference",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("replaces the current workspace preference", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            organization_id: "org-1",
            workspace_id: "workspace-1",
            excluded_resource_ids: ["file-1", "file-2"],
            updated_at: "2026-09-24T10:00:00Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await replaceChatDataScopePreference("workspace-1", ["file-2", "file-1"]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/intelligence-service/api/v1/workspaces/workspace-1/chat-data-scope-preference",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ excluded_resource_ids: ["file-2", "file-1"] }),
      }),
    );
  });
});
