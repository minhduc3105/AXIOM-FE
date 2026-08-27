import { Building2Icon, FolderKanbanIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GlobalWorkspaceSwitcher } from "@/shared/components/GlobalWorkspaceSwitcher";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";
import type { AppScopeContext } from "@/shared/types/appScope";

function ScopeItem({
  kind,
  name,
  id,
}: {
  kind: "Organization" | "Workspace";
  name: string;
  id: string | null;
}) {
  const Icon = kind === "Organization" ? Building2Icon : FolderKanbanIcon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="flex h-10 min-w-0 items-center gap-2 px-2"
            tabIndex={0}
            aria-label={`${kind}: ${name}`}
          />
        }
      >
        <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <strong
          className={
              kind === "Organization"
              ? "hidden whitespace-nowrap text-sm font-medium lg:block"
              : "whitespace-nowrap text-sm font-medium"
          }
        >
          {name}
        </strong>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        {kind}: {name}
        {id ? ` (${id})` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppScopeBar({
  scope,
  workspaces = [],
  selectedWorkspace = null,
  workspacesLoading = false,
  onWorkspaceSelect,
}: {
  scope: AppScopeContext | null;
  workspaces?: AssignedWorkspace[];
  selectedWorkspace?: AssignedWorkspace | null;
  workspacesLoading?: boolean;
  onWorkspaceSelect?: (workspaceId: string) => void;
}) {
  if (!scope) return null;
  const showWorkspace = Boolean(scope.workspace || onWorkspaceSelect);

  return (
    <div
      className="flex min-w-0 max-w-full items-center text-foreground"
      aria-label="Current application scope"
    >
      <ScopeItem
        kind="Organization"
        name={scope.organization.name}
        id={scope.organization.id}
      />
      {showWorkspace && (
        <span className="mx-1 h-5 border-l border-border" aria-hidden="true" />
      )}
      {scope.workspace && (
        <ScopeItem
          kind="Workspace"
          name={scope.workspace.name}
          id={scope.workspace.id}
        />
      )}
      {!scope.workspace && onWorkspaceSelect && (
        <div className="min-w-0">
          <GlobalWorkspaceSwitcher
            workspaces={workspaces}
            selected={selectedWorkspace}
            loading={workspacesLoading}
            onSelect={onWorkspaceSelect}
          />
        </div>
      )}
    </div>
  );
}
