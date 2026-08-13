import type { AppRoute } from "./routing/types";
import { defaultWorkspaceId as ingestionWorkspaceId } from "@/features/ingestion/api/ingestionApi";
import { memoryScope } from "@/features/memory/api/memoryApi";

export function getRouteWorkspaceScope(route: AppRoute) {
  if (route.surface === "data" && route.page === "ingestion") {
    return { showWorkspace: true, workspaceId: ingestionWorkspaceId };
  }
  if (route.surface === "memory") {
    return { showWorkspace: true, workspaceId: memoryScope.workspace_id };
  }
  return { showWorkspace: false, workspaceId: null };
}
