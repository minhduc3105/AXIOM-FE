import type { ModelCapability } from "./registryTypes";

export type FormErrors = Record<string, string | undefined>;

const providerIdPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const capabilities = new Set<ModelCapability>(["llm", "embedding", "vlm", "reranker"]);

function required(value: string, label: string, maxLength: number) {
  if (!value.trim()) return `${label} is required.`;
  if (value.trim().length > maxLength) return `${label} must be at most ${maxLength} characters.`;
  return undefined;
}

export function validateHttpUrl(value: string, label = "Endpoint") {
  if (!value.trim()) return `${label} is required.`;
  if (value.trim().length > 1024) return `${label} must be at most 1024 characters.`;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? undefined
      : `${label} must use http or https.`;
  } catch {
    return `${label} must be a valid URL.`;
  }
}

export function validateProviderForm(values: { id: string; name: string; baseUrl: string }, editing: boolean): FormErrors {
  return {
    id: editing || providerIdPattern.test(values.id.trim())
      ? undefined
      : "Provider ID must use 2–64 lowercase letters, numbers, hyphens, or underscores.",
    name: required(values.name, "Provider name", 128),
    baseUrl: validateHttpUrl(values.baseUrl),
  };
}

export function validateModelForm(values: {
  modelId: string;
  name: string;
  capability: string;
  maxTokens: string;
  contextLength: string;
}, editing: boolean): FormErrors {
  const maxTokens = values.maxTokens.trim() ? Number(values.maxTokens) : undefined;
  const contextLength = values.contextLength.trim() ? Number(values.contextLength) : undefined;
  return {
    modelId: editing || (values.modelId.trim() && values.modelId.trim().length <= 256)
      ? undefined
      : "Model ID is required and must be at most 256 characters.",
    name: required(values.name, "Model name", 256),
    capability: capabilities.has(values.capability as ModelCapability)
      ? undefined
      : "Choose a supported workload.",
    maxTokens: maxTokens === undefined || (Number.isInteger(maxTokens) && maxTokens > 0)
      ? undefined
      : "Max output tokens must be a positive whole number.",
    contextLength: contextLength === undefined || (Number.isInteger(contextLength) && contextLength >= 1000)
      ? undefined
      : "Context length must be a whole number of at least 1000.",
    limits: maxTokens !== undefined && contextLength !== undefined && maxTokens > contextLength
      ? "Max output tokens cannot exceed context length."
      : undefined,
  };
}

export function validateCredential(apiKey: string): FormErrors {
  if (!apiKey.trim()) return { apiKey: "API key is required." };
  if (apiKey.length > 4096) return { apiKey: "API key must be at most 4096 characters." };
  return {};
}

export function hasErrors(errors: FormErrors) {
  return Object.values(errors).some(Boolean);
}
