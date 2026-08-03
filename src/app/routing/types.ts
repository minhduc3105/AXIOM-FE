export type AppSurface =
  | "chat"
  | "data"
  | "reports"
  | "tools"
  | "models"
  | "settings";

export type AppRoute =
  | { surface: "chat"; page: "home" | "compose"; sessionId: null }
  | { surface: "chat"; page: "conversation"; sessionId: string }
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
    }
  | { surface: "models"; sessionId: null }
  | { surface: "settings"; page: "models" | "memory"; sessionId: null };
