import type { AppRoute } from "./types";

const ROUTE_SEGMENTS = {
  chat: "chat",
  data: "data",
  reports: "reports",
  tools: "tools",
} as const;

export function parseAppRoute(pathname: string): AppRoute {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === ROUTE_SEGMENTS.data) {
    return {
      surface: "data",
      page: segments[1] === "ingestion" ? "ingestion" : "dashboard",
      sessionId: null,
    };
  }

  if (segments[0] === "ingest") {
    return { surface: "data", page: "ingestion", sessionId: null };
  }

  if (segments[0] === ROUTE_SEGMENTS.reports) {
    return { surface: "reports", sessionId: null };
  }

  if (segments[0] === ROUTE_SEGMENTS.tools) {
    const toolName = segments[1] ? decodeURIComponent(segments[1]) : null;
    return {
      surface: "tools",
      page: toolName ? "detail" : "list",
      toolName,
      sessionId: null,
    };
  }

  if (segments[0] === ROUTE_SEGMENTS.chat) {
    return { surface: "chat", sessionId: segments[1] ?? null };
  }

  return { surface: "chat", sessionId: null };
}

export function getAppRoutePath(route: AppRoute) {
  if (route.surface === "data") {
    return route.page === "ingestion"
      ? `/${ROUTE_SEGMENTS.data}/ingestion`
      : `/${ROUTE_SEGMENTS.data}`;
  }
  if (route.surface === "reports") return `/${ROUTE_SEGMENTS.reports}`;
  if (route.surface === "tools") {
    return route.page === "detail" && route.toolName
      ? `/${ROUTE_SEGMENTS.tools}/${encodeURIComponent(route.toolName)}`
      : `/${ROUTE_SEGMENTS.tools}`;
  }
  return route.sessionId
    ? `/${ROUTE_SEGMENTS.chat}/${route.sessionId}`
    : `/${ROUTE_SEGMENTS.chat}`;
}

export function createChatRoute(sessionId: string | null = null): AppRoute {
  return { surface: "chat", sessionId };
}

export function createDataRoute(): AppRoute {
  return { surface: "data", page: "dashboard", sessionId: null };
}

export function createDataIngestionRoute(): AppRoute {
  return { surface: "data", page: "ingestion", sessionId: null };
}

export function createReportsRoute(): AppRoute {
  return { surface: "reports", sessionId: null };
}

export function createToolsRoute(): AppRoute {
  return { surface: "tools", page: "list", toolName: null, sessionId: null };
}

export function createToolDetailRoute(toolName: string): AppRoute {
  return {
    surface: "tools",
    page: "detail",
    toolName,
    sessionId: null,
  };
}
