import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAutoReport,
  getAutoReportOverview,
  getAutoReportPdf,
  listAutoReports,
  runAutoReportNow,
  updateAutoReportPolicy,
  type AutoReport,
  type AutoReportDetail,
  type AutoReportPagination,
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
  historyReports: AutoReport[];
  historyPagination: AutoReportPagination | null;
  historyLoading: boolean;
  error: string | null;
  refresh: (page?: number) => Promise<void>;
  selectReport: (report: AutoReport) => Promise<void>;
  changeHistoryPage: (page: number) => Promise<void>;
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
  const [historyReports, setHistoryReports] = useState<AutoReport[]>([]);
  const [historyPagination, setHistoryPagination] =
    useState<AutoReportPagination | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overviewRef = useRef<AutoReportOverview | null>(null);
  const historyPageRef = useRef(1);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const historyRequestId = useRef(0);
  const historyController = useRef<AbortController | null>(null);

  const loadHistoryPage = useCallback(
    async (page: number) => {
      const currentWorkspaceId = workspaceId;
      historyController.current?.abort();
      if (!currentWorkspaceId) {
        historyRequestId.current += 1;
        setHistoryReports([]);
        setHistoryPagination(null);
        setHistoryLoading(false);
        return;
      }

      const nextRequestId = ++historyRequestId.current;
      const nextController = new AbortController();
      historyController.current = nextController;
      setHistoryLoading(true);

      try {
        const result = await listAutoReports(
          currentWorkspaceId,
          page,
          nextController.signal,
        );
        if (historyRequestId.current !== nextRequestId) return;
        setHistoryReports(result.items);
        setHistoryPagination(result.pagination);
        historyPageRef.current = result.pagination.page;
      } catch (requestError) {
        if (
          historyRequestId.current !== nextRequestId ||
          isAbortError(requestError)
        ) {
          return;
        }
        setError(errorMessage(requestError));
      } finally {
        if (historyRequestId.current === nextRequestId) {
          setHistoryLoading(false);
        }
      }
    },
    [workspaceId],
  );

  const refresh = useCallback(async (page = historyPageRef.current) => {
    const currentWorkspaceId = workspaceId;
    controller.current?.abort();
    if (!currentWorkspaceId) {
      requestId.current += 1;
      setOverview(null);
      setSelectedReport(null);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      void loadHistoryPage(1);
      return;
    }

    const nextRequestId = ++requestId.current;
    const nextController = new AbortController();
    controller.current = nextController;
    setError(null);
    setLoading((current) => (overviewRef.current ? current : true));
    setRefreshing(Boolean(overviewRef.current));
    void loadHistoryPage(page);

    try {
      const nextOverview = await getAutoReportOverview(
        currentWorkspaceId,
        nextController.signal,
      );
      if (requestId.current !== nextRequestId) return;
      overviewRef.current = nextOverview;
      setOverview(nextOverview);
    } catch (requestError) {
      if (requestId.current !== nextRequestId || isAbortError(requestError)) return;
      setError(errorMessage(requestError));
    } finally {
      if (requestId.current === nextRequestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loadHistoryPage, workspaceId]);

  useEffect(() => {
    setOverview(null);
    overviewRef.current = null;
    setSelectedReport(null);
    setProcessingSource(null);
    setProcessingStartedAt(null);
    setHistoryReports([]);
    setHistoryPagination(null);
    setHistoryLoading(false);
    historyPageRef.current = 1;
    void refresh(1);
    return () => {
      requestId.current += 1;
      controller.current?.abort();
      historyRequestId.current += 1;
      historyController.current?.abort();
    };
  }, [refresh, workspaceId]);

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

  const changeHistoryPage = useCallback(
    async (page: number) => {
      const totalPages = historyPagination?.total_pages ?? 0;
      if (
        !workspaceId ||
        page < 1 ||
        (totalPages > 0 && page > totalPages) ||
        page === historyPagination?.page
      ) {
        return;
      }
      await loadHistoryPage(page);
    },
    [historyPagination, loadHistoryPage, workspaceId],
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
    historyReports,
    historyPagination,
    historyLoading,
    error,
    refresh,
    selectReport,
    changeHistoryPage,
    runNow,
    savePolicy,
    download,
    clearSelection: () => setSelectedReport(null),
  };
}
