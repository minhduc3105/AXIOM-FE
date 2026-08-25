import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DocumentResultViewer } from "@/shared/components/document-results/DocumentResultViewer";
import { useProcessedDocumentResources } from "@/shared/hooks/use-processed-document-resources";
import type { ProcessingFile } from "@/shared/types/document-results";
import { useGlobalIngestion } from "../model/GlobalIngestionProvider";

type IngestionDocumentPageProps = {
  objectKey: string;
  bucket: string;
  filename: string | null;
  documentId: string | null;
  sourceLabel: string;
  onBack: () => void;
};

export function IngestionDocumentPage({
  objectKey,
  bucket,
  filename,
  documentId,
  sourceLabel,
  onBack,
}: IngestionDocumentPageProps) {
  const { workspaceId } = useGlobalIngestion();
  const file = useMemo<ProcessingFile | null>(() => {
    if (!objectKey || !bucket) return null;
    return {
      key: objectKey,
      filename,
      contentType: null,
    };
  }, [bucket, filename, objectKey]);
  const result = useMemo(
    () => (file ? { run_id: null, document_id: documentId, status: "completed" } : null),
    [documentId, file],
  );
  const resources = useProcessedDocumentResources({
    workspaceId,
    bucket,
    file,
    result,
  });

  if (!file) {
    return (
      <section className="p-4 sm:p-6">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Alert>
          <AlertTitle>Document result is unavailable</AlertTitle>
          <AlertDescription>
            This ingestion result is no longer available in the current session.
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <div className="h-full min-h-0 min-w-0 p-3 sm:p-4">
      <DocumentResultViewer
        className="min-h-0"
        file={file}
        preview={resources.preview}
        parsing={resources.parsing}
        onRetryPreview={resources.retryPreview}
        onRetryParsing={resources.retryParsing}
        context={{
          sourceLabel,
          statusLabel: "Ready",
          statusTone: "success",
          backLabel: "Back",
          onBack,
        }}
      />
    </div>
  );
}
