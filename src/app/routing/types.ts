export type AppSurface = "chat" | "data" | "reports";

export type AppRoute =
  | { surface: "chat"; page: "home" | "compose"; sessionId: null }
  | { surface: "chat"; page: "conversation"; sessionId: string }
  | {
      surface: "data";
      page: "dashboard" | "ingestion";
      sessionId: null;
    }
  | { surface: "reports"; sessionId: null };
