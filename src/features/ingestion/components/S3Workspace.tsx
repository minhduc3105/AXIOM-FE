import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { IngestionJobResponse, S3File } from "../api/ingestionApi";
import type {
  ConnectorJobUiStatus,
  S3BrowserStatus,
  S3Connection,
} from "../model/types";
import { IngestionJobStatus } from "./IngestionJobStatus";
import { S3FileSelector } from "./S3FileSelector";
import { S3Form } from "./S3Form";

type S3WorkspaceProps = {
  connection: S3Connection;
  browserStatus: S3BrowserStatus;
  files: S3File[];
  nextToken: string | null;
  selectedKeys: string[];
  browserError: string | null;
  connectorStatus: ConnectorJobUiStatus;
  job: IngestionJobResponse | null;
  connectorError: string | null;
  onChange: (field: keyof S3Connection, value: string) => void;
  onBrowse: () => void;
  onLoadMore: () => void;
  onLoadAll: () => void;
  onRetryBrowser: () => void;
  onEditConnection: () => void;
  onToggleKey: (key: string) => void;
  onSetSelection: (keys: string[]) => void;
  onClearSelection: () => void;
  onSubmit: () => void;
  onRetryStatus: () => void;
  onRetryFiles: () => void;
  onNewImport: () => void;
  onBack: () => void;
};

export function S3Workspace({
  connection,
  browserStatus,
  files,
  nextToken,
  selectedKeys,
  browserError,
  connectorStatus,
  job,
  connectorError,
  onChange,
  onBrowse,
  onLoadMore,
  onLoadAll,
  onRetryBrowser,
  onEditConnection,
  onToggleKey,
  onSetSelection,
  onClearSelection,
  onSubmit,
  onRetryStatus,
  onRetryFiles,
  onNewImport,
  onBack,
}: S3WorkspaceProps) {
  const showingJob =
    Boolean(job) ||
    connectorStatus === "submitting" ||
    connectorStatus === "polling" ||
    connectorStatus === "discovering_files" ||
    connectorStatus === "status_error" ||
    connectorStatus === "files_error";

  if (showingJob) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="rounded-3xl bg-card/90 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Selected S3 import</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {connection.bucketName} · {connection.region}
              </p>
            </div>
            <Badge variant="secondary">
              {selectedKeys.length} selected
            </Badge>
          </div>
          <div className="mt-5 grid gap-2">
            {selectedKeys.slice(0, 8).map((key) => (
              <div
                className="truncate rounded-xl bg-muted/60 px-3 py-2 font-mono text-xs"
                title={key}
                key={key}
              >
                {key}
              </div>
            ))}
            {selectedKeys.length > 8 && (
              <span className="text-sm text-muted-foreground">
                +{selectedKeys.length - 8} more selected objects
              </span>
            )}
          </div>
          <div className="mt-5 rounded-2xl border bg-muted/35 p-4 text-sm text-muted-foreground">
            Credentials were cleared after the import job was accepted. Only
            the selected object keys are included in this run.
          </div>
        </Card>

        <IngestionJobStatus
          connectorName="Amazon S3"
          mark="S3"
          description="External object storage · selected object import"
          status={connectorStatus}
          job={job}
          error={connectorError}
          idleNotes={[
            "Only selected source objects will be copied",
            "Credentials are cleared after job creation",
          ]}
          onRetryStatus={onRetryStatus}
          onRetryFiles={onRetryFiles}
          onNewImport={onNewImport}
        />
      </div>
    );
  }

  const showingBrowser =
    browserStatus === "ready" ||
    browserStatus === "loading_more" ||
    browserStatus === "loading_all" ||
    (browserStatus === "error" && files.length > 0) ||
    (connectorStatus === "failed" && selectedKeys.length > 0);

  if (showingBrowser) {
    return (
      <S3FileSelector
        connection={connection}
        files={files}
        nextToken={nextToken}
        selectedKeys={selectedKeys}
        browserStatus={browserStatus}
        browserError={browserError}
        importStatus={connectorStatus}
        importError={
          connectorStatus === "failed" && !job ? connectorError : null
        }
        onToggleKey={onToggleKey}
        onSetSelection={onSetSelection}
        onClearSelection={onClearSelection}
        onLoadMore={onLoadMore}
        onLoadAll={onLoadAll}
        onRetryBrowser={onRetryBrowser}
        onImport={onSubmit}
        onEditConnection={onEditConnection}
      />
    );
  }

  return (
    <S3Form
      connection={connection}
      browserStatus={browserStatus}
      error={browserError}
      onChange={onChange}
      onBrowse={onBrowse}
      onBack={onBack}
    />
  );
}
