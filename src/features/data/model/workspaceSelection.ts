import type { AssignedWorkspace } from "@/features/auth/api/authzApi";

export function dataWorkspaceStorageKey(organizationId: string, userId: string) {
  return `axiom.data.workspace:${organizationId}:${userId}`;
}

export function resolveSelectedWorkspace(
  workspaces: AssignedWorkspace[],
  persistedWorkspaceId: string | null,
) {
  return workspaces.find((workspace) => workspace.id === persistedWorkspaceId)
    ?? workspaces.find((workspace) => workspace.is_default)
    ?? workspaces[0]
    ?? null;
}
