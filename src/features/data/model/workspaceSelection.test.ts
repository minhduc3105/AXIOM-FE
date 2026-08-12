import { describe, expect, it } from "vitest";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";
import {
  dataWorkspaceStorageKey,
  resolveSelectedWorkspace,
} from "./workspaceSelection";

const workspaces: AssignedWorkspace[] = [
  {
    id: "default",
    organization_id: "org-1",
    name: "Default Workspace",
    slug: "default",
    description: null,
    status: "active",
    is_default: true,
    role: "workspace_admin",
  },
  {
    id: "research",
    organization_id: "org-1",
    name: "Research",
    slug: "research",
    description: null,
    status: "active",
    is_default: false,
    role: "viewer",
  },
];

describe("data workspace selection", () => {
  it("restores an assigned persisted workspace before the default", () => {
    expect(resolveSelectedWorkspace(workspaces, "research")?.id).toBe(
      "research",
    );
  });

  it("falls back to the default when the persisted membership is gone", () => {
    expect(resolveSelectedWorkspace(workspaces, "revoked")?.id).toBe(
      "default",
    );
  });

  it("isolates persisted selection by organization and user", () => {
    expect(dataWorkspaceStorageKey("org-1", "user-1")).toBe(
      "axiom.data.workspace:org-1:user-1",
    );
  });
});
