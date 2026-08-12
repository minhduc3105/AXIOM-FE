export type AppSurface =
  | "chat"
  | "data"
  | "reports"
  | "tools"
  | "models"
  | "memory"
  | "organization";

export type DataIngestionLaunchContext = {
  connector: "s3" | "snowflake" | null;
  profileId: string | null;
};

export type AppRoute =
  | { surface: "chat"; page: "home" | "compose"; sessionId: null }
  | { surface: "chat"; page: "conversation"; sessionId: string }
  | { surface: "data"; page: "dashboard"; sessionId: null }
  | ({
      surface: "data";
      page: "ingestion";
      sessionId: null;
    } & DataIngestionLaunchContext)
  | { surface: "reports"; sessionId: null }
  | {
      surface: "tools";
      page: "list" | "detail";
      toolName: string | null;
      sessionId: null;
    }
  | { surface: "models"; sessionId: null }
  | { surface: "memory"; sessionId: null }
  | { surface: "organization"; sessionId: null };
