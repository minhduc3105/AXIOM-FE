import {
  CheckCircle2Icon,
  CircleAlertIcon,
  DownloadIcon,
  FileTextIcon,
  LoaderCircleIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AutoReportDetail, AutoReportSource } from "../api/reportsApi";
import { getReportSourcePath } from "../model/reportSourceLinks";
import type {
  ReportDashboardChangeTone,
  ReportDashboardSnapshot,
} from "../model/types";

type LatestReportSignalProps = {
  report: AutoReportDetail | null;
  dashboard: ReportDashboardSnapshot | null;
  processingSource?: AutoReportSource | null;
  loading?: boolean;
  onDownload: (reportId: string) => void;
};

const toneIcons: Record<ReportDashboardChangeTone, typeof SparklesIcon> = {
  positive: CheckCircle2Icon,
  warning: TriangleAlertIcon,
  neutral: SparklesIcon,
  critical: CircleAlertIcon,
};

const toneClasses: Record<ReportDashboardChangeTone, string> = {
  positive: "border-status-success/25 bg-status-success/10",
  warning: "border-status-warning/25 bg-status-warning/10",
  neutral: "border-border bg-secondary",
  critical: "border-destructive/25 bg-destructive/10",
};

export function LatestReportSignal({
  report,
  dashboard,
  processingSource = null,
  loading = false,
  onDownload,
}: LatestReportSignalProps) {
  if (loading && !report) {
    return (
      <Card className="min-h-[360px] border-border/70 bg-card/80">
        <CardContent className="grid flex-1 content-start gap-5 p-5 sm:p-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    if (processingSource) {
      return (
        <Card className="overflow-hidden border-primary/25 bg-card shadow-sm">
          <CardHeader className="gap-3 border-b border-primary/15 bg-primary/5 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/25 bg-primary/10 text-primary"
              >
                Latest signal
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                Generating
              </Badge>
              <LoaderCircleIcon
                className="animate-spin text-muted-foreground"
                aria-label="Report is generating"
              />
            </div>
            <CardTitle className="text-2xl leading-tight sm:text-3xl">
              Generating report
            </CardTitle>
            <CardDescription className="line-clamp-2 max-w-3xl text-sm leading-6">
              Processing {processingSource.filename}. Findings will appear when
              the run completes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3 text-sm">
              <FileTextIcon
                className="mt-0.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Source being processed
                </p>
                <p
                  className="truncate font-medium"
                  title={processingSource.filename}
                >
                  {processingSource.filename}
                </p>
              </div>
            </div>
            <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-muted-foreground">
              The newest workspace file is being analyzed now.
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="min-h-[360px] border-dashed bg-card/70">
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <SparklesIcon aria-hidden="true" />
          </div>
          <div className="grid gap-1">
            <p className="font-semibold">No report signal yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Generate a report after a workspace file is available. Extracted
              metrics and charts will appear here when the run completes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isProcessing = Boolean(processingSource);
  const changes = (dashboard?.changes ?? []).slice(0, 3);
  const isFailure = report.status === "failed" && !isProcessing;

  return (
    <Card className="overflow-hidden border-border/80 bg-card shadow-sm p-0">
      <CardHeader className="gap-4 border-b border-border/70 bg-secondary/45 px-5 py-5 sm:px-6">
        <div className="grid gap-2">
          <CardTitle className="text-2xl leading-tight sm:text-3xl">
            {isProcessing
              ? "Generating report"
              : dashboard?.headline.title ||
                report.title ||
                "Report generation"}
          </CardTitle>
          <CardDescription className="line-clamp-2 max-w-3xl text-sm leading-6">
            {isProcessing
              ? `Processing ${processingSource?.filename || "the newest workspace file"}. Findings will appear when the run completes.`
              : dashboard?.headline.summary ||
                report.summary ||
                "The report has not returned a summary yet."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 px-5 py-5 sm:px-6">
        <section className="grid gap-3" aria-labelledby="latest-report-changes">
          <div className="flex items-center justify-between gap-3">
            <h3 id="latest-report-changes" className="text-sm font-semibold">
              Key insights
            </h3>
          </div>
          {isProcessing ? (
            <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-muted-foreground">
              The newest workspace file is being analyzed. This card will update
              when the report is ready.
            </p>
          ) : changes.length ? (
            <ul className="grid gap-2">
              {changes.map((change) => {
                const Icon = toneIcons[change.tone];
                return (
                  <li
                    key={change.id}
                    className={`flex gap-3 rounded-xl border px-3 py-3 ${toneClasses[change.tone]}`}
                  >
                    <Icon className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{change.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {change.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
              No key insights were extracted from this report.
            </p>
          )}
        </section>

        {isFailure && report.error_message && (
          <div
            className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-3 text-sm text-destructive"
            role="alert"
          >
            {report.error_message}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap justify-between gap-2 px-5 py-4 sm:px-6">
        <ReportReferences sources={report.sources} disabled={isProcessing} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={isProcessing || !report.report_available}
            onClick={() => onDownload(report.report_id)}
          >
            <DownloadIcon data-icon="inline-start" />
            {report.report_available ? "Open PDF" : "PDF unavailable"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function ReportReferences({
  sources,
  disabled,
}: {
  sources: AutoReportSource[];
  disabled: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={100}
        closeDelay={150}
        disabled={disabled || !sources.length}
        render={<Button variant="ghost" />}
      >
        References
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="top"
          align="start"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup className="grid w-[min(24rem,calc(100vw-2rem))] gap-3 rounded-xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="grid gap-1">
              <Popover.Title className="text-sm font-semibold">
                References
              </Popover.Title>
              <Popover.Description className="text-xs text-muted-foreground">
                Documents used to generate this report.
              </Popover.Description>
            </div>
            <ul className="grid max-h-64 gap-1 overflow-y-auto">
              {sources.map((source) => (
                <li key={`${source.role}-${source.source_id}`}>
                  <a
                    href={getReportSourcePath(source)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-start justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <FileTextIcon
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span
                        className="min-w-0 truncate"
                        title={source.filename}
                      >
                        {source.filename}
                      </span>
                    </span>
                    <Badge variant="outline" className="shrink-0 rounded-full">
                      {source.role}
                    </Badge>
                  </a>
                </li>
              ))}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
