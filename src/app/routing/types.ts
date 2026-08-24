export type AppSurface =
  | "chat"
  | "data"
  | "reports"
  | "tools"
  | "memory"
  | "models"
  | "settings"
  | "organization";

export type OrganizationAdministrationTab = "overview" | "workspaces" | "members";

export type AppRoute =
  | { surface: "chat"; page: "compose"; sessionId: null }
  | { surface: "chat"; page: "conversation"; sessionId: string }
  | { surface: "data"; page: "dashboard"; sessionId: null }
  | {
      surface: "data";
      page: "document";
      objectKey: string;
      bucket: string;
      filename: string | null;
      documentId: string | null;
      sourceLabel: string;
      sessionId: null;
    }
  | { surface: "reports"; sessionId: null }
  | {
      surface: "tools";
      page: "list" | "detail";
      toolName: string | null;
      sessionId: null;
    }
  | { surface: "memory"; sessionId: null }
  | { surface: "models"; sessionId: null }
  | { surface: "settings"; sessionId: null }
  | { surface: "organization"; tab: OrganizationAdministrationTab; sessionId: null };
