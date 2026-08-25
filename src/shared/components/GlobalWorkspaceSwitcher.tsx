import { CheckIcon, ChevronDownIcon } from "lucide-react";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GlobalWorkspaceSwitcherProps = {
  workspaces: AssignedWorkspace[];
  selected: AssignedWorkspace | null;
  loading: boolean;
  onSelect: (workspaceId: string) => void;
};

export function GlobalWorkspaceSwitcher({
  workspaces,
  selected,
  loading,
  onSelect,
}: GlobalWorkspaceSwitcherProps) {
  const currentLabel = loading
    ? "Loading workspaces…"
    : (selected?.name ?? "No workspace");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-auto min-w-0 max-w-52 cursor-pointer justify-start gap-1 px-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
            disabled={loading || workspaces.length === 0}
            aria-label={`Switch workspace. Current workspace: ${selected?.name ?? "Unavailable"}`}
          />
        }
      >
        <span
          className="max-w-20 min-w-0 truncate text-left sm:max-w-32"
          title={currentLabel}
        >
          {currentLabel}
        </span>
        <ChevronDownIcon
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 max-w-[calc(100vw-2rem)] rounded-lg p-1.5"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            Assigned workspaces
          </DropdownMenuLabel>
          {workspaces.length === 0 ? (
            <DropdownMenuItem disabled className="min-h-10 px-2.5 py-2">
              No assigned workspaces
            </DropdownMenuItem>
          ) : (
            workspaces.map((workspace) => {
              const isSelected = workspace.id === selected?.id;
              return (
                <DropdownMenuItem
                  key={workspace.id}
                  className="min-h-11 min-w-0 rounded-md px-2.5 py-2"
                  aria-label={`Switch to workspace ${workspace.name}`}
                  onClick={() => onSelect(workspace.id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {workspace.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {workspace.role?.split("_").join(" ") ??
                        "Organization workspace"}
                    </span>
                  </span>
                  {isSelected && (
                    <CheckIcon
                      className="ml-2 size-4 shrink-0"
                      aria-label="Current workspace"
                    />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
