import type { AppRoute } from "./types";

const ROUTE_SEGMENTS = {
  chat: "chat",
  ingestion: "ingest",
} as const;

export function parseAppRoute(pathname: string): AppRoute {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === ROUTE_SEGMENTS.ingestion) {
    return { surface: "ingestion", sessionId: null };
  }

  if (segments[0] === ROUTE_SEGMENTS.chat) {
    return { surface: "chat", sessionId: segments[1] ?? null };
  }

  return { surface: "chat", sessionId: null };
}

export function getAppRoutePath(route: AppRoute) {
  if (route.surface === "ingestion") return `/${ROUTE_SEGMENTS.ingestion}`;
  return route.sessionId
    ? `/${ROUTE_SEGMENTS.chat}/${route.sessionId}`
    : `/${ROUTE_SEGMENTS.chat}`;
}

export function createChatRoute(sessionId: string | null = null): AppRoute {
  return { surface: "chat", sessionId };
}

export function createIngestionRoute(): AppRoute {
  return { surface: "ingestion", sessionId: null };
}
