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
    throw new Error(`AXIOM returned ${response.status}.`);
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
  const response = await authFetch(intelligenceApiUrl("/api/v1/conversations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title || null }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`AXIOM returned ${response.status}.`);
  }
  return (await response.json()) as ConversationSummary;
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
    throw new Error(`AXIOM returned ${response.status}.`);
  }
  const payload = (await response.json()) as MessageListResponse;
  return Array.isArray(payload.items) ? payload.items : [];
}
