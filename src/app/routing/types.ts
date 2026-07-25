export type AppSurface = "chat" | "ingestion" | "reports";

export type AppRoute =
  | { surface: "chat"; sessionId: string | null }
  | { surface: "ingestion"; sessionId: null }
  | { surface: "reports"; sessionId: null };
