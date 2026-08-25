import type {
  ConversationListResponse,
  ConversationSummary,
  MessageListResponse,
} from "@/shared/types/intelligence";
import { authFetch } from "@/features/auth/model/authFetch";

const gatewayApiBaseUrl = (
  import.meta.env.VITE_AXIOM_GATEWAY_API_URL || ""
).replace(/\/$/, "");
const INTELLIGENCE_API_BASE_URL =
  `${gatewayApiBaseUrl}/intelligence-service`.replace(/\/$/, "");

export class IntelligenceApiError extends Error {
  readonly code: string | null;
  readonly retryable: boolean | null;
  readonly cause: unknown;

  constructor(
    message: string,
    readonly status: number,
    {
      code = null,
      retryable = null,
      cause = null,
    }: {
      code?: string | null;
      retryable?: boolean | null;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "IntelligenceApiError";
    this.code = code;
    this.retryable = retryable;
    this.cause = cause;
  }
}

export function intelligenceApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${INTELLIGENCE_API_BASE_URL}${normalizedPath}`;
}

type ListConversationsOptions = {
  page?: number;
  limit?: number;
};

export async function listConversationsPage(
  options: ListConversationsOptions = {},
  signal?: AbortSignal,
): Promise<ConversationListResponse> {
  const params = new URLSearchParams();
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  const query = params.toString();

  const response = await authFetch(
    intelligenceApiUrl(`/api/v1/conversations${query ? `?${query}` : ""}`),
    { signal },
  );
  if (!response.ok) {
    throw await intelligenceApiError(response);
  }
  return (await response.json()) as ConversationListResponse;
}

export async function listConversations(signal?: AbortSignal) {
  const payload = await listConversationsPage({}, signal);
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function createConversation(
  title?: string,
  signal?: AbortSignal,
): Promise<ConversationSummary> {
  const response = await authFetch(
    intelligenceApiUrl("/api/v1/conversations"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || null }),
      signal,
    },
  );
  if (!response.ok) {
    throw await intelligenceApiError(response);
  }
  return (await response.json()) as ConversationSummary;
}

export type ConversationUpdate = {
  title?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
};

export async function updateConversation(
  conversationId: string,
  update: ConversationUpdate,
  signal?: AbortSignal,
): Promise<ConversationSummary> {
  const response = await authFetch(
    intelligenceApiUrl(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
      signal,
    },
  );
  if (!response.ok) {
    throw new IntelligenceApiError(`AXIOM returned ${response.status}.`, response.status);
  }
  return (await response.json()) as ConversationSummary;
}

export async function deleteConversation(
  conversationId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await authFetch(
    intelligenceApiUrl(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
    ),
    { method: "DELETE", signal },
  );
  if (!response.ok) {
    throw new IntelligenceApiError(`AXIOM returned ${response.status}.`, response.status);
  }
}

export async function listConversationMessages(
  conversationId: string,
  signal?: AbortSignal,
) {
  const response = await authFetch(
    intelligenceApiUrl(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    ),
    { signal },
  );
  if (!response.ok) {
    throw await intelligenceApiError(response);
  }
  const payload = (await response.json()) as MessageListResponse;
  return Array.isArray(payload.items) ? payload.items : [];
}

async function intelligenceApiError(response: Response) {
  const fallback = `AXIOM returned ${response.status}.`;
  try {
    const text = await response.text();
    if (!text) return new IntelligenceApiError(fallback, response.status);

    try {
      const payload = asRecord(JSON.parse(text));
      const error = asRecord(payload.error);
      const detail = asRecord(payload.detail);
      return new IntelligenceApiError(fallback, response.status, {
        code:
          stringValue(error.code) ||
          stringValue(detail.code) ||
          stringValue(payload.code) ||
          null,
        retryable:
          booleanValue(error.retryable) ??
          booleanValue(detail.retryable) ??
          booleanValue(payload.retryable) ??
          null,
        cause:
          stringValue(error.message) ||
          stringValue(detail.message) ||
          stringValue(payload.message) ||
          text,
      });
    } catch {
      return new IntelligenceApiError(fallback, response.status, { cause: text });
    }
  } catch {
    return new IntelligenceApiError(fallback, response.status, { cause: fallback });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}
