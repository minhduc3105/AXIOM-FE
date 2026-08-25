import { useCallback, useEffect, useState } from "react";
import {
  Clock3Icon,
  DatabaseIcon,
  DownloadIcon,
  FileTextIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getAutoReport,
  getAutoReportPdf,
  getAutoReportPolicy,
  listAutoReports,
  runAutoReportNow,
  updateAutoReportPolicy,
  type AutoReport,
  type AutoReportDetail,
  type AutoReportPolicy,
} from "./api/reportsApi";

type ReportsPageProps = {
  onData: () => void;
  workspaceId: string | null;
  workspaceName?: string | null;
};

const statusLabels: Record<AutoReport["status"], string> = {
  completed: "Ready",
  failed: "Failed",
  running: "Generating",
  skipped: "Skipped",
};

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The report service is unavailable.";
}

export function ReportsPage({
  onData,
  workspaceId,
  workspaceName,
}: ReportsPageProps) {
  const [policy, setPolicy] = useState<AutoReportPolicy | null>(null);
  const [interval, setInterval] = useState("900");
  const [reports, setReports] = useState<AutoReport[]>([]);
  const [selected, setSelected] = useState<AutoReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setPolicy(null);
      setReports([]);
      setSelected(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextPolicy, response] = await Promise.all([
        getAutoReportPolicy(workspaceId),
        listAutoReports(workspaceId),
      ]);
      setPolicy(nextPolicy);
      setInterval(String(nextPolicy.interval_seconds));
      setReports(response.items);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePolicy = async (enabled = policy?.enabled ?? false) => {
    if (!workspaceId) return;
    const seconds = Number(interval);
    if (!Number.isInteger(seconds) || seconds < 60 || seconds > 86_400) {
      toast.error("Use an interval between 60 seconds and 24 hours.");
      return;
    }
    setSaving(true);
    try {
      const nextPolicy = await updateAutoReportPolicy(workspaceId, {
        enabled,
        interval_seconds: seconds,
      });
      setPolicy(nextPolicy);
      setInterval(String(nextPolicy.interval_seconds));
      toast.success(enabled ? "Auto report enabled" : "Auto report paused");
    } catch (requestError) {
      toast.error("Could not update auto report", {
        description: errorMessage(requestError),
      });
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (!workspaceId) return;
    setRunning(true);
    try {
      const result = await runAutoReportNow(workspaceId);
      const messages = {
        scheduled: "Report job scheduled.",
        created: "Report job started.",
        skipped_no_source: "No file is available in this workspace yet.",
        skipped_already_processed: "The newest file already has a report.",
        already_running: "A report job is already running.",
        failed: "The report job could not be started.",
      } as const;
      if (result.status === "failed") {
        toast.error(messages[result.status]);
      } else {
        toast.success(messages[result.status]);
      }
      await load();
    } catch (requestError) {
      toast.error("Could not start report", {
        description: errorMessage(requestError),
      });
    } finally {
      setRunning(false);
    }
  };

  const showSources = async (report: AutoReport) => {
    if (!workspaceId) return;
    try {
      setSelected(await getAutoReport(workspaceId, report.report_id));
    } catch (requestError) {
      toast.error("Could not load report details", {
        description: errorMessage(requestError),
      });
    }
  };

  const download = async (reportId: string) => {
    if (!workspaceId) return;
    try {
      const { url } = await getAutoReportPdf(workspaceId, reportId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (requestError) {
      toast.error("Could not open PDF report", {
        description: errorMessage(requestError),
      });
    }
  };

  return (
    <section className="relative min-h-[calc(100dvh-var(--app-top-bar-height))] px-5 pb-12 pt-4 sm:px-8 md:pt-6">
      <div className="mx-auto grid w-full max-w-[1240px] gap-6">
        <header className="rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {workspaceName || workspaceId || "Choose a workspace"}
              </span>
              <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
                Automated PDF reports
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Every run analyzes only the newest workspace file and creates a
                compact PDF report with the important findings and charts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={onData}
              >
                <DatabaseIcon data-icon="inline-start" /> Manage data
              </Button>
              <Button
                className="rounded-full"
                disabled={!workspaceId || running}
                onClick={() => void runNow()}
              >
                {running ? (
                  <LoaderCircleIcon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <SparklesIcon data-icon="inline-start" />
                )}
                Dev: run report now
              </Button>
            </div>
          </div>
        </header>

        {!workspaceId ? (
          <div className="rounded-[24px] border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            Select a workspace to configure and view its reports.
          </div>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Auto report scheduler</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Runs only while this workspace is enabled.
                    </p>
                  </div>
                  <Switch
                    checked={policy?.enabled ?? false}
                    disabled={saving || loading}
                    onCheckedChange={(enabled) => void savePolicy(enabled)}
                    aria-label="Enable automatic reports"
                  />
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Interval (seconds)
                    <Input
                      type="number"
                      min="60"
                      max="86400"
                      value={interval}
                      disabled={saving || loading}
                      onChange={(event) => setInterval(event.target.value)}
                    />
                  </label>
                  <Button
                    variant="outline"
                    disabled={saving || loading}
                    onClick={() => void savePolicy()}
                  >
                    {saving ? "Saving..." : "Save interval"}
                  </Button>
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3Icon className="size-3.5" /> Next check:{" "}
                  {formatDate(policy?.next_due_at ?? null)}
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-secondary p-5">
                <p className="text-xs text-muted-foreground">
                  Latest completed report
                </p>
                <strong className="mt-3 block truncate text-lg">
                  {reports.find((report) => report.status === "completed")
                    ?.title || "No PDF report yet"}
                </strong>
                <p className="mt-2 text-sm text-muted-foreground">
                  {reports.length} run{reports.length === 1 ? "" : "s"} recorded
                  in this workspace.
                </p>
              </div>
            </section>

            {error && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <section className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Report history</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void load()}
                  disabled={loading}
                >
                  <RefreshCwIcon className={loading ? "animate-spin" : ""} />{" "}
                  Refresh
                </Button>
              </div>
              <div className="mt-4 grid gap-3">
                {!loading && reports.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No reports yet. Use the Dev button after uploading a
                    workspace file.
                  </p>
                )}
                {reports.map((report) => (
                  <article
                    key={report.report_id}
                    className="rounded-[18px] border border-border p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => void showSources(report)}
                      >
                        <p className="font-semibold">
                          {report.title || "Report generation"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatDate(report.completed_at || report.created_at)}{" "}
                          /{" "}
                          {report.primary_source?.filename ||
                            "Waiting for newest file"}
                        </p>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          {statusLabels[report.status]}
                        </span>
                        {report.report_available && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => void download(report.report_id)}
                          >
                            <DownloadIcon /> PDF
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Generated from the newest workspace file only. Open to
                      see the source file.
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {selected && (
              <section className="rounded-[24px] border border-primary/25 bg-primary/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      Files used by {selected.title || selected.report_id}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This report was generated from the newest workspace file
                      only.
                    </p>
                  </div>
                  {selected.report_available && (
                    <Button
                      className="rounded-full"
                      onClick={() => void download(selected.report_id)}
                    >
                      <DownloadIcon data-icon="inline-start" /> Open PDF
                    </Button>
                  )}
                </div>
                <ul className="mt-4 grid gap-2">
                  {selected.sources.map((source) => (
                    <li
                      key={`${source.role}-${source.source_id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        <FileTextIcon className="mr-2 inline size-4 text-primary" />
                        {source.filename}
                      </span>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs">
                        {source.role}
                      </span>
                    </li>
                  ))}
                </ul>
                {selected.error_message && (
                  <p className="mt-4 text-sm text-destructive">
                    {selected.error_message}
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}
