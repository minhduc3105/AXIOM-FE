import { useMemo, useState } from "react";
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
import { DataEmptyState } from "./components/DataEmptyState";
import { DataMetrics } from "./components/DataMetrics";
import { DataSourcesWorkspace } from "./components/DataSourcesWorkspace";
import { DataSourceConnectionDialog } from "./components/DataSourceConnectionDialog";
import { useDataDashboard } from "./model/useDataDashboard";
import { useDataSourceProfiles } from "@/shared/hooks/use-data-source-profiles";
import type {
  DataSourceProfileType,
  SavedDataSourceProfile,
} from "@/shared/types/data-source-profile";
import { useDataWorkspace } from "./model/DataWorkspaceProvider";
import type { DataFile } from "./model/types";

type DataPageProps = {
  organizationId: string;
  onCreateIngestion: () => void;
  onOpenDocument?: (file: DataFile, sourceLabel: string) => void;
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

export function DataPage({
  organizationId,
  onCreateIngestion,
  onOpenDocument = () => {},
}: DataPageProps) {
  const [connectionDialog, setConnectionDialog] = useState<{
    type: DataSourceProfileType;
    profile: SavedDataSourceProfile | null;
  } | null>(null);
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
    refresh: refreshProfiles,
    remove: removeProfile,
  } = useDataSourceProfiles(organizationId);
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

  return (
    <section
      className="min-h-[calc(100dvh-var(--app-top-bar-height))] w-full overflow-x-hidden px-4 pb-12 pt-4 sm:px-6 md:pt-6"
      aria-label="Data management"
    >
      <div className="mx-auto grid w-full gap-6">
        {workspace.error && (
          <Alert variant="destructive">
            <ServerCrashIcon />
            <AlertTitle>Workspaces are unavailable</AlertTitle>
            <AlertDescription>{workspace.error}</AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                onClick={workspace.refreshWorkspaces}
              >
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
          total={summary.total}
          ready={summary.ready}
          processing={summary.processing}
          failed={summary.failed}
          totalSize={summary.totalSize}
        />

        <section
          id="data-file-inventory"
          className="overflow-hidden rounded-lg border bg-card shadow-sm"
          aria-label="Data inventory"
        >
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
              dataLoading={loading}
              profileError={profileError}
              refreshing={refreshing}
              onRefresh={refresh}
              onCreateIngestion={onCreateIngestion}
              onOpenDocument={onOpenDocument}
              onConfigureSource={(type, profile = null) =>
                setConnectionDialog({ type, profile })
              }
              onDeleteProfile={removeProfile}
            />
          )}
        </section>
      </div>
      {connectionDialog && (
        <DataSourceConnectionDialog
          organizationId={organizationId}
          workspaceId={workspaceId}
          sourceType={connectionDialog.type}
          profile={connectionDialog.profile}
          open
          onOpenChange={(open) => {
            if (!open) setConnectionDialog(null);
          }}
          onSaved={() => {
            refreshProfiles();
            refresh();
          }}
        />
      )}
    </section>
  );
}
