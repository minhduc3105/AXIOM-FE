import { useEffect, useState } from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  Clock3Icon,
  LoaderCircleIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import type { DocumentProcessingStatus } from "../api/ingestionApi";
import type {
  DocumentProcessingBatch,
  DocumentProcessingUiStatus,
} from "../model/types";
import { useDocumentResultInspector } from "../model/useDocumentResultInspector";
import { DocumentResultViewer } from "@/shared/components/document-results/DocumentResultViewer";

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
  return key.includes(".")
    ? (key.split(".").pop()?.toUpperCase() ?? "FILE")
    : "FILE";
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
  const resultsByKey = new Map(
    results.map((result) => [result.object_key, result]),
  );
  const fileStates = batch.files.map((file) =>
    getFileProcessingState(resultsByKey.get(file.key)),
  );
  const indexedCount = fileStates.filter((state) => state === "indexed").length;
  const failedCount = fileStates.filter((state) => state === "failed").length;
  const waitingCount = batch.count - indexedCount - failedCount;
  const active = status === "polling";
  const empty = status === "empty";
  const statusUnavailable = status === "status_error";
  const totalPages = Math.max(
    1,
    Math.ceil(batch.files.length / FILES_PER_PAGE),
  );
  const firstVisibleIndex = (currentPage - 1) * FILES_PER_PAGE;
  const visibleFiles = batch.files.slice(
    firstVisibleIndex,
    firstVisibleIndex + FILES_PER_PAGE,
  );
  const source = sourceMeta[batch.source_kind];

  return (
    <div className="grid min-h-[calc(100dvh-var(--app-top-bar-height)-84px)] min-w-0 gap-4 xl:h-[calc(100dvh-var(--app-top-bar-height)-84px)] xl:grid-cols-[330px_minmax(0,1fr)]">
      <Card className="min-h-[520px] min-w-0 gap-0 py-0 xl:min-h-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Pipeline results</CardTitle>
          <CardDescription>{source.label}</CardDescription>
          <CardAction>
            <Badge
              variant={
                statusUnavailable
                  ? "destructive"
                  : active || status === "complete"
                    ? "default"
                    : "secondary"
              }
            >
              {statusUnavailable
                ? "Unavailable"
                : active
                  ? "Indexing"
                  : status === "complete"
                    ? "Ready"
                    : "Review"}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col p-4">
          <div
            className="grid grid-cols-3 gap-2"
            role="status"
            aria-live="polite"
          >
            <Metric value={indexedCount} label="Indexed" tone="success" />
            <Metric value={waitingCount} label="Waiting" tone="active" />
            <Metric
              value={failedCount}
              label="Failed"
              tone={failedCount ? "danger" : "muted"}
            />
          </div>

          {active && (
            <Alert className="mt-4">
              <LoaderCircleIcon className="animate-spin" />
              <AlertTitle>Checking AXIOM Corpus</AlertTitle>
              <AlertDescription>
                Processing status is refreshing for this import.
              </AlertDescription>
            </Alert>
          )}
          {statusUnavailable && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircleIcon />
              <AlertTitle>Document status unavailable</AlertTitle>
              <AlertDescription>
                {error ??
                  "Document processing status is temporarily unavailable."}
              </AlertDescription>
            </Alert>
          )}

          <ScrollArea className="mt-4 min-h-[280px] flex-1 pr-2">
            <div
              className="grid gap-2"
              role="list"
              aria-label="Document processing results"
            >
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
                        selected &&
                          "border-primary bg-primary/10 ring-2 ring-primary/15",
                        fileState === "failed" &&
                          "border-destructive/40 bg-destructive/10",
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
                          fileState === "indexed" &&
                            "bg-primary text-primary-foreground",
                          fileState === "processing" &&
                            "bg-primary text-primary-foreground",
                          fileState === "failed" &&
                            "bg-destructive text-destructive-foreground",
                        )}
                      >
                        {fileState === "indexed" ? (
                          <CheckIcon />
                        ) : fileState === "failed" ? (
                          <AlertCircleIcon />
                        ) : fileState === "processing" ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : (
                          <Clock3Icon />
                        )}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">
                          {displayName}
                        </strong>
                        <span className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{getFileType(file.key)}</span>
                          <span>·</span>
                          <span>{fileStateLabel[fileState]}</span>
                        </span>
                        {result?.error_message && (
                          <span className="mt-1 block text-xs text-destructive">
                            {result.error_message}
                          </span>
                        )}
                      </span>
                    </Button>
                  </div>
                );
              })}
              {empty && (
                <Alert>
                  <AlertTitle>No indexable objects</AlertTitle>
                  <AlertDescription>
                    The import completed without indexable objects.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>

          {totalPages > 1 && (
            <nav
              className="mt-3 flex items-center justify-between gap-2"
              aria-label="Processing files pagination"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </CardContent>

        <CardFooter className="grid gap-2">
          {statusUnavailable && (
            <Button type="button" onClick={onRetry}>
              Retry status check
            </Button>
          )}
          <Button variant="outline" type="button" onClick={onBack}>
            {source.backLabel}
          </Button>
        </CardFooter>
      </Card>

      <DocumentResultViewer
        className="xl:min-h-0"
        file={inspector.selectedFile}
        preview={inspector.preview}
        parsing={inspector.parsing}
        onRetryPreview={inspector.retryPreview}
        onRetryParsing={inspector.retryParsing}
        context={{
          sourceLabel: source.label,
          statusLabel: inspector.selectedFile ? "Ready" : "No selection",
          statusTone: inspector.selectedFile ? "success" : "neutral",
        }}
      />
    </div>
  );
}

function Metric({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "success" | "active" | "danger" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-muted/70 p-3",
        tone === "success" && "bg-primary/10 text-primary",
        tone === "active" && "bg-primary/10 text-primary",
        tone === "danger" && "bg-destructive/10 text-destructive",
      )}
    >
      <strong className="block text-xl">{value}</strong>
      <span className="text-[10px]">{label}</span>
    </div>
  );
}
