import { useEffect } from "react";
import { FileTextIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentResultViewer } from "@/shared/components/document-results/DocumentResultViewer";
import { toDocumentProcessingStatuses } from "../model/globalIngestionReducer";
import { useDocumentResultInspector } from "../model/useDocumentResultInspector";
import type { GlobalIngestionJob } from "../model/globalIngestionTypes";

type IngestionResultDialogProps = {
  job: GlobalIngestionJob | null;
  selectedKey: string | null;
  onOpenChange: (open: boolean) => void;
};

export function IngestionResultDialog({
  job,
  selectedKey,
  onOpenChange,
}: IngestionResultDialogProps) {
  if (!job || !selectedKey) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(96rem,calc(100vw-2rem))] max-w-[96rem] overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>Parsed document result</DialogTitle>
          <DialogDescription>
            Compare the original file with the structured parse produced by AXIOM.
          </DialogDescription>
        </DialogHeader>
        {job.batch ? (
          <ResultContent job={job} initialKey={selectedKey} />
        ) : (
          <Alert>
            <AlertTitle>Result data is still loading</AlertTitle>
            <AlertDescription>
              This completed object can be inspected after its processing metadata is restored.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultContent({
  job,
  initialKey,
}: {
  job: GlobalIngestionJob;
  initialKey: string;
}) {
  const batch = job.batch;
  if (!batch) return null;
  const inspector = useDocumentResultInspector(
    batch,
    toDocumentProcessingStatuses(job.objects),
  );
  const indexedObjects = job.objects.filter(
    (object) => object.status === "indexed",
  );

  useEffect(() => {
    if (initialKey !== inspector.selectedKey) inspector.selectFile(initialKey);
  }, [initialKey, inspector]);

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[18.75rem_minmax(0,1.12fr)_minmax(22.5rem,0.88fr)]">
      <section className="flex min-h-[16rem] min-w-0 flex-col rounded-lg border">
        <div className="border-b px-4 py-3">
          <p className="font-medium">Indexed objects</p>
          <p className="text-sm text-muted-foreground">
            Choose a file to inspect.
          </p>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col divide-y p-2">
            {indexedObjects.map((object) => (
              <Button
                className="h-auto justify-start p-2 text-left"
                key={object.key}
                variant={inspector.selectedKey === object.key ? "secondary" : "ghost"}
                type="button"
                onClick={() => inspector.selectFile(object.key)}
              >
                <FileTextIcon data-icon="inline-start" />
                <span className="truncate">{object.name}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </section>
      <DocumentResultViewer
        file={inspector.selectedFile}
        preview={inspector.preview}
        parsing={inspector.parsing}
        onRetryPreview={inspector.retryPreview}
        onRetryParsing={inspector.retryParsing}
      />
    </div>
  );
}
