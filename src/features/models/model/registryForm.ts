import type {
  ModelCapability,
  ProviderProtocol,
  ProviderSource,
} from "./registryTypes";

const modelCapabilities: ModelCapability[] = ["llm", "embedding", "vlm", "reranker"];
const providerProtocols: ProviderProtocol[] = [
  "builtin",
  "openrouter",
  "openai_compatible",
  "cohere_compatible",
];

export function normalizeProviderId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseProviderSource(value: FormDataEntryValue | null): ProviderSource {
  if (value === "cloud" || value === "self_hosted") return value;
  // Compatibility for forms saved before the v1 contract renamed `local`.
  if (value === "local") return "self_hosted";
  return "custom";
}

export function parseProviderProtocol(value: FormDataEntryValue | null): ProviderProtocol {
  return providerProtocols.includes(value as ProviderProtocol)
    ? value as ProviderProtocol
    : "openai_compatible";
}

export function parseModelCapability(value: FormDataEntryValue | null): ModelCapability {
  return modelCapabilities.includes(value as ModelCapability)
    ? value as ModelCapability
    : "llm";
}
