import { afterEach, describe, expect, it, vi } from "vitest";
import { listMyWorkspaces } from "./authzApi";

describe("listMyWorkspaces", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the membership-scoped AuthZ endpoint", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({
        workspaces: [
          {
            id: "workspace-1",
            organization_id: "org-1",
            name: "Workspace 1",
            slug: "workspace-1",
            description: null,
            status: "active",
            is_default: true,
            role: "viewer",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listMyWorkspaces("org-1", "token-1")).resolves.toHaveLength(1);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/authz-service/api/v1/authz/me/workspaces",
    );
  });
});
