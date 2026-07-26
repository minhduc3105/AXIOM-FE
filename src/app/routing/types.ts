export type AppSurface = "chat" | "data" | "reports" | "tools";

export type AppRoute =
  | { surface: "chat"; sessionId: string | null }
  | {
      surface: "data";
      page: "dashboard" | "ingestion";
      sessionId: null;
    }
  | { surface: "reports"; sessionId: null }
  | {
      surface: "tools";
      page: "list" | "detail";
      toolName: string | null;
      sessionId: null;
    };
