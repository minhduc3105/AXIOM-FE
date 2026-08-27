import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAutoReport,
  getAutoReportOverview,
  getAutoReportPdf,
  runAutoReportNow,
  updateAutoReportPolicy,
  type AutoReport,
  type AutoReportDetail,
  type AutoReportOverview,
  type AutoReportSource,
} from "../api/reportsApi";

type ReportsDashboardState = {
  overview: AutoReportOverview | null;
  selectedReport: AutoReportDetail | null;
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  running: boolean;
  processingSource: AutoReportSource | null;
  error: string | null;
  refresh: () => Promise<void>;
  selectReport: (report: AutoReport) => Promise<void>;
  runNow: () => Promise<"scheduled" | "created" | "skipped_no_source" | "skipped_no_unprocessed_source" | "skipped_already_processed" | "already_running" | "failed" | null>;
  savePolicy: (enabled: boolean, interval: string) => Promise<boolean>;
  download: (reportId: string) => Promise<void>;
  clearSelection: () => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The report service is unavailable.";
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useReportsDashboard(
  workspaceId: string | null,
): ReportsDashboardState {
  const [overview, setOverview] = useState<AutoReportOverview | null>(null);
  const [selectedReport, setSelectedReport] = useState<AutoReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [processingSource, setProcessingSource] = useState<AutoReportSource | null>(null);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const currentWorkspaceId = workspaceId;
    controller.current?.abort();
    if (!currentWorkspaceId) {
      requestId.current += 1;
      setOverview(null);
      setSelectedReport(null);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const nextRequestId = ++requestId.current;
    const nextController = new AbortController();
    controller.current = nextController;
    setError(null);
    setLoading((current) => (overview ? current : true));
    setRefreshing(Boolean(overview));

    try {
      const nextOverview = await getAutoReportOverview(
        currentWorkspaceId,
        nextController.signal,
      );
      if (requestId.current !== nextRequestId) return;
      setOverview(nextOverview);
      setSelectedReport((current) => {
        if (!current) return null;
        return nextOverview.recent_reports.some(
          (report) => report.report_id === current.report_id,
        )
          ? current
          : null;
      });
    } catch (requestError) {
      if (requestId.current !== nextRequestId || isAbortError(requestError)) return;
      setError(errorMessage(requestError));
    } finally {
      if (requestId.current === nextRequestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [overview, workspaceId]);

  useEffect(() => {
    setOverview(null);
    setSelectedReport(null);
    setProcessingSource(null);
    setProcessingStartedAt(null);
    void refresh();
    return () => {
      requestId.current += 1;
      controller.current?.abort();
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!processingSource || processingStartedAt === null) return;
    const latest = overview?.latest_report;
    if (
      !latest ||
      latest.status === "running" ||
      latest.primary_source?.source_id !== processingSource.source_id
    ) {
      return;
    }

    const createdAt = Date.parse(latest.created_at);
    if (!Number.isNaN(createdAt) && createdAt >= processingStartedAt - 30_000) {
      setProcessingSource(null);
      setProcessingStartedAt(null);
    }
  }, [overview, processingSource, processingStartedAt]);

  useEffect(() => {
    // Keep pages opened during a scheduler run in sync as well as manual runs.
    const reportIsRunning = overview?.latest_report?.status === "running";
    const extractionIsRunning = ["pending", "running"].includes(
      overview?.latest_report?.dashboard_extraction?.status ?? "",
    );
    if (!workspaceId || (!processingSource && !reportIsRunning && !extractionIsRunning)) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [
    overview?.latest_report?.dashboard_extraction?.status,
    overview?.latest_report?.status,
    processingSource,
    refresh,
    workspaceId,
  ]);

  const selectReport = useCallback(
    async (report: AutoReport) => {
      if (!workspaceId) return;
      const detail = await getAutoReport(workspaceId, report.report_id);
      setSelectedReport(detail);
    },
    [workspaceId],
  );

  const runNow = useCallback(async () => {
    if (!workspaceId) return null;
    setRunning(true);
    try {
      const result = await runAutoReportNow(workspaceId);
      if (result.status === "scheduled" || result.status === "created") {
        setProcessingSource(result.source ?? null);
        setProcessingStartedAt(result.source ? Date.now() : null);
      }
      await refresh();
      return result.status;
    } finally {
      setRunning(false);
    }
  }, [refresh, workspaceId]);

  const savePolicy = useCallback(
    async (enabled: boolean, interval: string) => {
      if (!workspaceId) return false;
      const intervalSeconds = Number(interval);
      if (
        !Number.isInteger(intervalSeconds) ||
        intervalSeconds < 60 ||
        intervalSeconds > 86_400
      ) {
        throw new Error("Use an interval between 60 seconds and 24 hours.");
      }

      setSaving(true);
      try {
        const policy = await updateAutoReportPolicy(workspaceId, {
          enabled,
          interval_seconds: intervalSeconds,
        });
        setOverview((current) =>
          current ? { ...current, automation: policy } : current,
        );
        return true;
      } finally {
        setSaving(false);
      }
    },
    [workspaceId],
  );

  const download = useCallback(
    async (reportId: string) => {
      if (!workspaceId) return;
      const { url } = await getAutoReportPdf(workspaceId, reportId);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [workspaceId],
  );

  return {
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
    clearSelection: () => setSelectedReport(null),
  };
}
