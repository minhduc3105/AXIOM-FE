import type {
  ToolCatalogFilters,
  ToolCatalogResponse,
  ToolDetailResponse,
  ToolEnabledResponse,
} from "../model/types";

export const methodsHubApiBaseUrl =
  import.meta.env.VITE_METHODS_HUB_API_BASE_URL ?? "/methods-hub";

const methodsHubAdminToken = import.meta.env.VITE_METHODS_HUB_ADMIN_TOKEN;

class ToolsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ToolsApiError";
  }
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
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
    );
  }

  return response.json() as Promise<T>;
}

async function readErrorDetail(response: Response) {
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
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
  if (methodsHubAdminToken) {
    headers.Authorization = `Bearer ${methodsHubAdminToken}`;
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ToolsApiError(
      `Methods-Hub request failed (${response.status}).${detail ? ` ${detail}` : ""}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function listTools(
  filters: ToolCatalogFilters,
  signal: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  const queryString = params.toString();
  return getJson<ToolCatalogResponse>(
    `${methodsHubApiBaseUrl}/api/v1/tools${queryString ? `?${queryString}` : ""}`,
    signal,
  );
}

export function getTool(toolName: string, signal: AbortSignal) {
  return getJson<ToolDetailResponse>(
    `${methodsHubApiBaseUrl}/api/v1/tools/${encodeURIComponent(toolName)}`,
    signal,
  );
}

export function updateToolEnabled(
  toolName: string,
  enabled: boolean,
  expectedRevision: number,
) {
  return patchJson<ToolEnabledResponse>(
    `${methodsHubApiBaseUrl}/api/v1/admin/tools/${encodeURIComponent(toolName)}`,
    { enabled, expected_revision: expectedRevision },
  );
}
