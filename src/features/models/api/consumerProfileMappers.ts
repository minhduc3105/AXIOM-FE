import {
  consumerProfileConsumers,
  modelRoles,
  type ConsumerId,
  type ConsumerModelProfilesView,
  type ConsumerProfileBatchResponse,
  type ConsumerProfile,
  type ConsumerRole,
  type ConsumerRoleStatus,
  type ModelRole,
} from "./consumerProfileContract";

const consumerIds = new Set<ConsumerId>(consumerProfileConsumers.map((item) => item.id));
const statuses = new Set<ConsumerRoleStatus>([
  "assigned",
  "unconfigured",
  "unavailable",
  "not_used",
  "conflict",
]);

function toConsumerId(value: unknown): ConsumerId {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/_/g, "-");
  if (
    normalized === "sdk" ||
    normalized === "system" ||
    normalized === "data-intelligence-sdk" ||
    normalized === "data-intelligence-api" ||
    normalized === "genreport" ||
    normalized === "gen-report" ||
    normalized === "intent-service" ||
    normalized === "methods-hub" ||
    normalized === "intelligence-service"
  ) {
    return "data-intelligence";
  }
  if (consumerIds.has(normalized as ConsumerId)) return normalized as ConsumerId;
  throw new Error(`Unknown Model Service consumer: ${String(value)}`);
}

function toRole(value: unknown): ModelRole {
  const role = String(value ?? "").trim().toLowerCase() as ModelRole;
  if (modelRoles.includes(role)) return role;
  throw new Error(`Unknown Model Service role: ${String(value)}`);
}

export function normalizeConsumerRole(value: unknown): ConsumerRole {
  const source = (value ?? {}) as Record<string, unknown>;
  const provider = typeof source.provider_id === "string" ? source.provider_id : null;
  const model = typeof source.model_id === "string" ? source.model_id : null;
  const statusValue = String(source.status ?? (provider && model ? "assigned" : "unconfigured")) as ConsumerRoleStatus;
  return {
    role: toRole(source.role),
    status: statuses.has(statusValue) ? statusValue : "unavailable",
    required: source.required === true,
    used: source.used === true,
    provider_id: provider,
    model_id: model,
    features: typeof source.features === "object" && source.features !== null
      ? (source.features as Record<string, boolean | null>)
      : {},
    required_features: Array.isArray(source.required_features)
      ? source.required_features.filter((item): item is string => typeof item === "string")
      : [],
    reason: typeof source.reason === "string" ? source.reason : null,
    inherited: source.inherited === true,
    source_consumer_id:
      source.source_consumer_id == null ? null : toConsumerId(source.source_consumer_id),
    warning: typeof source.warning === "string" ? source.warning : null,
  };
}

export function normalizeConsumerProfile(value: unknown): ConsumerProfile {
  const source = (value ?? {}) as Record<string, unknown>;
  const consumerId = toConsumerId(source.consumer_id);
  const roles = Array.isArray(source.roles) ? source.roles.map(normalizeConsumerRole) : [];
  const byRole = new Map(roles.map((role) => [role.role, role]));
  const expectedRoles: ModelRole[] = consumerId === "de-rd"
    ? ["llm", "vlm", "embedding", "ocr"]
    : ["llm", "vlm", "embedding"];
  return {
    consumer_id: consumerId,
    display_name: typeof source.display_name === "string" ? source.display_name : consumerId,
    roles: expectedRoles.map((role) => byRole.get(role) ?? {
      role,
      status: "not_used",
      required: false,
      used: false,
      provider_id: null,
      model_id: null,
      features: {},
      required_features: [],
      reason: null,
    }),
  };
}

export function normalizeConsumerProfiles(value: unknown): ConsumerModelProfilesView {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    organization_id: String(source.organization_id ?? ""),
    revision: Number.isFinite(source.revision) ? Number(source.revision) : 0,
    profiles: Array.isArray(source.profiles) ? source.profiles.map(normalizeConsumerProfile) : [],
  };
}

export function normalizeConsumerProfileBatchResponse(value: unknown): ConsumerProfileBatchResponse {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    ...normalizeConsumerProfiles(source),
    changed: source.changed === true,
    changed_keys: Array.isArray(source.changed_keys)
      ? source.changed_keys.filter((key): key is string => typeof key === "string")
      : [],
  };
}
