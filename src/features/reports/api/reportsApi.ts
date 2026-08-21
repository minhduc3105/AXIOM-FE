import { authFetch } from "@/features/auth/model/authFetch";
import { intelligenceApiUrl } from "@/shared/lib/intelligence-api";

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

export type AutoReportDetail = AutoReport & {
  sources: AutoReportSource[];
  error_code: string | null;
  error_message: string | null;
};

export type AutoReportRun = {
  status:
    | "scheduled"
    | "created"
    | "skipped_no_source"
    | "skipped_already_processed"
    | "already_running"
    | "failed";
  report_id: string | null;
  error_code: string | null;
};

class ReportsApiError extends Error {
  constructor(message: string, readonly status: number) {
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

export function runAutoReportNow(workspaceId: string) {
  return request<AutoReportRun>(reportPath(workspaceId, "/runs"), {
    method: "POST",
  });
}

export function listAutoReports(workspaceId: string) {
  return request<{ items: AutoReport[] }>(reportPath(workspaceId));
}

export function getAutoReport(workspaceId: string, reportId: string) {
  return request<AutoReportDetail>(
    reportPath(workspaceId, `/${encodeURIComponent(reportId)}`),
  );
}

export function getAutoReportPdf(workspaceId: string, reportId: string) {
  return request<{ url: string; expires_in: number }>(
    reportPath(workspaceId, `/${encodeURIComponent(reportId)}/pdf`),
  );
}
