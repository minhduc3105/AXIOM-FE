import type { ModelCapability, ProviderModelCandidate } from "./registryTypes";

const modelCapabilities: ModelCapability[] = ["llm", "embedding", "vlm"];

export function normalizeProviderId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseModelCapability(value: FormDataEntryValue | null): ModelCapability {
  return modelCapabilities.includes(value as ModelCapability)
    ? value as ModelCapability
    : "llm";
}

export function modelMetadataFromCandidate(candidate?: ProviderModelCandidate) {
  if (!candidate) return {};
  return {
    max_tokens: candidate.max_tokens,
    max_context_length: candidate.max_context_length,
    tools: candidate.tools,
    streaming: candidate.streaming,
    structured_output: candidate.structured_output,
    vision: candidate.vision,
  };
}
