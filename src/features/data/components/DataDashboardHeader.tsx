import { DatabaseIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";
import { WorkspaceSelector } from "./WorkspaceSelector";

type DataDashboardHeaderProps = {
  organizationId: string;
  refreshing: boolean;
  onRefresh: () => void;
  onCreateIngestion: () => void;
  workspaces: AssignedWorkspace[];
  selectedWorkspace: AssignedWorkspace | null;
  workspacesLoading: boolean;
  onWorkspaceSelect: (workspaceId: string) => void;
};

export function DataDashboardHeader({
  organizationId,
  refreshing,
  onRefresh,
  onCreateIngestion,
  workspaces,
  selectedWorkspace,
  workspacesLoading,
  onWorkspaceSelect,
}: DataDashboardHeaderProps) {
  const insightCards = [
    ["Files", "Inventory"],
    ["Jobs", "Pipeline"],
    [selectedWorkspace?.name ?? "—", "Workspace"],
  ];

  return (
    <header className="relative isolate overflow-hidden rounded-[28px] border border-[#d8d0c2]/80 bg-[#fffdf8]/86 p-5 shadow-[0_24px_70px_rgba(24,24,18,0.10)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88 sm:p-7">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_18%,rgba(36,86,232,0.16),transparent_34%),linear-gradient(135deg,rgba(255,253,248,0.92),rgba(244,239,229,0.62))] dark:bg-[radial-gradient(circle_at_78%_18%,rgba(120,149,255,0.15),transparent_34%),linear-gradient(135deg,rgba(26,26,23,0.94),rgba(17,17,15,0.70))]"
        aria-hidden="true"
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col justify-between gap-8">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2456e8] dark:text-[#9aafff]">
              <DatabaseIcon aria-hidden="true" />
              Data management
            </div>
            <h1 className="max-w-5xl text-[clamp(2.6rem,5vw,5.4rem)] font-semibold leading-[0.92] tracking-normal text-[#191915] dark:text-[#f4efe5]">
              Data
              <span
                className="mx-3 inline-block h-[clamp(34px,4vw,56px)] w-[clamp(76px,9vw,132px)] translate-y-1 rounded-full bg-cover bg-center align-middle shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45),0_18px_42px_rgba(0,0,0,0.14)] grayscale-[22%] contrast-125 saturate-75"
                style={{
                  backgroundImage:
                    "url(https://picsum.photos/seed/axiom-data-console/360/160)",
                }}
                aria-hidden="true"
              />
              pipelines
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#625d53] dark:text-[#c5bcaf]">
              File inventory, ingestion jobs, and processing health in{" "}
              <span className="font-semibold text-[#191915] dark:text-[#f4efe5]">
                {selectedWorkspace?.name ?? organizationId}
              </span>
              .
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <WorkspaceSelector
              workspaces={workspaces}
              selected={selectedWorkspace}
              loading={workspacesLoading}
              onSelect={onWorkspaceSelect}
            />
            <Button
              className="h-11 min-w-0 rounded-full px-5 shadow-[0_14px_30px_rgba(36,86,232,0.20)] sm:flex-none"
              onClick={onCreateIngestion}
              disabled={!selectedWorkspace}
            >
              <PlusIcon data-icon="inline-start" />
              Upload Data
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full bg-[#fffdf8]/76 px-4 dark:bg-[#1a1a17]/76"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCwIcon
                data-icon="inline-start"
                className={refreshing ? "animate-spin" : undefined}
              />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="group overflow-hidden rounded-[22px] border-[#d8d0c2]/80 bg-[#191915] p-0 text-white shadow-[0_20px_54px_rgba(24,24,18,0.16)] dark:border-[#38372f]">
          <CardContent className="relative flex min-h-[264px] flex-col justify-between p-0">
            <img
              src="https://picsum.photos/seed/axiom-data-operations/900/700"
              alt=""
              className="absolute inset-0 size-full object-cover opacity-82 grayscale-[18%] contrast-125 saturate-75 transition-transform duration-700 ease-out group-hover:scale-105"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.74))]"
              aria-hidden="true"
            />
            <div className="relative mt-auto grid grid-flow-dense grid-cols-3 gap-2 p-4">
              {insightCards.map(([value, label], index) => (
                <div
                  className={cn(
                    "min-w-0 rounded-[14px] border border-white/18 bg-white/14 p-3 backdrop-blur-xl transition-transform duration-500 ease-out group-hover:-translate-y-1",
                    index === 2 && "col-span-3",
                  )}
                  key={label}
                >
                  <strong className="block truncate text-sm">{value}</strong>
                  <span className="mt-1 block text-xs text-white/70">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </header>
  );
}
