import type { AppRoute } from "./types";

const ROUTE_SEGMENTS = {
  chat: "chat",
  data: "data",
  reports: "reports",
  settings: "settings",
  tools: "tools",
  models: "models",
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

  if (segments[0] === ROUTE_SEGMENTS.models) {
    return { surface: "models", sessionId: null };
  }

  if (segments[0] === ROUTE_SEGMENTS.settings) {
    return {
      surface: "settings",
      page: segments[1] === "memory" ? "memory" : "models",
      sessionId: null,
    };
  }

  if (segments[0] === ROUTE_SEGMENTS.chat) {
    return segments[1]
      ? { surface: "chat", page: "conversation", sessionId: segments[1] }
      : { surface: "chat", page: "compose", sessionId: null };
  }

  return { surface: "chat", page: "home", sessionId: null };
}

export function getAppRoutePath(route: AppRoute) {
  if (route.surface === "data") {
    return route.page === "ingestion"
      ? `/${ROUTE_SEGMENTS.data}/ingestion`
      : `/${ROUTE_SEGMENTS.data}`;
  }
  if (route.surface === "reports") return `/${ROUTE_SEGMENTS.reports}`;
  if (route.surface === "models") return `/${ROUTE_SEGMENTS.models}`;
  if (route.surface === "settings") return `/${ROUTE_SEGMENTS.settings}/${route.page}`;
  if (route.surface === "tools") {
    return route.page === "detail" && route.toolName
      ? `/${ROUTE_SEGMENTS.tools}/${encodeURIComponent(route.toolName)}`
      : `/${ROUTE_SEGMENTS.tools}`;
  }
  if (route.page === "home") return "/";
  return route.sessionId
    ? `/${ROUTE_SEGMENTS.chat}/${route.sessionId}`
    : `/${ROUTE_SEGMENTS.chat}`;
}

export function createChatRoute(sessionId: string | null = null): AppRoute {
  return sessionId
    ? { surface: "chat", page: "conversation", sessionId }
    : { surface: "chat", page: "compose", sessionId: null };
}

export function createChatHomeRoute(): AppRoute {
  return { surface: "chat", page: "home", sessionId: null };
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

export function createModelsRoute(): AppRoute {
  return { surface: "models", sessionId: null };
}

export function createMemoryRoute(): AppRoute {
  return { surface: "settings", page: "memory", sessionId: null };
}

export function createToolDetailRoute(toolName: string): AppRoute {
  return {
    surface: "tools",
    page: "detail",
    toolName,
    sessionId: null,
  };
}

export function createModelSettingsRoute(): AppRoute {
  return { surface: "settings", page: "models", sessionId: null };
}
