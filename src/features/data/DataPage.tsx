import { useMemo } from "react";
import { AlertTriangleIcon, ServerCrashIcon } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { defaultOrganizationId } from "./api/dataApi";
import { DataDashboardHeader } from "./components/DataDashboardHeader";
import { DataMetrics } from "./components/DataMetrics";
import { DataTable } from "./components/DataTable";
import { IngestionJobsTable } from "./components/IngestionJobsTable";
import { useDataDashboard } from "./model/useDataDashboard";

type DataPageProps = {
  onCreateIngestion: () => void;
};

function formatAggregateSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B stored";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
  }).format(value)} ${units[unitIndex]} stored`;
}

export function DataPage({ onCreateIngestion }: DataPageProps) {
  const { snapshot, loading, error, refresh } =
    useDataDashboard(defaultOrganizationId);
  const files = snapshot?.files ?? [];
  const ingestionJobs = snapshot?.ingestionJobs ?? [];

  const summary = useMemo(() => {
    return {
      total: files.length,
      ready: files.filter((file) => file.status === "success").length,
      processing: files.filter((file) => file.status === "processing").length,
      failed: files.filter((file) => file.status === "failed").length,
      totalSize: formatAggregateSize(
        files.reduce((total, file) => total + file.size, 0),
      ),
    };
  }, [files]);

  const initialLoading = loading && !snapshot;

  return (
    <section
      className="min-h-screen w-full overflow-x-hidden px-5 pb-10 pt-20 sm:px-8 md:pt-10"
      aria-label="Data management"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-5">
        <DataDashboardHeader
          organizationId={snapshot?.organizationId ?? defaultOrganizationId}
          refreshing={loading}
          onRefresh={refresh}
          onCreateIngestion={onCreateIngestion}
        />

        {error && (
          <Alert
            variant="destructive"
            className="border-rose-300/70 bg-rose-50/90 pr-24 dark:border-rose-400/25 dark:bg-rose-400/10"
          >
            <ServerCrashIcon />
            <AlertTitle>Data services are unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/70 dark:bg-[#1a1a17]"
                onClick={refresh}
              >
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}

        {snapshot?.warnings.map((warning) => (
          <Alert
            key={warning}
            className="border-amber-300/70 bg-amber-50/80 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"
          >
            <AlertTriangleIcon />
            <AlertTitle>Partial service availability</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {warning}
            </AlertDescription>
          </Alert>
        ))}

        <DataMetrics
          loading={initialLoading}
          total={summary.total}
          ready={summary.ready}
          processing={summary.processing}
          failed={summary.failed}
          totalSize={summary.totalSize}
        />

        <Tabs defaultValue="files" className="gap-0">
          <section
            className="overflow-hidden rounded-[8px] border border-[#d8d0c2] bg-[#fffdf8]/88 shadow-[0_14px_38px_rgba(19,18,14,0.06)] dark:border-[#38372f] dark:bg-[#1a1a17]/88"
            aria-label="Data inventory and ingestion activity"
          >
            <div className="flex flex-col gap-3 border-b border-[#d8d0c2] px-4 pt-4 sm:flex-row sm:items-end sm:justify-between dark:border-[#38372f]">
              <div className="pb-3">
                <h2 className="text-sm font-semibold text-[#191915] dark:text-[#f4efe5]">
                  Organization data
                </h2>
                <p className="mt-0.5 text-xs text-[#6d685e] dark:text-[#aaa397]">
                  Bucket: {snapshot?.bucket ?? defaultOrganizationId}
                </p>
              </div>
              <TabsList
                variant="line"
                className="h-9 w-full justify-start sm:w-auto"
                aria-label="Data views"
              >
                <TabsTrigger value="files" className="px-3">
                  Files
                  <span className="tabular-nums text-[11px] text-[#8a8377]">
                    {files.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="jobs" className="px-3">
                  Ingestion jobs
                  <span className="tabular-nums text-[11px] text-[#8a8377]">
                    {ingestionJobs.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="files">
              <DataTable
                files={files}
                loading={initialLoading}
                onCreateIngestion={onCreateIngestion}
              />
            </TabsContent>
            <TabsContent value="jobs">
              <IngestionJobsTable
                jobs={ingestionJobs}
                loading={initialLoading}
                onCreateIngestion={onCreateIngestion}
              />
            </TabsContent>
          </section>
        </Tabs>
      </div>
    </section>
  );
}
