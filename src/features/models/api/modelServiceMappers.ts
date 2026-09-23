import type {
  ConnectionStatus,
  ModelCapability,
  ProviderModelView,
  ProviderModelCandidate,
  ProviderView,
  ResourceStatus,
} from "../model/registryTypes";
import type {
  ModelFeatureName,
  ModelFeatureSupport,
  ModelTask,
  TaskAssignment,
} from "./modelServiceContract";

type ApiRecord = Record<string, unknown>;

const capabilities: ModelCapability[] = ["llm", "embedding", "vlm", "reranker"];

function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const featureNames: ModelFeatureName[] = [
  "tools",
  "streaming",
  "structured_output",
  "vision",
];

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : value === null ? null : null;
}

function featureValue(raw: ApiRecord, name: ModelFeatureName): boolean | null {
  // v2 currently publishes flat fields. Accept a nested `features` object as
  // a compatibility path for gateways that already group feature metadata.
  if (Object.prototype.hasOwnProperty.call(raw, name)) {
    return nullableBoolean(raw[name]);
  }
  const nested = isRecord(raw.features) ? raw.features[name] : undefined;
  return nullableBoolean(nested);
}

function modelFeatures(raw: ApiRecord): ModelFeatureSupport {
  return Object.fromEntries(
    featureNames.map((name) => [name, featureValue(raw, name)]),
  ) as ModelFeatureSupport;
}

const emptyFeatures = (): ModelFeatureSupport => ({
  tools: null,
  streaming: null,
  structured_output: null,
  vision: null,
});

function taskStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function normalizeModelTask(value: unknown): ModelTask {
  const raw = isRecord(value) ? value : {};
  return {
    task_id: stringValue(raw.task_id),
    display_name: stringValue(raw.display_name, stringValue(raw.task_id)),
    group: stringValue(raw.group, "other"),
    required_capabilities: taskStringList(raw.required_capabilities),
    required_features: taskStringList(raw.required_features),
    allowed_consumers: taskStringList(raw.allowed_consumers),
    requires_index_profile: raw.requires_index_profile === true,
    vision_optional: raw.vision_optional === true,
    consumer_id: typeof raw.consumer_id === "string" ? raw.consumer_id : null,
    role: typeof raw.role === "string" ? raw.role : null,
  };
}

export function normalizeTaskAssignment(value: unknown): TaskAssignment {
  const raw = isRecord(value) ? value : {};
  const status = raw.status === "assigned" || raw.status === "unavailable" || raw.status === "conflict"
    ? raw.status
    : "unconfigured";
  const nestedFeatures = isRecord(raw.features) ? raw.features : null;
  return {
    task_id: stringValue(raw.task_id),
    provider_id: typeof raw.provider_id === "string" ? raw.provider_id : null,
    model_id: typeof raw.model_id === "string" ? raw.model_id : null,
    assignment_revision: numberValue(raw.assignment_revision),
    status,
    reason: typeof raw.reason === "string" ? raw.reason : null,
    features: {
      ...emptyFeatures(),
      ...(nestedFeatures
        ? Object.fromEntries(
            featureNames.map((name) => [name, nullableBoolean(nestedFeatures[name])]),
          )
        : {}),
    },
    required_capabilities: taskStringList(raw.required_capabilities),
    required_features: taskStringList(raw.required_features),
  };
}

function resourceStatus(value: unknown): ResourceStatus {
  return value === "active" ? "active" : "inactive";
}

function connectionStatus(value: unknown): ConnectionStatus {
  return value === "available" || value === "unavailable" ? value : "unknown";
}

function modelCapability(value: unknown): ModelCapability {
  return capabilities.includes(value as ModelCapability)
    ? value as ModelCapability
    : "llm";
}

export function normalizeProvider(value: unknown, organizationId: string): ProviderView {
  const raw = isRecord(value) ? value : {};
  const id = stringValue(raw.id);
  const credentialConfigured =
    typeof raw.credential_configured === "boolean" ? raw.credential_configured : null;
  return {
    resource_id: stringValue(raw.resource_id, `provider:${id}`),
    id,
    scope: raw.scope === "system" ? "system" : "organization",
    organization_id:
      raw.scope === "system" ? null : stringValue(raw.organization_id, organizationId),
    display_name: stringValue(raw.display_name, id),
    base_url: stringValue(raw.base_url),
    status: resourceStatus(raw.status),
    connection_status: connectionStatus(raw.connection_status),
    credential_configured: credentialConfigured,
    credential_source:
      raw.credential_source === "database" || raw.credential_source === "environment"
        ? raw.credential_source
        : raw.credential_source === "none" ? "none" : "unknown",
    discovered_models: Array.isArray(raw.discovered_models)
      ? raw.discovered_models.flatMap((item): ProviderModelCandidate[] => {
          if (!isRecord(item) || typeof item.model_id !== "string") return [];
          const modelId = item.model_id.trim();
          if (!modelId) return [];
          return [{
            model_id: modelId,
            name: stringValue(item.name, modelId),
            capability: capabilities.includes(item.capability as ModelCapability)
              ? item.capability as ModelCapability
              : null,
            max_tokens: numberValue(item.max_tokens),
            max_context_length: numberValue(item.max_context_length),
            tools: nullableBoolean(item.tools),
            streaming: nullableBoolean(item.streaming),
            structured_output: nullableBoolean(item.structured_output),
            vision: nullableBoolean(item.vision),
            discovered_at: stringValue(item.discovered_at),
          }];
        })
      : [],
    created_at: stringValue(raw.created_at),
    updated_at: stringValue(raw.updated_at),
  };
}

export function normalizeProviderModel(
  value: unknown,
  organizationId: string,
): ProviderModelView {
  const raw = isRecord(value) ? value : {};
  const providerId = stringValue(raw.provider_id);
  const modelId = stringValue(raw.model_id);
  const features = modelFeatures(raw);
  return {
    resource_id: stringValue(raw.resource_id, `provider:${providerId}:model:${modelId}`),
    provider_id: providerId,
    provider_scope: raw.provider_scope === "system" ? "system" : "organization",
    organization_id:
      raw.provider_scope === "system" ? null : stringValue(raw.organization_id, organizationId),
    model_id: modelId,
    name: stringValue(raw.name, modelId),
    capability: modelCapability(raw.capability),
    max_tokens: numberValue(raw.max_tokens),
    max_context_length: numberValue(raw.max_context_length),
    status: resourceStatus(raw.status),
    connection_status: connectionStatus(raw.connection_status),
    is_default: raw.is_default === true,
    tools: features.tools,
    streaming: features.streaming,
    structured_output: features.structured_output,
    vision: features.vision,
    features,
    created_at: stringValue(raw.created_at),
    updated_at: stringValue(raw.updated_at),
  };
}
