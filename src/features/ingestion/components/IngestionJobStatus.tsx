import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";
import type { IngestionJobResponse } from "../api/ingestionApi";
import type { ConnectorJobUiStatus } from "../model/types";

type IngestionJobStatusProps = {
  connectorName: string;
  mark: string;
  description: string;
  status: ConnectorJobUiStatus;
  job: IngestionJobResponse | null;
  error: string | null;
  idleNotes: string[];
  onRetryStatus: () => void;
  onRetryFiles: () => void;
  onNewImport: () => void;
};

const backendStatusLabel = {
  created: "Upload queued",
  uploading: "Uploading files…",
  committed: "Files stored",
  pending: "Import queued",
  pulling: "Importing source data…",
  completed: "Source data stored",
  failed: "Import failed",
} as const;

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function IngestionJobStatus({
  connectorName,
  mark,
  description,
  status,
  job,
  error,
  idleNotes,
  onRetryStatus,
  onRetryFiles,
  onNewImport,
}: IngestionJobStatusProps) {
  const visibleStatus =
    status === "submitting"
      ? "Creating import job…"
      : status === "discovering_files"
        ? "Preparing indexing"
        : status === "files_error"
          ? "Indexing handoff failed"
          : status === "status_error"
            ? "Status unavailable"
            : job
              ? backendStatusLabel[job.status]
              : status === "failed"
                ? "Import could not start"
                : "Ready to import";
  const sourceStored =
    job?.status === "completed" || job?.status === "committed";
  const successful = sourceStored && status === "completed";
  const jobFailed = status === "failed" || job?.status === "failed";
  const failed = jobFailed || status === "files_error";
  const active =
    status === "submitting" ||
    status === "polling" ||
    status === "discovering_files";
  const currentStep = sourceStored
    ? 2
    : job?.status === "pulling" ||
        job?.status === "uploading" ||
        (job?.status === "failed" && job.started_at)
      ? 1
      : 0;
  const transferSteps = ["Job queued", "Copying objects", "Stored"];

  return (
    <Card className="rounded-[32px] border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-semibold">Import status</h2>
        <Badge
          className={cn(
            "rounded-full border px-3 py-1",
            successful &&
              "border-status-success/25 bg-status-success/10 text-status-success",
            failed &&
              "border-destructive/25 bg-destructive/10 text-destructive",
            !successful &&
              !failed &&
              "border-border bg-secondary text-muted-foreground",
          )}
        >
          {visibleStatus}
        </Badge>
      </div>

      <div className="mt-5 flex gap-4 rounded-3xl border border-border bg-secondary p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-xs font-bold text-primary-foreground">
          {mark}
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">{connectorName}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {(job || status === "submitting") && (
        <ol
          className="mt-5 grid grid-cols-3 gap-2"
          aria-label="Import progress"
        >
          {transferSteps.map((step, index) => {
            const complete = sourceStored || index < currentStep;
            const current = !sourceStored && index === currentStep;
            const stepFailed = failed && current;
            return (
              <li
                className={cn(
                  "grid min-w-0 gap-2 rounded-2xl border border-border bg-card p-3 text-center text-xs text-muted-foreground",
                  complete &&
                    "border-status-success/25 bg-status-success/10 text-status-success",
                  current &&
                    "border-info/25 bg-info/10 font-semibold text-info",
                  stepFailed &&
                    "border-destructive/25 bg-destructive/10 text-destructive",
                )}
                aria-current={current ? "step" : undefined}
                key={step}
              >
                <span
                  className={cn(
                    "mx-auto grid size-6 place-items-center rounded-full border border-border bg-card font-semibold",
                    complete &&
                      "border-status-success bg-status-success text-primary-foreground",
                    current &&
                      "border-primary bg-primary text-primary-foreground",
                    stepFailed &&
                      "border-destructive bg-destructive text-primary-foreground",
                  )}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <span className="truncate">{step}</span>
              </li>
            );
          })}
        </ol>
      )}

      {active && (
        <div
          className="mt-4 flex items-center gap-3 rounded-2xl border border-info/25 bg-info/10 p-3 text-sm text-info"
          role="status"
        >
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-info/20 border-t-info" />
          <span>
            {status === "submitting"
              ? "Creating the import job…"
              : status === "discovering_files"
                ? "Loading stored objects and preparing Corpus indexing status…"
                : job?.status === "pending"
                  ? "Waiting for the connector worker…"
                  : "Copying source objects into AXIOM storage…"}
          </span>
        </div>
      )}

      {!job && status === "idle" && (
        <ul className="mt-5 grid gap-2">
          {idleNotes.map((note) => (
            <li
              className="flex items-start gap-2 rounded-2xl bg-secondary px-3 py-2 text-sm"
              key={note}
            >
              <i className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      {job && (
        <div className="mt-5 grid gap-3" role="status" aria-live="polite">
          <div className="rounded-2xl bg-secondary p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Job ID
            </span>
            <strong className="mt-1 block break-all font-mono text-sm">
              {job.job_id}
            </strong>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-secondary p-4">
              <strong className="block text-2xl">{job.records_pulled}</strong>
              <span className="text-sm text-muted-foreground">
                Records pulled
              </span>
            </div>
            <div className="rounded-2xl bg-secondary p-4">
              <strong className="block text-2xl">{job.objects_written}</strong>
              <span className="text-sm text-muted-foreground">
                Objects stored
              </span>
            </div>
          </div>
          <dl className="grid gap-2 rounded-2xl border border-border p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Started</dt>
              <dd className="text-right">{formatTimestamp(job.started_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Finished</dt>
              <dd className="text-right">{formatTimestamp(job.finished_at)}</dd>
            </div>
          </dl>
        </div>
      )}

      {(error || job?.error_message) && (
        <div
          className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          {job?.error_message || error}
        </div>
      )}

      {successful && (
        <div className="mt-5 rounded-2xl border border-status-success/25 bg-status-success/10 p-4 text-sm text-status-success">
          Source data is stored and linked to AXIOM's document processing
          tracker.
        </div>
      )}

      {status === "status_error" && (
        <Button
          className="mt-5 w-full rounded-full"
          variant="outline"
          type="button"
          onClick={onRetryStatus}
        >
          Retry status check
        </Button>
      )}
      {status === "files_error" && (
        <Button
          className="mt-5 w-full rounded-full"
          variant="outline"
          type="button"
          onClick={onRetryFiles}
        >
          Retry indexing handoff
        </Button>
      )}
      {jobFailed && job && (
        <Button
          className="mt-5 w-full rounded-full"
          variant="outline"
          type="button"
          onClick={onNewImport}
        >
          Start new import
        </Button>
      )}
    </Card>
  );
}
