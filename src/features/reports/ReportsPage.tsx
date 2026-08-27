import { useEffect, useState } from "react";
import {
  DatabaseIcon,
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
import { ReportAutomationPanel } from "./components/ReportAutomationPanel";
import { ReportChartGrid } from "./components/ReportChartGrid";
import { ReportDetailPanel } from "./components/ReportDetailPanel";
import { ReportHistory } from "./components/ReportHistory";
import { ReportMetricGrid } from "./components/ReportMetricGrid";

type ReportsPageProps = {
  workspaceId: string | null;
};

function formatFreshness(value: string | null) {
  if (!value) return "No source timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown source time";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
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

export function ReportsPage({
  workspaceId,
}: ReportsPageProps) {
  const {
    overview,
    selectedReport,
    loading,
    refreshing,
    saving,
    running,
    processingSource,
    error,
    refresh,
    selectReport,
    runNow,
    savePolicy,
    download,
    clearSelection,
  } = useReportsDashboard(workspaceId);
  const [interval, setInterval] = useState("900");

  useEffect(() => {
    if (overview?.automation) {
      setInterval(String(overview.automation.interval_seconds));
    }
  }, [overview?.automation]);

  const handleSavePolicy = async (enabled: boolean) => {
    try {
      await savePolicy(enabled, interval);
      toast.success(enabled ? "Auto reports enabled" : "Auto reports paused");
    } catch (requestError) {
      toast.error("Could not update automation", {
        description: actionError(requestError),
      });
    }
  };

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
          <div className="flex flex-wrap gap-2">
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

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid min-w-0 gap-5">
                <LatestReportSignal
                  report={overview?.latest_report ?? null}
                  dashboard={overview?.dashboard ?? null}
                  processingSource={processingSource}
                  isCurrent={overview?.freshness.is_current ?? false}
                  loading={loading}
                  onDownload={(reportId) => void handleDownload(reportId)}
                  onInspect={() => {
                    if (overview?.latest_report) {
                      void handleSelect(overview.latest_report);
                    }
                  }}
                />
                <ReportMetricGrid dashboard={overview?.dashboard ?? null} />
                <ReportChartGrid dashboard={overview?.dashboard ?? null} />
              </div>

              <div className="grid min-w-0 content-start gap-5">
                <ReportHistory
                  reports={overview?.recent_reports ?? []}
                  selectedReportId={selectedReport?.report_id}
                  loading={loading}
                  onSelect={(report) => void handleSelect(report)}
                  onDownload={(reportId) => void handleDownload(reportId)}
                />
                <ReportAutomationPanel
                  policy={overview?.automation ?? null}
                  interval={interval}
                  loading={loading}
                  saving={saving}
                  onIntervalChange={setInterval}
                  onSave={(enabled) => void handleSavePolicy(enabled)}
                />
                <ReportDetailPanel
                  report={selectedReport}
                  onClose={clearSelection}
                  onDownload={(reportId) => void handleDownload(reportId)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
