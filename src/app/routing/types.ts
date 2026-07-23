export type AppSurface = "chat" | "ingestion";

export type AppRoute =
  | { surface: "chat"; sessionId: string | null }
  | { surface: "ingestion"; sessionId: null };
