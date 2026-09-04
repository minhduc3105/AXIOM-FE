import { useEffect, useState } from "react";
import {
  DatabaseIcon,
  FileTextIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useReportsDashboard } from "./model/useReportsDashboard";
import { LatestReportSignal } from "./components/LatestReportSignal";
import { ReportChartGrid } from "./components/ReportChartGrid";
import { ReportHistory } from "./components/ReportHistory";
import { ReportMetricGrid } from "./components/ReportMetricGrid";
import { ReportSourcePickerDialog } from "./components/ReportSourcePickerDialog";

type ReportsPageProps = {
  organizationId: string | null;
  workspaceId: string | null;
};

function formatGeneratedDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function actionError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The report service is unavailable.";
}

export function ReportsPage({ organizationId, workspaceId }: ReportsPageProps) {
  const {
    overview,
    selectedReport,
    loading,
    refreshing,
    running,
    processingSource,
    historyReports,
    historyPagination,
    historyLoading,
    error,
    refresh,
    selectReport,
    changeHistoryPage,
    runNow,
    runFromSources,
    download,
  } = useReportsDashboard(workspaceId);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const generatedAt =
    overview?.latest_report?.completed_at ??
    overview?.latest_report?.created_at ??
    overview?.freshness.dashboard_generated_at ??
    null;

  useEffect(() => {
    if (!workspaceId) setSourcePickerOpen(false);
  }, [workspaceId]);

  const handleRunNow = async () => {
    try {
      const status = await runNow();
      const messages = {
        scheduled: "Report job scheduled.",
        created: "Report job started.",
        skipped_no_source: "No file is available in this workspace yet.",
        skipped_no_unprocessed_source:
          "The newest workspace file already has a report.",
        skipped_already_processed: "The newest file already has a report.",
        already_running: "A report job is already running.",
        failed: "The report job could not be started.",
      } as const;
      if (status === "failed") {
        toast.error(messages[status]);
      } else if (status) {
        toast.success(messages[status]);
      }
    } catch (requestError) {
      toast.error("Could not start report", {
        description: actionError(requestError),
      });
    }
  };

  const handleRunFromSources = async (sourceIds: string[]) => {
    try {
      const status = await runFromSources(sourceIds);
      if (status === "failed") {
        toast.error("The report job could not be started.");
        return false;
      }
      if (status === "scheduled" || status === "created") {
        toast.success("Report job scheduled for the selected files.");
        return true;
      }
      if (status === "already_running") {
        toast.error("A report job is already running.");
      }
      return false;
    } catch (requestError) {
      toast.error("Could not start report", {
        description: actionError(requestError),
      });
      return false;
    }
  };

  const handleSelect = async (report: Parameters<typeof selectReport>[0]) => {
    try {
      await selectReport(report);
    } catch (requestError) {
      toast.error("Could not load report details", {
        description: actionError(requestError),
      });
    }
  };

  const handleDownload = async (reportId: string) => {
    try {
      await download(reportId);
    } catch (requestError) {
      toast.error("Could not open PDF report", {
        description: actionError(requestError),
      });
    }
  };

  return (
    <section
      className="relative min-h-[calc(100dvh-var(--app-top-bar-height))] px-5 pb-12 pt-4 sm:px-8 md:pt-6"
      aria-busy={loading || refreshing}
    >
      <div className="mx-auto grid w-full gap-5">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={!workspaceId || loading || refreshing}
            >
              <RefreshCwIcon
                data-icon="inline-start"
                className={refreshing ? "animate-spin" : undefined}
              />
              Refresh
            </Button>
            <Button
              onClick={() => void handleRunNow()}
              disabled={!workspaceId || running || loading}
            >
              {running ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              Generate now
            </Button>
            <Button
              variant="outline"
              onClick={() => setSourcePickerOpen(true)}
              disabled={!workspaceId || running || loading}
            >
              <FileTextIcon data-icon="inline-start" />
              Generate from given source
            </Button>
            {generatedAt && (
              <p className="text-xs text-muted-foreground">
                Generated {formatGeneratedDate(generatedAt)}
              </p>
            )}
          </div>
        </header>

        {!workspaceId ? (
          <Empty className="min-h-[420px] rounded-2xl border border-dashed border-border bg-card/60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DatabaseIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Select a workspace</EmptyTitle>
              <EmptyDescription>
                Choose a workspace to inspect its automated report signals.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Report dashboard unavailable</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>{error}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refresh()}
                    disabled={refreshing}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
              <div className="grid min-w-0 gap-5">
                <LatestReportSignal
                  report={overview?.latest_report ?? null}
                  dashboard={overview?.dashboard ?? null}
                  processingSource={processingSource}
                  loading={loading}
                  onDownload={(reportId) => void handleDownload(reportId)}
                />
                <ReportMetricGrid dashboard={overview?.dashboard ?? null} />
                <ReportHistory
                  reports={historyReports}
                  selectedReportId={selectedReport?.report_id}
                  loading={historyLoading}
                  pagination={historyPagination}
                  onSelect={(report) => void handleSelect(report)}
                  onDownload={(reportId) => void handleDownload(reportId)}
                  onPageChange={(page) => void changeHistoryPage(page)}
                />
              </div>

              <div className="grid min-w-0 content-start gap-5">
                <ReportChartGrid dashboard={overview?.dashboard ?? null} />
              </div>
            </div>
          </>
        )}
      </div>
      <ReportSourcePickerDialog
        open={sourcePickerOpen}
        organizationId={organizationId}
        workspaceId={workspaceId}
        generating={running}
        onOpenChange={setSourcePickerOpen}
        onGenerate={handleRunFromSources}
      />
    </section>
  );
}
