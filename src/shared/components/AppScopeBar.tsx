import {
  Building2Icon,
  ChevronRightIcon,
  FolderKanbanIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

export function AppScopeBar({ scope }: { scope: AppScopeContext | null }) {
  if (!scope) return null;
  return (
    <div
      className="fixed right-3 top-2 z-30 flex h-8 max-w-[calc(100vw-76px)] items-center gap-1.5 rounded-lg border border-[#d8d0c2]/90 bg-[#fffdf8]/92 px-2.5 text-[#191915] shadow-[0_8px_24px_rgba(24,24,18,0.09)] backdrop-blur-xl sm:right-4 dark:border-[#38372f]/90 dark:bg-[#171714]/92 dark:text-[#eee8dc]"
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
    </div>
  );
}
