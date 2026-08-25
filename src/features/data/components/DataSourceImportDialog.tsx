import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2Icon,
  CloudIcon,
  FileIcon,
  ImportIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SnowflakeIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/shared/lib/utils";
import {
  listSavedS3Files,
  startSavedDatasourceIngestion,
} from "@/features/ingestion/api/datasourceProfileApi";
import {
  getIngestionJob,
  type IngestionJobResponse,
  type S3File,
} from "@/features/ingestion/api/ingestionApi";
import type { DataSource } from "../model/types";

const S3_PAGE_SIZE = 1000;
const POLL_INTERVAL_MS = 2000;
const POLL_ATTEMPTS = 90;

function waitForNextPoll(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, POLL_INTERVAL_MS);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("The import status check was cancelled.", "AbortError"));
      },
      { once: true },
    );
  });
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function sourceLabel(datasource: DataSource) {
  return datasource.name?.trim() ||
    (datasource.type === "s3" ? "Amazon S3" : "Snowflake");
}

function isActiveJob(status: IngestionJobResponse["status"]) {
  return status === "pending" || status === "pulling";
}

function IngestionStatus({ job }: { job: IngestionJobResponse | null }) {
  if (!job) return null;
  if (job.status === "completed") {
    return (
      <Alert className="border-status-success/25 bg-status-success/10 text-status-success">
        <CheckCircle2Icon className="text-status-success" />
        <AlertTitle>Import completed</AlertTitle>
        <AlertDescription>
          {job.objects_written.toLocaleString()} object
          {job.objects_written === 1 ? "" : "s"} stored. The file inventory
          will refresh when you close this dialog.
        </AlertDescription>
      </Alert>
    );
  }
  if (job.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Import failed</AlertTitle>
        <AlertDescription>
          {job.error_message || "The source import could not be completed."}
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />
      <AlertTitle>
        {job.status === "pulling" ? "Import is running" : "Import is queued"}
      </AlertTitle>
      <AlertDescription>
        AXIOM is copying source objects into the workspace. This dialog will
        refresh the job status automatically.
      </AlertDescription>
    </Alert>
  );
}

