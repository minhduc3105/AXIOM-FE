import type { AppRoute } from "./routing/types";
import { memoryScope } from "@/features/memory/api/memoryApi";

export function getRouteWorkspaceScope(route: AppRoute) {
  if (route.surface === "memory") {
    return { showWorkspace: true, workspaceId: memoryScope.workspace_id };
  }
  return { showWorkspace: false, workspaceId: null };
}
