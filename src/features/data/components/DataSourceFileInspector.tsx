import { useMemo } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="grid gap-4 p-4 sm:p-5">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="truncate">{file.name}</CardTitle>
          <CardDescription className="truncate">
            {datasource.type === "UPLOAD"
              ? "Uploaded files"
              : (datasource.name ?? datasource.type)}
          </CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" type="button" onClick={onBack}>
              <ArrowLeftIcon data-icon="inline-start" />
              Back to files
            </Button>
          </CardAction>
        </CardHeader>
      </Card>
      <DocumentResultViewer
        file={processingFile}
        runId={file.runId}
        preview={resources.preview}
        parsing={resources.parsing}
        onRetryPreview={resources.retryPreview}
        onRetryParsing={resources.retryParsing}
      />
    </div>
  );
}
