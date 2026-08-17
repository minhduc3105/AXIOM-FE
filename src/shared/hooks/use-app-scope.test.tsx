import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { AuthUser } from "@/features/auth/model/types";
import { useAppScope } from "./use-app-scope";

const mocks = vi.hoisted(() => ({
  listWorkspaces: vi.fn(),
}));

vi.mock("@/features/auth/api/authzApi", () => ({
  listWorkspaces: mocks.listWorkspaces,
}));

const user: AuthUser = {
  id: "user-1",
  organization_id: "org-1",
  email: "admin@example.com",
  display_name: "Admin",
  status: "active",
  org_role: "org_admin",
};

describe("useAppScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWorkspaces.mockResolvedValue([
      {
        id: "workspace-1",
        organization_id: "org-1",
        name: "Evidence Review",
        slug: "evidence-review",
        description: null,
        status: "active",
        is_default: true,
      },
    ]);
  });

  afterEach(cleanup);

  it("uses the authenticated organization and resolves the workspace name", async () => {
    const { result } = renderHook(() =>
      useAppScope({
        user,
        accessToken: "token-1",
        showWorkspace: true,
        workspaceId: "workspace-1",
      }),
    );

    await waitFor(() => expect(result.current?.workspace?.name).toBe("Evidence Review"));
    expect(result.current?.organization.name).toBe("org-1");
    expect(result.current?.workspace?.name).toBe("Evidence Review");
  });

  it("falls back to identifiers and omits workspace outside its scope", async () => {
    const { result } = renderHook(() =>
      useAppScope({
        user,
        accessToken: "token-1",
        showWorkspace: false,
        workspaceId: null,
      }),
    );

    expect(result.current?.organization.name).toBe("org-1");
    expect(result.current?.workspace).toBeNull();
    expect(mocks.listWorkspaces).not.toHaveBeenCalled();
  });
});
