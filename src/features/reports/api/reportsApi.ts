import { authFetch } from "@/features/auth/model/authFetch";
import { intelligenceApiUrl } from "@/shared/lib/intelligence-api";
import type { ReportDashboardSnapshot } from "../model/types";

export type AutoReportPolicy = {
  organization_id: string;
  workspace_id: string;
  enabled: boolean;
  interval_seconds: number;
  next_due_at: string | null;
  last_checked_at: string | null;
  consecutive_failures: number;
};

export type AutoReportSource = {
  source_id: string;
  document_id: string | null;
  object_key: string;
  filename: string;
  content_type: string | null;
  source_last_modified: string | null;
  role: "primary" | "related";
};

export type AutoReport = {
  report_id: string;
  status: "completed" | "failed" | "running" | "skipped";
  created_at: string;
  completed_at: string | null;
  title: string | null;
  summary: string | null;
  report_available: boolean;
  primary_source: AutoReportSource | null;
  related_source_count: number;
};

export type AutoReportDashboardExtraction = {
  extraction_id: string;
  report_id: string;
  status: "pending" | "running" | "completed" | "failed";
  attempt_count: number;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type AutoReportDetail = AutoReport & {
  sources: AutoReportSource[];
  error_code: string | null;
  error_message: string | null;
  dashboard: ReportDashboardSnapshot | null;
  dashboard_extraction: AutoReportDashboardExtraction | null;
};

export type AutoReportOverview = {
  latest_report: AutoReportDetail | null;
  recent_reports: AutoReport[];
  dashboard: ReportDashboardSnapshot | null;
  dashboard_extraction: AutoReportDashboardExtraction | null;
  freshness: {
    newest_source_last_modified: string | null;
    dashboard_generated_at: string | null;
    is_current: boolean;
  };
  automation: AutoReportPolicy;
};

export type AutoReportPagination = {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export type AutoReportListResponse = {
  items: AutoReport[];
  pagination: AutoReportPagination;
};

export const AUTO_REPORT_PAGE_SIZE = 5;

export type AutoReportRun = {
  status:
    | "scheduled"
    | "created"
    | "skipped_no_source"
    | "skipped_no_unprocessed_source"
    | "skipped_already_processed"
    | "already_running"
    | "failed";
  report_id: string | null;
  error_code: string | null;
  source: AutoReportSource | null;
};

class ReportsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ReportsApiError";
  }
}

function reportPath(workspaceId: string, suffix = "") {
  return intelligenceApiUrl(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/auto-reports${suffix}`,
  );
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      detail?: string;
    };
    throw new ReportsApiError(
      payload.detail || `Reports request failed (${response.status}).`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export function getAutoReportPolicy(workspaceId: string) {
  return request<AutoReportPolicy>(reportPath(workspaceId, "/policy"));
}

export function updateAutoReportPolicy(
  workspaceId: string,
  policy: Pick<AutoReportPolicy, "enabled" | "interval_seconds">,
) {
  return request<AutoReportPolicy>(reportPath(workspaceId, "/policy"), {
    method: "PUT",
    body: JSON.stringify(policy),
  });
}

export function runAutoReportNow(workspaceId: string, sourceIds?: string[]) {
  return request<AutoReportRun>(reportPath(workspaceId, "/runs"), {
    method: "POST",
    ...(sourceIds ? { body: JSON.stringify({ source_ids: sourceIds }) } : {}),
  });
}

export function listAutoReports(
  workspaceId: string,
  page = 1,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(AUTO_REPORT_PAGE_SIZE),
  });
  return request<AutoReportListResponse>(
    reportPath(workspaceId, `?${params.toString()}`),
    { signal },
  );
}

export function getAutoReportOverview(
  workspaceId: string,
  signal?: AbortSignal,
) {
  return request<AutoReportOverview>(reportPath(workspaceId, "/overview"), {
    signal,
  });
}

export function getAutoReport(
  workspaceId: string,
  reportId: string,
  signal?: AbortSignal,
) {
  return request<AutoReportDetail>(
    reportPath(workspaceId, `/${encodeURIComponent(reportId)}`),
    { signal },
  );
}

export function getAutoReportPdf(workspaceId: string, reportId: string) {
  return request<{ url: string; expires_in: number }>(
    reportPath(workspaceId, `/${encodeURIComponent(reportId)}/pdf`),
  );
}
