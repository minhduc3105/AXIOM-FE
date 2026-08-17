import {
  Building2Icon,
  ChevronRightIcon,
  FolderKanbanIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
          <span className="flex min-w-0 items-center gap-1.5" tabIndex={0} />
        }
      >
        <Icon className="size-3.5 shrink-0 text-[#2456e8] dark:text-[#9aafff]" />
        <span className="hidden text-[10px] font-medium uppercase tracking-[0.08em] text-[#777064] sm:inline dark:text-[#aaa397]">
          {kind}
        </span>
        <strong className="max-w-36 truncate text-xs font-semibold sm:max-w-52">
          {name}
        </strong>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        {kind}: {name}{id ? ` (${id})` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppScopeBar({ scope, workspaces = [], selectedWorkspace = null, workspacesLoading = false, onWorkspaceSelect }: { scope: AppScopeContext | null; workspaces?: AssignedWorkspace[]; selectedWorkspace?: AssignedWorkspace | null; workspacesLoading?: boolean; onWorkspaceSelect?: (workspaceId: string) => void }) {
  if (!scope) return null;
  return (
    <div
      className="fixed right-3 top-2 z-30 flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5 text-card-foreground shadow-sm sm:right-4 md:max-w-[calc(100vw-92px)]"
      aria-label="Current application scope"
    >
      <ScopeItem
        kind="Organization"
        name={scope.organization.name}
        id={scope.organization.id}
      />
      {scope.workspace && (
        <>
          <ChevronRightIcon className="size-3 shrink-0 text-[#aaa397]" aria-hidden="true" />
          <ScopeItem
            kind="Workspace"
            name={scope.workspace.name}
            id={scope.workspace.id}
          />
        </>
      )}
      {!scope.workspace && onWorkspaceSelect && (workspaces.length > 0 || workspacesLoading) && (
        <><ChevronRightIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0"><GlobalWorkspaceSwitcher workspaces={workspaces} selected={selectedWorkspace} loading={workspacesLoading} onSelect={onWorkspaceSelect} /></div></>
      )}
    </div>
  );
}
