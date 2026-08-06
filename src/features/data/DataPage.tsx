import { useMemo, useState } from "react";
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
import { DataSourcesWorkspace } from "./components/DataSourcesWorkspace";
import { IngestionJobsTable } from "./components/IngestionJobsTable";
import { JobFilesPanel } from "./components/JobFilesPanel";
import { useDataDashboard } from "./model/useDataDashboard";
import { useDataSourceProfiles } from "@/shared/hooks/use-data-source-profiles";

type DataPageProps = {
  onCreateIngestion: (context?: {
    connector?: "s3" | "snowflake";
    profileId?: string;
  }) => void;
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
  const datasources = snapshot?.datasources ?? [];
  const ingestionJobs = snapshot?.ingestionJobs ?? [];
  const organizationId = snapshot?.organizationId ?? defaultOrganizationId;
  const { profiles, error: profileError, remove: removeProfile } =
    useDataSourceProfiles(organizationId);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeDataView, setActiveDataView] = useState("sources");
  const selectedJob = ingestionJobs.find((job) => job.job_id === selectedJobId) ?? null;

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
      className="relative min-h-screen w-full overflow-x-hidden px-5 pb-12 pt-20 sm:px-8 md:pt-10"
      aria-label="Data management"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_76%_8%,rgba(36,86,232,0.12),transparent_34%),radial-gradient(circle_at_8%_42%,rgba(120,75,18,0.10),transparent_36%)] dark:bg-[radial-gradient(circle_at_76%_8%,rgba(120,149,255,0.12),transparent_34%)]"
        aria-hidden="true"
      />
      <div className="mx-auto grid w-full max-w-[1360px] gap-6">
        <DataDashboardHeader
          organizationId={snapshot?.organizationId ?? defaultOrganizationId}
          refreshing={loading}
          onRefresh={refresh}
          onCreateIngestion={onCreateIngestion}
        />

        {error && (
          <Alert
            variant="destructive"
            className="rounded-[18px] border-rose-300/70 bg-rose-50/90 pr-24 shadow-[0_14px_38px_rgba(136,19,55,0.08)] dark:border-rose-400/25 dark:bg-rose-400/10"
          >
            <ServerCrashIcon />
            <AlertTitle>Data services are unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-white/70 dark:bg-[#1a1a17]"
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
            className="rounded-[18px] border-amber-300/70 bg-amber-50/80 text-amber-950 shadow-[0_14px_38px_rgba(120,75,18,0.08)] dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"
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

        <Tabs value={activeDataView} onValueChange={(value) => setActiveDataView(value)} className="gap-0">
          <section
            className="overflow-hidden rounded-[28px] border border-[#d8d0c2]/80 bg-[#fffdf8]/88 shadow-[0_24px_70px_rgba(24,24,18,0.09)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88"
            aria-label="Data inventory and ingestion activity"
          >
            <div className="flex flex-col gap-4 border-b border-[#d8d0c2]/80 bg-[#fffdf8]/54 px-5 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-[#38372f]/80 dark:bg-white/4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#191915] dark:text-[#f4efe5]">
                  Organization data
                </h2>
                <p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">
                  Bucket: {snapshot?.bucket ?? defaultOrganizationId}
                </p>
              </div>
              <TabsList
                className="h-10 w-full justify-start rounded-full border border-[#d8d0c2]/70 bg-[#f4efe5]/70 p-1 sm:w-auto dark:border-[#38372f]/80 dark:bg-white/5"
                aria-label="Data views"
              >
                <TabsTrigger value="sources" className="rounded-full px-4">
                  Data sources
                  <span className="tabular-nums text-[11px] text-[#8a8377]">
                    {datasources.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="jobs" className="rounded-full px-4">
                  Ingestion jobs
                  <span className="tabular-nums text-[11px] text-[#8a8377]">
                    {ingestionJobs.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="sources">
              <DataSourcesWorkspace
                datasources={datasources}
                jobs={ingestionJobs}
                profiles={profiles}
                loading={initialLoading}
                profileError={profileError}
                onCreateIngestion={onCreateIngestion}
                onDeleteProfile={removeProfile}
                onViewJobs={(jobId) => {
                  setSelectedJobId(jobId ?? null);
                  setActiveDataView("jobs");
                }}
              />
            </TabsContent>
            <TabsContent value="jobs">
              <IngestionJobsTable
                jobs={ingestionJobs}
                loading={initialLoading}
                onCreateIngestion={onCreateIngestion}
                onViewFiles={(jobId) => setSelectedJobId(jobId)}
              />
              <div className="px-4 pb-4">
                <JobFilesPanel job={selectedJob} />
              </div>
            </TabsContent>
          </section>
        </Tabs>
      </div>
    </section>
  );
}
