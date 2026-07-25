import type {
  ConversationListResponse,
  ConversationSummary,
  MessageListResponse,
} from "@/shared/types/intelligence";

const INTELLIGENCE_API_BASE_URL = (
  import.meta.env.VITE_AXIOM_GATEWAY_API_URL || "/intelligence-service"
).replace(/\/$/, "");

export function intelligenceApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${INTELLIGENCE_API_BASE_URL}${normalizedPath}`;
}

export async function listConversations(signal?: AbortSignal) {
  const response = await fetch(intelligenceApiUrl("/api/v1/conversations"), {
    signal,
  });
  if (!response.ok) {
    throw new Error(`AXIOM returned ${response.status}.`);
  }
  const payload = (await response.json()) as ConversationListResponse;
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function createConversation(
  title?: string,
  signal?: AbortSignal,
): Promise<ConversationSummary> {
  const response = await fetch(intelligenceApiUrl("/api/v1/conversations"), {
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
  const response = await fetch(
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