export function DataSourceImportDialog({
  datasource,
  open,
  onOpenChange,
  onCompleted,
}: {
  datasource: DataSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const isS3 = datasource.type === "s3";
  const [s3Files, setS3Files] = useState<S3File[]>([]);
  const [s3NextToken, setS3NextToken] = useState<string | null>(null);
  const [selectedS3Keys, setSelectedS3Keys] = useState<string[]>([]);
  const [snowflakeOptions, setSnowflakeOptions] = useState({
    discoverTables: true,
    discoverStages: true,
  });
  const [browsing, setBrowsing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<IngestionJobResponse | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const completedJobRef = useRef<string | null>(null);

  const connectorConfig = datasource.connectorConfig ?? {};
  const bucketName =
    typeof connectorConfig.bucket_name === "string"
      ? connectorConfig.bucket_name
      : "Configured bucket";
  const region =
    typeof connectorConfig.region === "string" ? connectorConfig.region : "";
  const account =
    typeof connectorConfig.account === "string"
      ? connectorConfig.account
      : "Configured account";
  const selectedS3KeySet = useMemo(
    () => new Set(selectedS3Keys),
    [selectedS3Keys],
  );
  const allVisibleS3Selected =
    s3Files.length > 0 && s3Files.every((file) => selectedS3KeySet.has(file.key));
  const busy = browsing || starting || Boolean(job && isActiveJob(job.status));

  useEffect(() => {
    if (open) return;
    requestRef.current?.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestRef.current?.abort();
    setS3Files([]);
    setS3NextToken(null);
    setSelectedS3Keys([]);
    setSnowflakeOptions({ discoverTables: true, discoverStages: true });
    setBrowsing(false);
    setStarting(false);
    setError(null);
    setJob(null);
    completedJobRef.current = null;
  }, [datasource.id, open]);

  const browseS3 = async (nextToken: string | null = null) => {
    if (!isS3 || browsing || busy || !datasource.credentialsConfigured) return;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setBrowsing(true);
    setError(null);
    try {
      const result = await listSavedS3Files(
        datasource.id,
        S3_PAGE_SIZE,
        nextToken,
        controller.signal,
      );
      setS3Files((current) =>
        nextToken ? [...current, ...result.files] : result.files,
      );
      setS3NextToken(result.nextToken?.trim() || null);
    } catch (browseError) {
      if (!isAbortError(browseError)) {
        setError(getErrorMessage(browseError, "Unable to browse this S3 bucket."));
      }
    } finally {
      if (!controller.signal.aborted) setBrowsing(false);
    }
  };

  const toggleS3Key = (key: string) => {
    setSelectedS3Keys((current) =>
      current.includes(key)
        ? current.filter((currentKey) => currentKey !== key)
        : [...current, key],
    );
  };

  const toggleVisibleS3Files = () => {
    setSelectedS3Keys((current) => {
      if (allVisibleS3Selected) {
        const visibleKeys = new Set(s3Files.map((file) => file.key));
        return current.filter((key) => !visibleKeys.has(key));
      }
      return Array.from(new Set([...current, ...s3Files.map((file) => file.key)]));
    });
  };

  const pollJob = async (jobId: string, signal: AbortSignal) => {
    for (let attempt = 0; attempt < POLL_ATTEMPTS && !signal.aborted; attempt += 1) {
      await waitForNextPoll(signal);
      const latest = await getIngestionJob(jobId, signal);
      setJob(latest);
      if (latest.status === "completed") {
        if (completedJobRef.current !== latest.job_id) {
          completedJobRef.current = latest.job_id;
          onCompleted();
        }
        return;
      }
      if (latest.status === "failed") return;
    }
    if (!signal.aborted) {
      setError("Import is still running. Keep this dialog open or refresh the source later.");
    }
  };

  const startImport = async () => {
    if (busy || !datasource.credentialsConfigured) return;
    if (isS3 && selectedS3Keys.length === 0) {
      setError("Choose at least one S3 object before importing.");
      return;
    }
    if (!isS3 && !snowflakeOptions.discoverTables && !snowflakeOptions.discoverStages) {
      setError("Enable table or stage discovery before importing.");
      return;
    }

    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setStarting(true);
    setError(null);
    setJob(null);
    try {
      const accepted = await startSavedDatasourceIngestion({
        datasourceId: datasource.id,
        profileVersion: datasource.currentProfileVersion,
        options: isS3
          ? { s3Keys: selectedS3Keys }
          : {
              discoverTables: snowflakeOptions.discoverTables,
              discoverStages: snowflakeOptions.discoverStages,
            },
        signal: controller.signal,
      });
      setStarting(false);
      setJob(accepted);
      if (accepted.status === "completed") {
        completedJobRef.current = accepted.job_id;
        onCompleted();
        return;
      }
      if (accepted.status !== "failed") {
        await pollJob(accepted.job_id, controller.signal);
      }
    } catch (startError) {
      if (!isAbortError(startError)) {
        setError(getErrorMessage(startError, "Unable to start this source import."));
      }
    } finally {
      if (!controller.signal.aborted) setStarting(false);
    }
  };

  const resetFailedImport = () => {
    requestRef.current?.abort();
    setJob(null);
    setError(null);
  };

  const title = `Import from ${sourceLabel(datasource)}`;
  const canImport = Boolean(datasource.credentialsConfigured);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isS3 ? <CloudIcon /> : <SnowflakeIcon />}
            {title}
          </DialogTitle>
          <DialogDescription>
            Uses the saved server-side connector. Credentials stay encrypted in
            the backend and are not sent through this import flow.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-background text-primary">
            {isS3 ? <CloudIcon className="size-4" /> : <SnowflakeIcon className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{sourceLabel(datasource)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isS3 ? `${bucketName}${region ? ` · ${region}` : ""}` : account}
            </p>
          </div>
          <Badge variant={canImport ? "secondary" : "destructive"}>
            {canImport ? "Credentials ready" : "Credentials missing"}
          </Badge>
        </div>

        {!canImport ? (
          <Alert variant="destructive">
            <AlertTitle>Connector credentials are unavailable</AlertTitle>
            <AlertDescription>
              Open Connection settings, save valid credentials, then try this
              import again.
            </AlertDescription>
          </Alert>
        ) : isS3 ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">Choose S3 objects</p>
                <FieldDescription>
                  Browse the saved bucket without exposing AWS credentials to the browser.
                </FieldDescription>
              </div>
              <Button
                variant="outline"
                type="button"
                onClick={() => void browseS3()}
                disabled={busy}
              >
                <RefreshCwIcon
                  data-icon="inline-start"
                  className={browsing ? "animate-spin motion-reduce:animate-none" : undefined}
                />
                {browsing ? "Browsing…" : s3Files.length ? "Refresh objects" : "Browse objects"}
              </Button>
            </div>

            {s3Files.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  {selectedS3Keys.length.toLocaleString()} selected of {s3Files.length.toLocaleString()} loaded
                </span>
                <Button variant="ghost" size="sm" type="button" onClick={toggleVisibleS3Files} disabled={busy}>
                  {allVisibleS3Selected ? "Clear loaded" : "Select loaded"}
                </Button>
              </div>
            )}

            {s3Files.length > 0 ? (
              <ScrollArea className="h-64 rounded-lg border">
                <div className="divide-y">
                  {s3Files.map((file) => {
                    const selected = selectedS3KeySet.has(file.key);
                    return (
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/40",
                          selected && "bg-primary/5",
                        )}
                        key={file.key}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleS3Key(file.key)}
                          disabled={busy}
                          aria-label={`Select ${file.name}`}
                        />
                        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{file.name}</span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">{file.key}</span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatFileSize(file.size)}</span>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Browse the connector to load objects from this bucket.
              </div>
            )}

            {s3NextToken && (
              <Button
                variant="outline"
                type="button"
                onClick={() => void browseS3(s3NextToken)}
                disabled={busy}
              >
                Load more objects
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <p className="font-medium">Choose Snowflake discovery</p>
              <FieldDescription>
                Select which source objects AXIOM should pull into the workspace.
              </FieldDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field orientation="horizontal" className="rounded-lg border p-3">
                <Checkbox
                  id="saved-snowflake-discover-tables"
                  checked={snowflakeOptions.discoverTables}
                  onCheckedChange={(checked) =>
                    setSnowflakeOptions((current) => ({ ...current, discoverTables: Boolean(checked) }))
                  }
                  disabled={busy}
                />
                <FieldLabel htmlFor="saved-snowflake-discover-tables">Discover tables</FieldLabel>
              </Field>
              <Field orientation="horizontal" className="rounded-lg border p-3">
                <Checkbox
                  id="saved-snowflake-discover-stages"
                  checked={snowflakeOptions.discoverStages}
                  onCheckedChange={(checked) =>
                    setSnowflakeOptions((current) => ({ ...current, discoverStages: Boolean(checked) }))
                  }
                  disabled={busy}
                />
                <FieldLabel htmlFor="saved-snowflake-discover-stages">Discover stages</FieldLabel>
              </Field>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to import source</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <IngestionStatus job={job} />

        <Separator />
        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                type="button"
                disabled={browsing || starting}
              />
            }
          >
            {job && isActiveJob(job.status) ? "Close" : job?.status === "completed" ? "Close" : "Cancel"}
          </DialogClose>
          {job?.status === "failed" ? (
            <Button type="button" onClick={resetFailedImport} disabled={busy}>
              Try again
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void startImport()}
              disabled={
                !canImport ||
                busy ||
                job?.status === "completed" ||
                (isS3 ? selectedS3Keys.length === 0 : false)
              }
              aria-busy={busy}
            >
              {busy ? <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" data-icon="inline-start" /> : <ImportIcon data-icon="inline-start" />}
              {starting ? "Starting…" : job?.status === "completed" ? "Imported" : "Start ingestion"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
