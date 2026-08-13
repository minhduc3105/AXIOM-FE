import { ChooseSource } from "./components/ChooseSource";
import { ConnectorCatalog } from "./components/ConnectorCatalog";
import { DocumentProcessingWorkspace } from "./components/DocumentProcessingWorkspace";
import { IngestionWorkspaceFrame } from "./components/IngestionWorkspaceFrame";
import { IndexWorkspace } from "./components/IndexWorkspace";
import { MeaningWorkspace } from "./components/MeaningWorkspace";
import { MySqlForm } from "./components/MySqlForm";
import { PipelineWorkspace } from "./components/PipelineWorkspace";
import { ProfileWorkspace } from "./components/ProfileWorkspace";
import { S3Workspace } from "./components/S3Workspace";
import { SnowflakeForm } from "./components/SnowflakeForm";
import { UploadWorkspace } from "./components/UploadWorkspace";
import { progressStageByView } from "./model/types";
import { useIngestionWorkflow } from "./model/useIngestionWorkflow";
import type { IngestionLaunchContext } from "./model/useIngestionWorkflow";
import { useDataWorkspace } from "@/features/data/model/DataWorkspaceProvider";

type IngestionPageProps = {
  organizationId: string;
  onBack: () => void;
  backLabel?: string;
  launchContext?: IngestionLaunchContext;
};

const pageTitles = {
  source: "Choose how to bring data into AXIOM",
  catalog: "Choose a data source to connect",
  mysql: "Connect your MySQL data source",
  s3: "Import objects from Amazon S3",
  snowflake: "Import data from Snowflake",
  upload: "Upload files and preview selected data",
  processing: "Review indexed files and parsed layout",
  pipeline: "Run repository ingestion pipeline",
  profile: "Review aggregate profile across every source",
  meaning: "Extract meaning and confirm semantic hints",
  index: "Index ready with searchable evidence",
} as const;

