import {
  DatabaseIcon,
  PlusIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type DataDashboardHeaderProps = {
  organizationId: string;
  refreshing: boolean;
  onRefresh: () => void;
  onCreateIngestion: () => void;
};

export function DataDashboardHeader({
  organizationId,
  refreshing,
  onRefresh,
  onCreateIngestion,
}: DataDashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-[#d8d0c2] pb-6 dark:border-[#38372f] lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-[#2456e8] dark:text-[#9aafff]">
          <DatabaseIcon className="size-4" />
          Data management
        </div>
        <h1 className="text-3xl font-semibold leading-tight text-[#191915] dark:text-[#f4efe5]">
          Data Pipelines
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
          File inventory and processing health for{" "}
          <span className="font-medium text-[#191915] dark:text-[#f4efe5]">
            {organizationId}
          </span>
          .
        </p>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button
          variant="outline"
          size="icon-lg"
          className="shrink-0 rounded-[7px] bg-[#fffdf8]/80 dark:bg-[#1a1a17]/80"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh data"
          title="Refresh data"
        >
          <RefreshCwIcon className={refreshing ? "animate-spin" : undefined} />
        </Button>
        <Button
          className="h-9 min-w-0 flex-1 rounded-[7px] bg-[#2456e8] px-4 text-white shadow-[0_10px_24px_rgba(36,86,232,0.18)] hover:bg-[#1d48c7] sm:flex-none dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]"
          onClick={onCreateIngestion}
        >
          <PlusIcon data-icon="inline-start" />
          Data Ingestion
        </Button>
      </div>
    </header>
  );
}
