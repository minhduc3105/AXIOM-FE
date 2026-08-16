import { useEffect, useState } from "react";
import { listWorkspaces } from "@/features/auth/api/authzApi";
import type { AuthUser } from "@/features/auth/model/types";
import type { AppScopeContext } from "@/shared/types/appScope";

type UseAppScopeOptions = {
  user: AuthUser | null;
  accessToken: string | null;
  showWorkspace: boolean;
  workspaceId: string | null;
};

export function useAppScope({
  user,
  accessToken,
  showWorkspace,
  workspaceId,
}: UseAppScopeOptions): AppScopeContext | null {
  const organizationId = user?.organization_id ?? "";
  const [scope, setScope] = useState<AppScopeContext | null>(() =>
    user
      ? {
          organization: { id: organizationId, name: organizationId },
          workspace: showWorkspace
            ? workspaceId
              ? { id: workspaceId, name: workspaceId }
              : { id: null, name: "Organization-wide" }
            : null,
        }
      : null,
  );

  useEffect(() => {
    if (!user) {
      setScope(null);
      return;
    }

    const fallback: AppScopeContext = {
      organization: { id: organizationId, name: organizationId },
      workspace: showWorkspace
        ? workspaceId
          ? { id: workspaceId, name: workspaceId }
          : { id: null, name: "Organization-wide" }
        : null,
    };
    setScope(fallback);
    if (!accessToken) return;

    const controller = new AbortController();
    void (showWorkspace && workspaceId
      ? listWorkspaces(organizationId, accessToken, controller.signal)
      : Promise.resolve([])
    ).then((workspaces) => {
      if (controller.signal.aborted) return;
      const workspace = workspaces.find((item) => item.id === workspaceId);
      setScope({
        organization: {
          id: organizationId,
          name: organizationId,
        },
        workspace: showWorkspace
          ? workspaceId
            ? { id: workspaceId, name: workspace?.name || workspaceId }
            : { id: null, name: "Organization-wide" }
          : null,
      });
    }).catch(() => {
      // Keep the initial scope when the workspace API cannot be reached.
    });

    return () => controller.abort();
  }, [accessToken, organizationId, showWorkspace, user, workspaceId]);

  return scope;
}
