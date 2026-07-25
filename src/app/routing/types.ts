export type AppSurface = "chat" | "data" | "reports";

export type AppRoute =
  | { surface: "chat"; sessionId: string | null }
  | {
      surface: "data";
      page: "dashboard" | "ingestion";
      sessionId: null;
    }
  | { surface: "reports"; sessionId: null };
