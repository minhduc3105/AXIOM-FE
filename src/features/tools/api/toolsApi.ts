import { authFetch } from "@/features/auth/model/authFetch";
import {
  getToolSubscriptions,
  ToolSubscriptionsError,
  toolSubscriptionsUrl,
  type ToolSubscriptions,
} from "./toolSubscriptionsApi";
import type {
  ToolCatalogFilters,
  ToolCatalogResponse,
  ToolDetailResponse,
  AllToolsEnabledResponse,
  ToolEnabledResponse,
} from "../model/types";

export const methodsHubApiBaseUrl =
  import.meta.env.VITE_METHODS_HUB_API_BASE_URL ?? "/methods-hub";

type ToolsRequestOperation = "catalog" | "tool_detail" | "tool_status";

export type ToolsErrorKind =
  | "methods_hub_unavailable"
  | "tool_not_found"
  | "request_failed";

export class ToolsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly operation: ToolsRequestOperation,
  ) {
    super(message);
    this.name = "ToolsApiError";
  }
}

export function getToolsErrorKind(error: unknown): ToolsErrorKind {
  if (error instanceof ToolSubscriptionsError) return "request_failed";
  if (!(error instanceof ToolsApiError)) return "methods_hub_unavailable";
  if (error.operation === "tool_detail" && error.status === 404)
    return "tool_not_found";
  if (error.status >= 500) return "methods_hub_unavailable";
  return "request_failed";
}

async function getJson<T>(
  url: string,
  signal: AbortSignal,
  operation: Exclude<ToolsRequestOperation, "tool_status">,
): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ? ` ${body.detail}` : "";
    } catch {
      detail = "";
    }
    throw new ToolsApiError(
      `Methods-Hub request failed (${response.status}).${detail}`,
      response.status,
      operation,
    );
  }

  return response.json() as Promise<T>;
}

async function readErrorDetail(response: Response) {
  try {
    const body = (await response.json()) as {
      detail?: string;
      message?: string;
    };
    return body.detail || body.message || "";
  } catch {
    return "";
  }
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const response = await authFetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ToolsApiError(
      `Organization tool registration failed (${response.status}).${detail ? ` ${detail}` : ""}`,
      response.status,
      "tool_status",
    );
  }

  return response.json() as Promise<T>;
}

export async function listTools(
  filters: ToolCatalogFilters,
  signal: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  const queryString = params.toString();
  const [catalog, subscriptions] = await Promise.all([
    getJson<ToolCatalogResponse>(
      `${methodsHubApiBaseUrl}/api/v1/tools${queryString ? `?${queryString}` : ""}`,
      signal,
      "catalog",
    ),
    getToolSubscriptions(signal),
  ]);
  const registered = new Set(subscriptions.tool_names);
  return {
    ...catalog,
    tools: catalog.tools.map((tool) => ({
      ...tool,
      enabled: registered.has(tool.name),
    })),
  };
}

export async function getTool(toolName: string, signal: AbortSignal) {
  const detail = await getJson<ToolDetailResponse>(
    `${methodsHubApiBaseUrl}/api/v1/tools/${encodeURIComponent(toolName)}`,
    signal,
    "tool_detail",
  );
  const subscriptions = await getToolSubscriptions(signal);
  return {
    ...detail,
    tool: {
      ...detail.tool,
      enabled: subscriptions.tool_names.includes(detail.tool.name),
    },
  };
}

export async function updateToolEnabled(
  toolName: string,
  enabled: boolean,
): Promise<ToolEnabledResponse> {
  const result = await patchJson<ToolSubscriptions>(toolSubscriptionsUrl, {
    tool_names: [toolName],
    enabled,
  });
  return {
    tool_name: toolName,
    enabled: result.tool_names.includes(toolName),
    scope: "organization",
    persistent: true,
  };
}

export async function updateAllToolsEnabled(
  enabled: boolean,
  names: string[],
): Promise<AllToolsEnabledResponse> {
  const result = await patchJson<ToolSubscriptions>(toolSubscriptionsUrl, {
    tool_names: names,
    enabled,
  });
  return {
    enabled,
    tool_names: result.tool_names,
    scope: "organization",
    persistent: true,
  };
}
