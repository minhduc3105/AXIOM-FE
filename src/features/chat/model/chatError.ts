export type ChatErrorKind =
  | "busy"
  | "unavailable"
  | "network"
  | "timeout"
  | "permission"
  | "cancelled"
  | "unknown";

export type ChatError = {
  kind: ChatErrorKind;
  message: string;
  status: number | null;
  code: string | null;
  retryable: boolean;
  cause: unknown;
};

const messages: Record<ChatErrorKind, string> = {
  busy: "Chat is busy right now. Please try again in a moment.",
  unavailable: "Chat is temporarily unavailable. Please try again in a moment.",
  network: "We couldn’t reach the chat service. Check your connection and try again.",
  timeout: "The response took too long. Please try again.",
  permission: "You don’t have permission to use chat in this workspace.",
  cancelled: "That response was stopped.",
  unknown: "Chat couldn’t complete that response. Please try again.",
};

export function getChatError(error: unknown): ChatError {
  const status = statusFrom(error);
  const code = codeFrom(error);
  const retryable = retryableFrom(error);
  const normalizedMessage = error instanceof Error ? error.message.toLowerCase() : "";
  const kind: ChatErrorKind =
    code === "cancelled" || code === "canceled"
      ? "cancelled"
      : code === "runtime_unavailable"
        ? "unavailable"
        : status === 429 || status === 502 || status === 503
      ? "busy"
      : status === 408 || status === 504 || /timeout|timed out/.test(normalizedMessage)
        ? "timeout"
        : status === 401 || status === 403
          ? "permission"
          : error instanceof TypeError || /failed to fetch|network/.test(normalizedMessage)
            ? "network"
            : "unknown";

  return {
    kind,
    message: messages[kind],
    status,
    code,
    retryable: retryable ?? defaultRetryability(kind),
    cause: causeFrom(error),
  };
}

function statusFrom(error: unknown) {
  if (!isRecord(error) || typeof error.status !== "number") return null;
  return Number.isFinite(error.status) ? error.status : null;
}

function codeFrom(error: unknown) {
  if (!isRecord(error) || typeof error.code !== "string") return null;
  return error.code || null;
}

function retryableFrom(error: unknown) {
  if (!isRecord(error) || typeof error.retryable !== "boolean") return null;
  return error.retryable;
}

function defaultRetryability(kind: ChatErrorKind) {
  return !["permission", "cancelled", "unknown"].includes(kind);
}

function causeFrom(error: unknown) {
  if (!isRecord(error) || !("cause" in error)) return error;
  return error.cause;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
