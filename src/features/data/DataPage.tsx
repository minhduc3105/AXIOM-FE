import { useMemo, useState } from "react";
import { AlertTriangleIcon, CircleAlertIcon, ServerCrashIcon } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataEmptyState } from "./components/DataEmptyState";
import { DataSourcesWorkspace } from "./components/DataSourcesWorkspace";
import { DataSourceConnectionDialog } from "./components/DataSourceConnectionDialog";
import { DataSourceImportDialog } from "./components/DataSourceImportDialog";
import { useDataDashboard } from "./model/useDataDashboard";
import { useDataSourceProfiles } from "@/shared/hooks/use-data-source-profiles";
import type {
  DataSourceProfileType,
  SavedDataSourceProfile,
} from "@/shared/types/data-source-profile";
import { useDataWorkspace } from "./model/DataWorkspaceProvider";
import type { DataFile, DataSource } from "./model/types";

type DataPageProps = {
  organizationId: string;
  onCreateIngestion: () => void;
  onOpenDocument?: (file: DataFile, sourceLabel: string) => void;
};

export function DataPage({
  organizationId,
  onCreateIngestion,
  onOpenDocument = () => {},
}: DataPageProps) {
  const [connectionDialog, setConnectionDialog] = useState<{
    type: DataSourceProfileType;
    profile: SavedDataSourceProfile | null;
  } | null>(null);
  const [importDatasource, setImportDatasource] = useState<DataSource | null>(
    null,
  );
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
  const initialLoading = loading && !activeSnapshot;
  const refreshing = loading && Boolean(activeSnapshot);
  const summary = useMemo(() => {
    return {
      loading: initialLoading,
      total: files.length,
      ready: files.filter((file) => file.status === "success").length,
      processing: files.filter((file) => file.status === "processing").length,
      failed: files.filter((file) => file.status === "failed").length,
    };
  }, [files, initialLoading]);

  return (
    <section
      className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 py-4 sm:px-6 md:p-6"
      aria-label="Data management"
    >
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-3">
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

        {activeSnapshot?.warnings.length ? (
          <Alert className="border-warning/30 bg-warning/10">
            <AlertTriangleIcon className="text-warning" />
            <AlertTitle>Partial service availability</AlertTitle>
            <AlertDescription>
              {activeSnapshot.warnings.length === 1 ? (
                activeSnapshot.warnings[0]
              ) : (
                <ul className="list-disc space-y-1 pl-4">
                  {activeSnapshot.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <section
          id="data-file-inventory"
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card"
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
              summary={summary}
              loading={initialLoading}
              dataLoading={loading}
              profileError={profileError}
              refreshing={refreshing}
              onRefresh={refresh}
              onCreateIngestion={onCreateIngestion}
              onImportSource={setImportDatasource}
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
      {importDatasource && (
        <DataSourceImportDialog
          datasource={importDatasource}
          open
          onOpenChange={(open) => {
            if (!open) setImportDatasource(null);
          }}
          onCompleted={refresh}
        />
      )}
    </section>
  );
}
