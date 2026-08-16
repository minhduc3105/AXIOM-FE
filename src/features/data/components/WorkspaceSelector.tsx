import { CheckIcon, ChevronDownIcon, Layers3Icon } from "lucide-react";
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

type WorkspaceSelectorProps = {
  workspaces: AssignedWorkspace[];
  selected: AssignedWorkspace | null;
  loading: boolean;
  onSelect: (workspaceId: string) => void;
};

export function WorkspaceSelector({
  workspaces,
  selected,
  loading,
  onSelect,
}: WorkspaceSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-11 max-w-full justify-between rounded-full bg-[#fffdf8]/76 px-4 dark:bg-[#1a1a17]/76"
            disabled={loading || workspaces.length === 0}
            aria-label={`Current workspace: ${selected?.name ?? "Unavailable"}`}
          />
        }
      >
        <Layers3Icon data-icon="inline-start" />
        <span className="max-w-48 truncate">
          {loading ? "Loading workspaces…" : selected?.name ?? "No workspace"}
        </span>
        <ChevronDownIcon className="ml-1 size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 rounded-2xl p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em]">
            Assigned workspaces
          </DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="min-h-12 rounded-xl px-3 py-2"
              onClick={() => onSelect(workspace.id)}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{workspace.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {workspace.role?.split("_").join(" ") ?? "organization workspace"}
                </span>
              </span>
              {workspace.id === selected?.id && <CheckIcon aria-label="Selected" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
