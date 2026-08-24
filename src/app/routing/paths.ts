import type { AppRoute } from "./types";

const ROUTE_SEGMENTS = {
  chat: "chat",
  data: "data",
  reports: "reports",
  memory: "memory",
  settings: "settings",
  organization: "organization",
  tools: "tools",
  models: "models",
} as const;

export function parseAppRoute(pathname: string, search = ""): AppRoute {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === ROUTE_SEGMENTS.data) {
    if (segments[1] === "document" && segments[2]) {
      const params = new URLSearchParams(search);
      return createDataDocumentRoute({
        objectKey: decodeURIComponent(segments[2]),
        bucket: params.get("bucket") ?? "",
        filename: params.get("filename"),
        documentId: params.get("document_id"),
        sourceLabel: params.get("source") ?? "Uploaded files",
      });
    }
    if (segments[1] === "ingestion") {
      return createDataRoute();
    }
    return {
      surface: "data",
      page: "dashboard",
      sessionId: null,
    };
  }

  if (segments[0] === "ingest") {
    return createDataRoute();
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

  if (segments[0] === ROUTE_SEGMENTS.memory) {
    return { surface: "memory", sessionId: null };
  }

  if (segments[0] === ROUTE_SEGMENTS.settings) {
    return { surface: "settings", sessionId: null };
  }

  if (segments[0] === ROUTE_SEGMENTS.organization) {
    if (!segments[1]) return { surface: "organization", tab: "overview", sessionId: null };
    if (["overview", "workspaces", "members"].includes(segments[1])) {
      return { surface: "organization", tab: segments[1] as "overview" | "workspaces" | "members", sessionId: null };
    }
  }

  if (segments[0] === ROUTE_SEGMENTS.chat) {
    return segments[1]
      ? { surface: "chat", page: "conversation", sessionId: segments[1] }
      : { surface: "chat", page: "compose", sessionId: null };
  }

  return { surface: "chat", page: "compose", sessionId: null };
}

export function getAppRoutePath(route: AppRoute) {
  if (route.surface === "data") {
    if (route.page === "document") {
      const params = new URLSearchParams({
        bucket: route.bucket,
        source: route.sourceLabel,
      });
      if (route.filename) params.set("filename", route.filename);
      if (route.documentId) params.set("document_id", route.documentId);
      return `/${ROUTE_SEGMENTS.data}/document/${encodeURIComponent(route.objectKey)}?${params.toString()}`;
    }
    return `/${ROUTE_SEGMENTS.data}`;
  }
  if (route.surface === "reports") return `/${ROUTE_SEGMENTS.reports}`;
  if (route.surface === "memory") return `/${ROUTE_SEGMENTS.memory}`;
  if (route.surface === "models") return `/${ROUTE_SEGMENTS.models}`;
  if (route.surface === "settings") return `/${ROUTE_SEGMENTS.settings}`;
  if (route.surface === "organization") return route.tab === "overview" ? `/${ROUTE_SEGMENTS.organization}` : `/${ROUTE_SEGMENTS.organization}/${route.tab}`;
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
  return sessionId
    ? { surface: "chat", page: "conversation", sessionId }
    : { surface: "chat", page: "compose", sessionId: null };
}

export function createDataRoute(): AppRoute {
  return { surface: "data", page: "dashboard", sessionId: null };
}

export function createDataDocumentRoute(
  target: {
    objectKey: string;
    bucket: string;
    filename: string | null;
    documentId: string | null;
    sourceLabel: string;
  },
): AppRoute {
  return {
    surface: "data",
    page: "document",
    ...target,
    sessionId: null,
  };
}

export function createReportsRoute(): AppRoute {
  return { surface: "reports", sessionId: null };
}

export function createToolsRoute(): AppRoute {
  return { surface: "tools", page: "list", toolName: null, sessionId: null };
}

export function createMemoryRoute(): AppRoute {
  return { surface: "memory", sessionId: null };
}

export function createModelsRoute(): AppRoute {
  return { surface: "models", sessionId: null };
}

export function createSettingsRoute(): AppRoute {
  return { surface: "settings", sessionId: null };
}

export function createOrganizationRoute(tab: "overview" | "workspaces" | "members" = "overview"): AppRoute {
  return { surface: "organization", tab, sessionId: null };
}

export function createToolDetailRoute(toolName: string): AppRoute {
  return {
    surface: "tools",
    page: "detail",
    toolName,
    sessionId: null,
  };
}
