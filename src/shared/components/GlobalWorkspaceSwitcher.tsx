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

type GlobalWorkspaceSwitcherProps = {
  workspaces: AssignedWorkspace[];
  selected: AssignedWorkspace | null;
  loading: boolean;
  onSelect: (workspaceId: string) => void;
};

export function GlobalWorkspaceSwitcher({ workspaces, selected, loading, onSelect }: GlobalWorkspaceSwitcherProps) {
  return <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="outline" className="h-11 min-w-0 w-full justify-between rounded-lg bg-card px-3 sm:w-auto sm:max-w-80" disabled={loading || workspaces.length === 0} aria-label={`Switch workspace. Current workspace: ${selected?.name ?? "Unavailable"}`} />}><Layers3Icon data-icon="inline-start" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-left">{loading ? "Loading workspaces…" : selected?.name ?? "No workspace"}</span><ChevronDownIcon className="ml-2 size-4 shrink-0" aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-2rem))] rounded-lg p-2"><DropdownMenuGroup><DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">Assigned workspaces</DropdownMenuLabel>{workspaces.map((workspace) => { const isSelected = workspace.id === selected?.id; return <DropdownMenuItem key={workspace.id} className="min-h-12 min-w-0 rounded-md px-3 py-2" aria-label={`Switch to workspace ${workspace.name}`} onClick={() => onSelect(workspace.id)}><span className="min-w-0 flex-1"><span className="block truncate font-medium">{workspace.name}</span><span className="block truncate text-xs text-muted-foreground">{workspace.role?.split("_").join(" ") ?? "Organization workspace"}</span></span>{isSelected && <CheckIcon className="ml-2 size-4 shrink-0" aria-label="Current workspace" />}</DropdownMenuItem>; })}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu>;
}