export function IngestionPage({
  organizationId,
  onBack,
  backLabel,
  launchContext,
}: IngestionPageProps) {
  const workspace = useDataWorkspace();
  const selectedWorkspace = workspace.selectedWorkspace;
  const workflow = useIngestionWorkflow(
    organizationId,
    selectedWorkspace?.id ?? "",
    launchContext,
  );
  const source = workflow.source;
  const selectingS3Files =
    workflow.stage === "s3" &&
    (workflow.s3BrowserStatus === "ready" ||
      workflow.s3BrowserStatus === "loading_more" ||
      workflow.s3BrowserStatus === "loading_all" ||
      (workflow.s3BrowserStatus === "error" && workflow.s3Files.length > 0));
  const trackingS3Import =
    workflow.stage === "s3" &&
    (Boolean(workflow.ingestionJob) ||
      workflow.connectorJobStatus === "submitting" ||
      workflow.connectorJobStatus === "polling" ||
      workflow.connectorJobStatus === "discovering_files" ||
      workflow.connectorJobStatus === "status_error" ||
      workflow.connectorJobStatus === "files_error");
  const pageTitle = trackingS3Import
    ? "Track selected Amazon S3 import"
    : selectingS3Files
      ? "Choose Amazon S3 objects to import"
      : pageTitles[workflow.stage];
  const repoMessage =
    workflow.stage === "source"
      ? "New ingestion source"
      : workflow.stage === "catalog"
        ? "No source connected"
        : workflow.stage === "mysql"
          ? workflow.connectionStatus === "verified"
            ? "Connection verified"
            : "Connection not tested"
          : workflow.stage === "s3"
            ? workflow.connectorJobStatus === "submitting" ||
              workflow.connectorJobStatus === "polling" ||
              workflow.ingestionJob ||
              (workflow.connectorJobStatus === "failed" &&
                workflow.selectedS3Keys.length > 0)
              ? workflow.connectorJobStatus === "discovering_files"
                ? "Preparing selected objects for indexing"
                : workflow.connectorJobStatus === "completed"
                  ? `${workflow.ingestionJob?.objects_written ?? 0} selected objects stored`
                  : workflow.connectorJobStatus === "polling"
                    ? "Selected object import running"
                    : workflow.connectorJobStatus === "failed" ||
                        workflow.connectorJobStatus === "status_error" ||
                        workflow.connectorJobStatus === "files_error"
                      ? "Selected object import needs attention"
                      : "Creating selected object import"
              : workflow.s3BrowserStatus === "loading"
                ? "Loading bucket objects"
                : workflow.s3BrowserStatus === "loading_more" ||
                    workflow.s3BrowserStatus === "loading_all"
                  ? `${workflow.s3Files.length} objects loaded so far`
                  : workflow.s3BrowserStatus === "ready" ||
                      workflow.s3Files.length > 0
                    ? `${workflow.selectedS3Keys.length} of ${workflow.s3Files.length} loaded objects selected`
                    : workflow.s3BrowserStatus === "error"
                      ? "Bucket listing needs attention"
                      : "S3 connection ready"
            : workflow.stage === "snowflake"
              ? workflow.connectorJobStatus === "discovering_files"
                ? "Preparing objects for indexing"
                : workflow.connectorJobStatus === "completed"
                  ? `${workflow.ingestionJob?.objects_written ?? 0} objects stored`
                  : workflow.connectorJobStatus === "polling"
                    ? "Source import running"
                    : workflow.connectorJobStatus === "failed" ||
                        workflow.connectorJobStatus === "status_error" ||
                        workflow.connectorJobStatus === "files_error"
                      ? "Source import needs attention"
                      : "Source import ready"
              : workflow.stage === "upload"
                ? workflow.uploadStatus === "loading"
                  ? "Uploading files"
                  : workflow.uploadStatus === "success"
                    ? `${workflow.uploadResult?.count ?? workflow.files.length} file${(workflow.uploadResult?.count ?? workflow.files.length) === 1 ? "" : "s"} stored`
                    : `${workflow.files.length} file${workflow.files.length === 1 ? "" : "s"} staged`
                : workflow.stage === "processing"
                  ? workflow.documentProcessingStatus === "empty"
                    ? "No objects to index"
                    : workflow.documentProcessingStatus === "complete"
                      ? "All files indexed"
                      : workflow.documentProcessingStatus ===
                          "completed_with_errors"
                        ? "Processing completed with errors"
                        : workflow.documentProcessingStatus === "status_error"
                          ? "Corpus status unavailable"
                          : "Document processing"
                  : workflow.stage === "pipeline"
                    ? workflow.pipelineStatus === "loading"
                      ? "Pipeline running"
                      : workflow.pipelineStatus === "success"
                        ? "Profile generated"
                        : "Pipeline ready"
                    : workflow.stage === "profile"
                      ? "Profile generated"
                      : workflow.stage === "meaning"
                        ? workflow.meaningStatus === "extracting"
                          ? "Extracting meaning"
                          : "Meaning ready"
                        : workflow.indexStatus === "ready"
                          ? "Index ready"
                          : "Building index";

  return (
    <IngestionWorkspaceFrame
      title={pageTitle}
      repoMessage={repoMessage}
      workspaceName={selectedWorkspace?.name ?? "No workspace selected"}
      ready={
        workflow.indexStatus === "ready" ||
        workflow.documentProcessingStatus === "complete" ||
        workflow.documentProcessingStatus === "completed_with_errors"
      }
      active={progressStageByView[workflow.stage]}
      furthest={workflow.furthestProgress}
      error={workflow.error}
      onBack={onBack}
      backLabel={backLabel}
      fullBleed={workflow.stage === "processing"}
      onNavigate={workflow.navigateProgress}
    >
      {workflow.stage === "source" && (
        <ChooseSource
          onUpload={workflow.addFiles}
          onConnect={workflow.openCatalog}
        />
      )}
      {workflow.stage === "catalog" && (
        <ConnectorCatalog
          selected={workflow.selectedConnector}
          onSelect={workflow.selectConnector}
          onBack={workflow.openSource}
        />
      )}
      {workflow.stage === "mysql" && (
        <MySqlForm
          connection={workflow.connection}
          status={workflow.connectionStatus}
          onChange={workflow.updateConnection}
          onTest={() => void workflow.testConnection()}
          onSave={() => void workflow.persistConnection()}
          onBack={workflow.openCatalog}
        />
      )}
      {workflow.stage === "s3" && (
        <S3Workspace
          connection={workflow.s3Connection}
          browserStatus={workflow.s3BrowserStatus}
          files={workflow.s3Files}
          nextToken={workflow.s3NextToken}
          selectedKeys={workflow.selectedS3Keys}
          browserError={workflow.s3BrowserError}
          connectorStatus={workflow.connectorJobStatus}
          job={workflow.ingestionJob}
          connectorError={workflow.connectorError}
          onChange={workflow.updateS3Connection}
          onBrowse={() => void workflow.browseS3Files()}
          onLoadMore={() => void workflow.loadMoreS3Files()}
          onLoadAll={() => void workflow.loadAllS3Files()}
          onRetryBrowser={workflow.retryS3Browser}
          onEditConnection={workflow.editS3Connection}
          onToggleKey={workflow.toggleS3Key}
          onSetSelection={workflow.setSelectedS3Keys}
          onClearSelection={workflow.clearSelectedS3Keys}
          onSubmit={() => void workflow.submitS3Import()}
          onRetryStatus={() => void workflow.retryIngestionStatus()}
          onRetryFiles={() => void workflow.retryConnectorFileDiscovery()}
          onNewImport={workflow.startNewConnectorImport}
          onBack={workflow.openCatalog}
          profileName={workflow.profileName}
          profileSaved={Boolean(workflow.activeProfile)}
          profileDirty={workflow.profileDirty}
          profileError={workflow.profileError}
          onProfileNameChange={workflow.setProfileName}
          onSaveProfile={workflow.saveCurrentProfile}
        />
      )}
      {workflow.stage === "snowflake" && (
        <SnowflakeForm
          connection={workflow.snowflakeConnection}
          status={workflow.connectorJobStatus}
          job={workflow.ingestionJob}
          error={workflow.connectorError}
          onChange={workflow.updateSnowflakeConnection}
          onSubmit={() => void workflow.submitSnowflakeImport()}
          onRetryStatus={() => void workflow.retryIngestionStatus()}
          onRetryFiles={() => void workflow.retryConnectorFileDiscovery()}
          onNewImport={workflow.startNewConnectorImport}
          onBack={workflow.openCatalog}
          profileName={workflow.profileName}
          profileSaved={Boolean(workflow.activeProfile)}
          profileDirty={workflow.profileDirty}
          profileError={workflow.profileError}
          onProfileNameChange={workflow.setProfileName}
          onSaveProfile={workflow.saveCurrentProfile}
        />
      )}
      {workflow.stage === "upload" && (
        <UploadWorkspace
          files={workflow.files}
          selectedFileId={workflow.selectedFileId}
          uploadStatus={workflow.uploadStatus}
          uploadResult={workflow.uploadResult}
          onFiles={workflow.addFiles}
          onSelectFile={workflow.selectFile}
          onRemoveFile={workflow.removeFile}
          onUpload={() => void workflow.uploadSelectedFiles()}
          onProcessing={() => workflow.navigateProgress("pipeline")}
          onBack={workflow.openSource}
        />
      )}
      {workflow.stage === "processing" && workflow.processingBatch && (
        <DocumentProcessingWorkspace
          batch={workflow.processingBatch}
          status={workflow.documentProcessingStatus}
          results={workflow.documentProcessingResults}
          error={workflow.documentProcessingError}
          onRetry={() => void workflow.retryDocumentProcessingStatus()}
          onBack={() => workflow.navigateProgress("transfer")}
        />
      )}
      {workflow.stage === "pipeline" && source && (
        <PipelineWorkspace
          source={source}
          tasks={workflow.tasks}
          status={workflow.pipelineStatus}
          onRun={() => void workflow.startPipeline()}
          onReview={workflow.openProfile}
          onBack={() => workflow.navigateProgress("transfer")}
        />
      )}
      {workflow.stage === "profile" && source && (
        <ProfileWorkspace
          source={source}
          onContinue={() => void workflow.startMeaning()}
          onBack={() => workflow.navigateProgress("pipeline")}
        />
      )}
      {workflow.stage === "meaning" && (
        <MeaningWorkspace
          status={workflow.meaningStatus}
          revisionCount={workflow.revisionCount}
          onApprove={() => void workflow.approveMeaning()}
          onRevision={() => void workflow.requestRevision()}
          onBack={() => workflow.navigateProgress("profile")}
        />
      )}
      {workflow.stage === "index" && source && (
        <IndexWorkspace
          source={source}
          status={workflow.indexStatus}
          query={workflow.searchQuery}
          completedQuery={workflow.completedSearchQuery}
          searchStatus={workflow.searchStatus}
          onQueryChange={workflow.setSearchQuery}
          onSearch={() => void workflow.search()}
          onBack={() => workflow.navigateProgress("meaning")}
        />
      )}
    </IngestionWorkspaceFrame>
  );
}
