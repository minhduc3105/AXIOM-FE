import type {
  ToolCatalogFilters,
  ToolCatalogResponse,
  ToolDetailResponse,
} from "../model/types";

export const methodsHubApiBaseUrl =
  import.meta.env.VITE_METHODS_HUB_API_BASE_URL ?? "/methods-hub";

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
