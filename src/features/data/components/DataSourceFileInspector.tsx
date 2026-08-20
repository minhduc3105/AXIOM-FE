import { useMemo } from "react";
import { DocumentResultViewer } from "@/shared/components/document-results/DocumentResultViewer";
import { useProcessedDocumentResources } from "@/shared/hooks/use-processed-document-resources";
import type { ProcessingFile } from "@/shared/types/document-results";
import type { DataFile, DataSource } from "../model/types";

type DataSourceFileInspectorProps = {
  datasource: DataSource;
  file: DataFile;
  onBack: () => void;
};

export function DataSourceFileInspector({
  datasource,
  file,
  onBack,
}: DataSourceFileInspectorProps) {
  const processingFile = useMemo<ProcessingFile>(
    () => ({
      key: file.key,
      filename: file.name,
      contentType: null,
    }),
    [file.key, file.name],
  );
  const processingResult = useMemo(
    () => ({
      run_id: file.runId,
      document_id: file.documentId,
      status: file.canInspect ? "completed" : file.sourceStatus,
    }),
    [file.canInspect, file.documentId, file.runId, file.sourceStatus],
  );
  const resources = useProcessedDocumentResources({
    organizationId: file.organizationId,
    workspaceId: file.workspaceId,
    bucket: file.bucket,
    file: processingFile,
    result: processingResult,
  });

  return (
    <div className="h-[calc(100dvh-var(--app-top-bar-height)-1rem)] min-h-[620px] min-w-0 p-3 sm:p-4">
      <DocumentResultViewer
        className="min-h-0"
        file={processingFile}
        preview={resources.preview}
        parsing={resources.parsing}
        onRetryPreview={resources.retryPreview}
        onRetryParsing={resources.retryParsing}
        context={{
          sourceLabel:
            datasource.type === "UPLOAD"
              ? "Uploaded files"
              : (datasource.name ?? datasource.type),
          statusLabel:
            file.status === "success"
              ? "Ready"
              : file.status === "processing"
                ? "Processing"
                : "Failed",
          statusTone:
            file.status === "success"
              ? "success"
              : file.status === "processing"
                ? "processing"
                : "failed",
          backLabel: "Back",
          onBack,
        }}
      />
    </div>
  );
}
