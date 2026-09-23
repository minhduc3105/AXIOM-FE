import type { ModelCapability } from "./registryTypes";

export type FormErrors = Record<string, string | undefined>;

const capabilities = new Set<ModelCapability>(["llm", "embedding", "vlm"]);

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

export function validateProviderForm(values: { name: string; baseUrl: string }): FormErrors {
  return {
    name: required(values.name, "Provider name", 128),
    baseUrl: validateHttpUrl(values.baseUrl),
  };
}

export function validateModelForm(values: {
  modelName: string;
  capability: string;
}): FormErrors {
  return {
    modelName: values.modelName.trim() && values.modelName.trim().length <= 256
      ? undefined
      : "Model name is required and must be at most 256 characters.",
    capability: capabilities.has(values.capability as ModelCapability)
      ? undefined
      : "Choose a supported workload.",
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
