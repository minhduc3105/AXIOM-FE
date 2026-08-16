import type {
  ConnectionStatus,
  ModelCapability,
  ProviderModelView,
  ProviderProtocol,
  ProviderSource,
  ProviderView,
  ResourceStatus,
} from "../model/registryTypes";

type ApiRecord = Record<string, unknown>;

const capabilities: ModelCapability[] = ["llm", "embedding", "vlm", "reranker"];
const protocols: ProviderProtocol[] = [
  "builtin",
  "openrouter",
  "openai_compatible",
  "cohere_compatible",
];

function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resourceStatus(value: unknown): ResourceStatus {
  return value === "active" ? "active" : "inactive";
}

function connectionStatus(value: unknown): ConnectionStatus {
  return value === "available" || value === "unavailable" ? value : "unknown";
}

function providerSource(value: unknown): ProviderSource {
  return value === "cloud" || value === "self_hosted" ? value : "custom";
}

function providerProtocol(value: unknown): ProviderProtocol {
  return protocols.includes(value as ProviderProtocol)
    ? value as ProviderProtocol
    : "openai_compatible";
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
    source: providerSource(raw.source),
    base_url: stringValue(raw.base_url),
    protocol: providerProtocol(raw.protocol),
    status: resourceStatus(raw.status),
    connection_status: connectionStatus(raw.connection_status),
    credential_configured: credentialConfigured,
    credential_source:
      raw.credential_source === "database" || raw.credential_source === "environment"
        ? raw.credential_source
        : raw.credential_source === "none" ? "none" : "unknown",
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
    created_at: stringValue(raw.created_at),
    updated_at: stringValue(raw.updated_at),
  };
}
