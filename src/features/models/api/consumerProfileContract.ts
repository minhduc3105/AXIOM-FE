export type ConsumerId =
  | "data-intelligence"
  | "genreport"
  | "de-rd"
  | "intent-service"
  | "methods-hub"
  | "intelligence-service";

export type ModelRole = "llm" | "vlm" | "embedding" | "ocr";
export type ConsumerRoleStatus =
  | "assigned"
  | "unconfigured"
  | "unavailable"
  | "not_used"
  | "conflict";

export type ConsumerRole = {
  role: ModelRole;
  status: ConsumerRoleStatus;
  required: boolean;
  used?: boolean;
  provider_id: string | null;
  model_id: string | null;
  features: Record<string, boolean | null>;
  required_features: string[];
  reason: string | null;
  inherited?: boolean;
  source_consumer_id?: ConsumerId | null;
  warning?: string | null;
};

export type ConsumerProfile = {
  consumer_id: ConsumerId;
  display_name: string;
  roles: ConsumerRole[];
};

export type ConsumerModelProfilesView = {
  organization_id: string;
  revision: number;
  profiles: ConsumerProfile[];
};

export type ConsumerProfileChange = {
  consumer_id: ConsumerId;
  role: ModelRole;
  provider_id: string | null;
  model_id: string | null;
};

export type ConsumerProfileBatchInput = {
  expected_revision: number;
  changes: ConsumerProfileChange[];
};

export type ConsumerProfileBatchResponse = ConsumerModelProfilesView & {
  changed: boolean;
  changed_keys: string[];
};

export const consumerProfileConsumers: readonly {
  id: ConsumerId;
  label: string;
}[] = [
  { id: "data-intelligence", label: "System" },
  { id: "de-rd", label: "DE-RD" },
];

export const modelRoles: readonly ModelRole[] = [
  "llm",
  "vlm",
  "embedding",
  "ocr",
];

export function modelRolesForConsumer(consumerId: ConsumerId): readonly ModelRole[] {
  return consumerId === "de-rd" ? modelRoles : modelRoles.filter((role) => role !== "ocr");
}

export const modelRoleLabels: Record<ModelRole, string> = {
  llm: "LLM",
  vlm: "VLM",
  embedding: "Embedding",
  ocr: "OCR",
};

export const modelServiceRoutes = {
  consumerProfiles: "/api/v2/consumer-model-profiles",
} as const;
