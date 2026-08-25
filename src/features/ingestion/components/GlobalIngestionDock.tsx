import {
  CheckCircle2Icon,
  CircleAlertIcon,
  ListTodoIcon,
  LoaderCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { useGlobalIngestion } from "../model/GlobalIngestionProvider";
import type {
  GlobalIngestionJob,
  GlobalIngestionJobStatus,
  GlobalIngestionObjectStatus,
} from "../model/globalIngestionTypes";

const jobStatusLabel: Record<GlobalIngestionJobStatus, string> = {
  submitting: "Submitting",
  transferring: "Transferring",
  processing: "Processing",
  complete: "Complete",
  partial_failure: "Needs review",
  failed: "Failed",
};

function statusBadgeVariant(status: GlobalIngestionJobStatus) {
  if (status === "failed" || status === "partial_failure")
    return "destructive" as const;
  if (status === "complete") return "default" as const;
  return "secondary" as const;
}

function ObjectStatusIcon({
  status,
  jobNeedsAttention,
}: {
  status: GlobalIngestionObjectStatus;
  jobNeedsAttention: boolean;
}) {
  if (status === "indexed") return <CheckCircle2Icon aria-hidden="true" />;
  if (status === "failed") return <XCircleIcon aria-hidden="true" />;
  if (jobNeedsAttention) return <CircleAlertIcon aria-hidden="true" />;
  if (status === "processing") {
    return <LoaderCircleIcon className="animate-spin" aria-hidden="true" />;
  }
  return <LoaderCircleIcon className="animate-spin" aria-hidden="true" />;
}

function JobProgress({ job }: { job: GlobalIngestionJob }) {
  if (job.status === "submitting" || job.status === "transferring") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {jobStatusLabel[job.status]} files to AXIOM storage.
        </p>
        <Skeleton className="h-1.5 w-full" />
      </div>
    );
  }
  if (job.status !== "processing") return null;
  const finished = job.objects.filter(
    (object) => object.status === "indexed" || object.status === "failed",
  ).length;
  const value = job.objects.length ? (finished / job.objects.length) * 100 : 0;
  return (
    <Progress value={value}>
      <ProgressLabel>Document processing</ProgressLabel>
      <ProgressValue>{() => `${finished}/${job.objects.length}`}</ProgressValue>
    </Progress>
  );
}

export function GlobalIngestionDock({
  onOpenDetails = () => {},
}: {
  onOpenDetails?: (jobId: string, objectKey: string) => void;
}) {
  const {
    dismissJob,
    jobs,
    jobsSheetOpen,
    openDialog,
    retryJob,
    setJobsSheetOpen,
  } = useGlobalIngestion();
  const visibleJobs = jobs.filter((job) => job.status !== "complete");
  if (!visibleJobs.length) return null;

  const activeJobs = visibleJobs.filter(
    (job) =>
      job.status === "submitting" ||
      job.status === "transferring" ||
      job.status === "processing",
  );
  const attentionJobs = visibleJobs.filter(
    (job) =>
      Boolean(job.errorMessage) ||
      job.status === "failed" ||
      job.status === "partial_failure",
  );
  const dockLabel = attentionJobs.length
    ? `${attentionJobs.length} issue${attentionJobs.length === 1 ? "" : "s"}`
    : `${activeJobs.length} active`;

  return (
    <>
      <Button
        aria-label="Open ingestion jobs"
        aria-live="polite"
        className="h-9 shrink-0 rounded-md border-border bg-card px-2.5 text-foreground shadow-none hover:bg-muted"
        type="button"
        variant="outline"
        onClick={() => setJobsSheetOpen(true)}
      >
        {attentionJobs.length ? (
          <CircleAlertIcon className="text-warning" data-icon="inline-start" />
        ) : activeJobs.length ? (
          <LoaderCircleIcon
            className="animate-spin text-primary"
            data-icon="inline-start"
          />
        ) : (
          <ListTodoIcon className="text-primary" data-icon="inline-start" />
        )}
        <span className="hidden max-w-36 truncate sm:inline">{dockLabel}</span>
      </Button>
      <Sheet open={jobsSheetOpen} onOpenChange={setJobsSheetOpen}>
        <SheetContent className="w-full p-0 sm:max-w-xl gap-0">
          <SheetHeader className="border-b pr-12">
            <SheetTitle>Ingestion jobs</SheetTitle>
            <SheetDescription>
              Follow transfer and document parsing without leaving your current
              work.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col divide-y">
              {visibleJobs.map((job) => (
                <JobRow
                  job={job}
                  key={job.id}
                  onDismiss={() => dismissJob(job.id)}
                  onOpenDetails={(key) => {
                    setJobsSheetOpen(false);
                    onOpenDetails(job.id, key);
                  }}
                  onOpenUpload={openDialog}
                  onRetry={() => retryJob(job.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

function JobRow({
  job,
  onDismiss,
  onOpenDetails,
  onOpenUpload,
  onRetry,
}: {
  job: GlobalIngestionJob;
  onDismiss: () => void;
  onOpenDetails: (key: string) => void;
  onOpenUpload: () => void;
  onRetry: () => void;
}) {
  const needsAttention = Boolean(job.errorMessage);
  return (
    <section className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{job.title}</p>
        </div>
        {job.status === "complete" ? (
          <Button size="sm" type="button" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : (
          <Badge variant={statusBadgeVariant(job.status)}>
            {jobStatusLabel[job.status]}
          </Badge>
        )}
      </div>
      <JobProgress job={job} />
      {job.errorMessage ? (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <CircleAlertIcon aria-hidden="true" />
          <span>{job.errorMessage}</span>
        </div>
      ) : null}

      <div className="flex flex-col divide-y rounded-lg border">
        {job.objects.map((object) => (
          <div className="flex items-center gap-3 p-3" key={object.key}>
            <span
              className={cn(
                "text-muted-foreground",
                object.status === "failed" && "text-destructive",
                object.status === "indexed" &&
                  "text-status-success",
              )}
            >
              <ObjectStatusIcon
                status={object.status}
                jobNeedsAttention={needsAttention}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {object.name}
              </span>
              {object.errorMessage ? (
                <span className="block text-xs text-destructive">
                  {object.errorMessage}
                </span>
              ) : null}
            </span>
            {object.status === "indexed" ? (
              <Button
                aria-label={`View details for ${object.name}`}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onOpenDetails(object.key)}
              >
                View details
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      {job.status !== "complete" && (
        <div className="flex items-center gap-2">
          {job.retry ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={
                job.retry === "start_new_upload" ? onOpenUpload : onRetry
              }
            >
              {job.retry === "start_new_upload" ? "Upload again" : "Retry"}
            </Button>
          ) : null}
          <Button size="sm" type="button" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      )}
    </section>
  );
}
