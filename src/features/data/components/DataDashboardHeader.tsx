import {
  DatabaseIcon,
  Layers3Icon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";

type DataDashboardHeaderProps = {
  selectedWorkspace: AssignedWorkspace | null;
  workspaceLoading: boolean;
  dataLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onCreateIngestion: () => void;
};

export function DataDashboardHeader({
  selectedWorkspace,
  workspaceLoading,
  dataLoading,
  refreshing,
  onRefresh,
  onCreateIngestion,
}: DataDashboardHeaderProps) {
  const actionsDisabled = workspaceLoading || !selectedWorkspace;

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <header className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <DatabaseIcon className="size-4" aria-hidden="true" />
            Data operations
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Data management
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Monitor file inventory, processing health, and ingestion activity.
          </p>

          <div className="mt-3 flex min-h-6 min-w-0 items-center gap-2 text-sm">
            <Layers3Icon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="shrink-0 text-muted-foreground">Workspace</span>
            {workspaceLoading ? (
              <Skeleton className="h-5 w-40" aria-label="Loading workspace" />
            ) : selectedWorkspace ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="min-w-0 max-w-72 truncate font-medium"
                      tabIndex={0}
                    />
                  }
                >
                  {selectedWorkspace.name}
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start">
                  {selectedWorkspace.name}
                </TooltipContent>
              </Tooltip>
            ) : (
              <span className="font-medium text-destructive">
                No workspace selected
              </span>
            )}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            className="w-full sm:w-32"
            onClick={onCreateIngestion}
            disabled={actionsDisabled}
          >
            <PlusIcon data-icon="inline-start" />
            Upload data
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-32"
            onClick={onRefresh}
            disabled={actionsDisabled || dataLoading}
            aria-busy={refreshing}
          >
            <RefreshCwIcon
              data-icon="inline-start"
              className={
                refreshing ? "animate-spin motion-reduce:animate-none" : undefined
              }
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>
    </Card>
  );
}
