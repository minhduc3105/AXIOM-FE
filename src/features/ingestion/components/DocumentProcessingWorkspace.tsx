import { useEffect, useState } from "react";
import { AlertCircleIcon, CheckIcon, Clock3Icon, LoaderCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import type { DocumentProcessingStatus } from "../api/ingestionApi";
import type {
  DocumentProcessingBatch,
  DocumentProcessingUiStatus,
} from "../model/types";
import { useDocumentResultInspector } from "../model/useDocumentResultInspector";
import { DocumentResultViewer } from "./DocumentResultViewer";

type DocumentProcessingWorkspaceProps = {
  batch: DocumentProcessingBatch;
  status: DocumentProcessingUiStatus;
  results: DocumentProcessingStatus[];
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
};

type FileProcessingState = "waiting" | "processing" | "indexed" | "failed";

function getFileProcessingState(
  result: DocumentProcessingStatus | undefined,
): FileProcessingState {
  if (!result?.found) return "waiting";
  if (result.status === "completed") return "indexed";
  if (result.status === "failed") return "failed";
  return "processing";
}

const fileStateLabel: Record<FileProcessingState, string> = {
  waiting: "Waiting",
  processing: "Processing",
  indexed: "Indexed",
  failed: "Failed",
};

const sourceMeta = {
  upload: { label: "File upload", backLabel: "Back to upload" },
  s3: { label: "Amazon S3", backLabel: "Back to Amazon S3" },
  snowflake: { label: "Snowflake", backLabel: "Back to Snowflake" },
} as const;

const FILES_PER_PAGE = 50;

function getDisplayName(filename: string | null, key: string) {
  return filename ?? key.split("/").filter(Boolean).pop() ?? key;
}

function getFileType(key: string) {
  return key.includes(".") ? key.split(".").pop()?.toUpperCase() ?? "FILE" : "FILE";
}

export function DocumentProcessingWorkspace({
  batch,
  status,
  results,
  error,
  onRetry,
  onBack,
}: DocumentProcessingWorkspaceProps) {
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => setCurrentPage(1), [batch.job_id]);

  const inspector = useDocumentResultInspector(batch, results);
  const resultsByKey = new Map(results.map((result) => [result.object_key, result]));
  const fileStates = batch.files.map((file) => getFileProcessingState(resultsByKey.get(file.key)));
  const indexedCount = fileStates.filter((state) => state === "indexed").length;
  const failedCount = fileStates.filter((state) => state === "failed").length;
  const waitingCount = batch.count - indexedCount - failedCount;
  const active = status === "polling";
  const empty = status === "empty";
  const statusUnavailable = status === "status_error";
  const totalPages = Math.max(1, Math.ceil(batch.files.length / FILES_PER_PAGE));
  const firstVisibleIndex = (currentPage - 1) * FILES_PER_PAGE;
  const visibleFiles = batch.files.slice(firstVisibleIndex, firstVisibleIndex + FILES_PER_PAGE);
  const source = sourceMeta[batch.source_kind];

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
      <Card className="flex min-h-[760px] min-w-0 flex-col rounded-[28px] bg-card/95 p-4">
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <h2 className="text-xl font-semibold">Pipeline results</h2>
            <p className="mt-1 text-sm text-muted-foreground">{source.label}</p>
          </div>
          <Badge
            variant={statusUnavailable ? "destructive" : "secondary"}
            className={cn(
              active && "bg-primary/10 text-primary",
              status === "complete" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
            )}
          >
            {statusUnavailable ? "Unavailable" : active ? "Indexing" : status === "complete" ? "Ready" : "Review"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2" role="status" aria-live="polite">
          <Metric value={indexedCount} label="Indexed" tone="success" />
          <Metric value={waitingCount} label="Waiting" tone="active" />
          <Metric value={failedCount} label="Failed" tone={failedCount ? "danger" : "muted"} />
        </div>

        {active && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Checking AXIOM Corpus…
          </div>
        )}
        {statusUnavailable && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {error ?? "Document processing status is temporarily unavailable."}
          </div>
        )}

        <ScrollArea className="mt-4 h-[500px] pr-2">
          <div className="grid gap-2" role="list" aria-label="Document processing results">
            {visibleFiles.map((file, index) => {
              const absoluteIndex = firstVisibleIndex + index;
              const result = resultsByKey.get(file.key);
              const fileState = fileStates[absoluteIndex];
              const selected = inspector.selectedKey === file.key;
              const enabled = fileState === "indexed";
              const displayName = getDisplayName(file.filename, file.key);
              return (
                <div key={file.key} role="listitem">
                <Button
                  variant="outline"
                  className={cn(
                    "grid h-auto min-h-[74px] w-full grid-cols-[38px_minmax(0,1fr)] items-start gap-3 rounded-xl p-3 text-left",
                    selected && "border-primary bg-primary/10 ring-2 ring-primary/15",
                    fileState === "failed" && "border-red-200 bg-red-50/70 dark:border-red-800 dark:bg-red-950/30",
                    !enabled && "cursor-default opacity-75",
                  )}
                  type="button"
                  disabled={!enabled}
                  aria-pressed={selected}
                  aria-label={`${displayName}, ${fileStateLabel[fileState]}`}
                  onClick={() => inspector.selectFile(file.key)}
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-lg bg-muted font-mono text-[10px] font-bold text-muted-foreground",
                      fileState === "indexed" && "bg-emerald-500 text-white",
                      fileState === "processing" && "bg-primary text-primary-foreground",
                      fileState === "failed" && "bg-red-500 text-white",
                    )}
                  >
                    {fileState === "indexed" ? <CheckIcon className="size-4" />
                      : fileState === "failed" ? <AlertCircleIcon className="size-4" />
                        : fileState === "processing" ? <LoaderCircleIcon className="size-4 animate-spin" />
                          : <Clock3Icon className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{displayName}</strong>
                    <span className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{getFileType(file.key)}</span>
                      <span>·</span>
                      <span>{fileStateLabel[fileState]}</span>
                    </span>
                    <span className="mt-1 block truncate font-mono text-[9px] text-muted-foreground/80">{file.key}</span>
                    {result?.error_message && <span className="mt-1 block text-xs text-red-700 dark:text-red-300">{result.error_message}</span>}
                  </span>
                </Button>
                </div>
              );
            })}
            {empty && (
              <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                The import completed without indexable objects.
              </div>
            )}
          </div>
        </ScrollArea>

        {totalPages > 1 && (
          <nav className="mt-3 flex items-center justify-between gap-2" aria-label="Processing files pagination">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</Button>
          </nav>
        )}

        <div className="mt-auto grid gap-2 pt-4">
          {statusUnavailable && <Button type="button" onClick={onRetry}>Retry status check</Button>}
          <Button variant="outline" type="button" onClick={onBack}>{source.backLabel}</Button>
          <p className="truncate px-1 text-center font-mono text-[9px] text-muted-foreground">Job {batch.job_id}</p>
        </div>
      </Card>

      <DocumentResultViewer
        file={inspector.selectedFile}
        runId={inspector.selectedResult?.run_id ?? null}
        preview={inspector.preview}
        parsing={inspector.parsing}
        onRetryPreview={inspector.retryPreview}
        onRetryParsing={inspector.retryParsing}
      />
    </div>
  );
}

function Metric({ value, label, tone }: { value: number; label: string; tone: "success" | "active" | "danger" | "muted" }) {
  return (
    <div className={cn(
      "rounded-xl bg-muted/70 p-3",
      tone === "success" && "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
      tone === "active" && "bg-primary/10 text-primary",
      tone === "danger" && "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200",
    )}>
      <strong className="block text-xl">{value}</strong>
      <span className="text-[10px]">{label}</span>
    </div>
  );
}
