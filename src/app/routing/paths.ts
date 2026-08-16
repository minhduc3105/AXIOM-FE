import type { AppRoute, DataIngestionLaunchContext } from "./types";

const ROUTE_SEGMENTS = {
  chat: "chat",
  data: "data",
  reports: "reports",
  memory: "memory",
  settings: "settings",
  tools: "tools",
  models: "models",
} as const;

export function parseAppRoute(pathname: string, search = ""): AppRoute {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === ROUTE_SEGMENTS.data) {
    if (segments[1] === "ingestion") {
      const params = new URLSearchParams(search);
      const requestedConnector = params.get("connector");
      const connector =
        requestedConnector === "s3" || requestedConnector === "snowflake"
          ? requestedConnector
          : null;
      const profileId = params.get("profile")?.trim() || null;
      return {
        surface: "data",
        page: "ingestion",
        sessionId: null,
        connector,
        profileId,
      };
    }
    return {
      surface: "data",
      page: "dashboard",
      sessionId: null,
    };
  }

  if (segments[0] === "ingest") {
    return {
      surface: "data",
      page: "ingestion",
      sessionId: null,
      connector: null,
      profileId: null,
    };
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
    if (segments[1] === "memory") return { surface: "memory", sessionId: null };
    if (!segments[1]) return { surface: "organization", tab: "overview", sessionId: null };
    if (["overview", "workspaces", "members"].includes(segments[1])) {
      return { surface: "organization", tab: segments[1] as "overview" | "workspaces" | "members", sessionId: null };
    }
    if (segments[1] === ROUTE_SEGMENTS.models) {
      return { surface: "models", sessionId: null };
    }
    if (segments[1]) {
      return { surface: "chat", page: "home", sessionId: null };
    }
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
    if (route.page === "dashboard") return `/${ROUTE_SEGMENTS.data}`;
    const params = new URLSearchParams();
    if (route.connector) params.set("connector", route.connector);
    if (route.profileId) params.set("profile", route.profileId);
    const search = params.toString();
    return `/${ROUTE_SEGMENTS.data}/ingestion${search ? `?${search}` : ""}`;
  }
  if (route.surface === "reports") return `/${ROUTE_SEGMENTS.reports}`;
  if (route.surface === "memory") return `/${ROUTE_SEGMENTS.memory}`;
  if (route.surface === "models") return `/${ROUTE_SEGMENTS.models}`;
  if (route.surface === "organization") return route.tab === "overview" ? `/${ROUTE_SEGMENTS.settings}` : `/${ROUTE_SEGMENTS.settings}/${route.tab}`;
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

export function createDataIngestionRoute(
  context: Partial<DataIngestionLaunchContext> = {},
): AppRoute {
  return {
    surface: "data",
    page: "ingestion",
    sessionId: null,
    connector: context.connector ?? null,
    profileId: context.profileId ?? null,
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
