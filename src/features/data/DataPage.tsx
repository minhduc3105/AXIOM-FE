import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CircleAlertIcon,
  ServerCrashIcon,
} from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataDashboardHeader } from "./components/DataDashboardHeader";
import { DataEmptyState } from "./components/DataEmptyState";
import { DataMetrics } from "./components/DataMetrics";
import { DataSourcesWorkspace } from "./components/DataSourcesWorkspace";
import { IngestionJobsTable } from "./components/IngestionJobsTable";
import { JobFilesPanel } from "./components/JobFilesPanel";
import { useDataDashboard } from "./model/useDataDashboard";
import { useDataSourceProfiles } from "@/shared/hooks/use-data-source-profiles";
import { useDataWorkspace } from "./model/DataWorkspaceProvider";
import type { DataHealthFilter } from "./model/types";

type DataPageProps = {
  organizationId: string;
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

export function DataPage({ organizationId, onCreateIngestion }: DataPageProps) {
  const workspace = useDataWorkspace();
  const workspaceId = workspace.selectedWorkspace?.id ?? "";
  const { snapshot, loading, error, refresh } = useDataDashboard(
    organizationId,
    workspaceId,
  );
  const activeSnapshot =
    snapshot?.workspaceId === workspaceId ? snapshot : null;
  const files = activeSnapshot?.files ?? [];
  const datasources = activeSnapshot?.datasources ?? [];
  const ingestionJobs = activeSnapshot?.ingestionJobs ?? [];
  const {
    profiles,
    error: profileError,
    remove: removeProfile,
  } = useDataSourceProfiles(organizationId);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeDataView, setActiveDataView] = useState("sources");
  const [activeHealthFilter, setActiveHealthFilter] =
    useState<DataHealthFilter | null>("all");
  const selectedJob =
    ingestionJobs.find((job) => job.job_id === selectedJobId) ?? null;

  useEffect(() => {
    setSelectedJobId(null);
    setActiveDataView("sources");
    setActiveHealthFilter("all");
  }, [workspaceId]);

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

  const initialLoading = loading && !activeSnapshot;
  const refreshing = loading && Boolean(activeSnapshot);

  const applyHealthFilter = (filter: DataHealthFilter) => {
    setActiveDataView("sources");
    setActiveHealthFilter(filter);
  };

  return (
    <section
      className="min-h-[calc(100dvh-var(--app-top-bar-height))] w-full overflow-x-hidden px-4 pb-12 pt-4 sm:px-6 md:pt-6"
      aria-label="Data management"
    >
      <div className="mx-auto grid w-full max-w-[1360px] gap-6">
        <DataDashboardHeader
          selectedWorkspace={workspace.selectedWorkspace}
          workspaceLoading={workspace.loading}
          dataLoading={loading}
          refreshing={refreshing}
          onRefresh={refresh}
          onCreateIngestion={onCreateIngestion}
        />

        {workspace.error && (
          <Alert variant="destructive">
            <ServerCrashIcon />
            <AlertTitle>Workspaces are unavailable</AlertTitle>
            <AlertDescription>{workspace.error}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={workspace.refreshWorkspaces}>
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}

        {!workspace.loading &&
          !workspace.error &&
          !workspace.selectedWorkspace && (
            <Alert>
              <CircleAlertIcon />
              <AlertTitle>Select a workspace</AlertTitle>
              <AlertDescription>
                Use the global workspace switcher to choose the data inventory
                you want to manage.
              </AlertDescription>
            </Alert>
          )}

        {error && (
          <Alert variant="destructive">
            <ServerCrashIcon />
            <AlertTitle>Data services are unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}

        {activeSnapshot?.warnings.map((warning) => (
          <Alert key={warning} className="border-warning/30 bg-warning/10">
            <AlertTriangleIcon className="text-warning" />
            <AlertTitle>Partial service availability</AlertTitle>
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        ))}

        <DataMetrics
          loading={initialLoading}
          disabled={!workspaceId || initialLoading}
          activeFilter={activeHealthFilter}
          total={summary.total}
          ready={summary.ready}
          processing={summary.processing}
          failed={summary.failed}
          totalSize={summary.totalSize}
          onFilterChange={applyHealthFilter}
        />

        <Tabs
          value={activeDataView}
          onValueChange={(value) => {
            setActiveDataView(value);
            if (value === "jobs") setActiveHealthFilter(null);
          }}
          className="gap-0"
        >
          <section
            id="data-file-inventory"
            className="overflow-hidden rounded-lg border bg-card shadow-sm"
            aria-label="Data inventory and ingestion activity"
          >
            <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">
                  Organization data
                </h2>
              </div>
              <TabsList
                variant="line"
                className="h-9 w-full justify-start rounded-none bg-transparent p-0 sm:w-auto"
                aria-label="Data views"
              >
                <TabsTrigger value="sources" className="px-4">
                  Data sources
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {datasources.length || (files.length > 0 ? 1 : 0)}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="jobs"
                  className="px-4"
                  disabled={!workspaceId}
                >
                  Ingestion jobs
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {ingestionJobs.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="sources">
              {!workspaceId ? (
                <DataEmptyState
                  title={
                    workspace.loading ? "Loading workspace" : "Select a workspace"
                  }
                  description={
                    workspace.loading
                      ? "Reading your assigned workspaces."
                      : "Choose a workspace from the global switcher to view its data inventory."
                  }
                />
              ) : (
                <DataSourcesWorkspace
                  workspaceId={workspaceId}
                  datasources={datasources}
                  files={files}
                  jobs={ingestionJobs}
                  profiles={profiles}
                  loading={initialLoading}
                  healthFilter={activeHealthFilter}
                  profileError={profileError}
                  onCreateIngestion={onCreateIngestion}
                  onDeleteProfile={removeProfile}
                  onHealthFilterChange={setActiveHealthFilter}
                  onViewJobs={(jobId) => {
                    setSelectedJobId(jobId ?? null);
                    setActiveDataView("jobs");
                    setActiveHealthFilter(null);
                  }}
                />
              )}
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
