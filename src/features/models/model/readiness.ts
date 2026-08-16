import type { ProviderModelView, ProviderView } from "./registryTypes";

export type ReadinessLevel =
  | "ready"
  | "testing"
  | "inactive"
  | "blocked"
  | "failed"
  | "unknown"
  | "not_configured";

export type ReadinessAction =
  | "none"
  | "activate_provider"
  | "test_provider"
  | "activate_model"
  | "test_model"
  | "resolve_provider"
  | "add_provider";

export type ProviderReadiness = {
  level: ReadinessLevel;
  label: string;
  detail: string;
  nextAction: string;
  action: ReadinessAction;
};

export type ModelReadiness = ProviderReadiness;

type ReadinessOptions = {
  testing?: boolean;
  failureReason?: string;
};

export function getProviderReadiness(
  provider: ProviderView,
  options: ReadinessOptions = {},
): ProviderReadiness {
  if (options.testing) {
    return {
      level: "testing",
      label: "Testing",
      detail: "A live connection check is running against the configured endpoint.",
      nextAction: "Wait for the connection result before changing this provider.",
      action: "none",
    };
  }
  if (provider.status !== "active") {
    return {
      level: "inactive",
      label: "Inactive",
      detail: "This provider is disabled, so its models cannot receive inference traffic.",
      nextAction: "Activate the provider, then test its connection.",
      action: "activate_provider",
    };
  }
  if (provider.connection_status === "unavailable") {
    return {
      level: "failed",
      label: "Connection failed",
      detail: options.failureReason
        ? `The last connection test failed: ${options.failureReason}`
        : "The last connection test failed. Model Service did not retain the failure reason.",
      nextAction: "Review the endpoint and credential, then test the connection again.",
      action: "test_provider",
    };
  }
  if (provider.connection_status !== "available") {
    return {
      level: "unknown",
      label: "Unknown",
      detail: "Model Service has not confirmed whether this provider can connect.",
      nextAction: "Run a connection test before using this provider.",
      action: "test_provider",
    };
  }
  return {
    level: "ready",
    label: "Ready",
    detail: "Provider is active and its connection is available.",
    nextAction: "No action needed.",
    action: "none",
  };
}

export function getModelReadiness(
  provider: ProviderView,
  model: ProviderModelView,
  options: ReadinessOptions = {},
): ModelReadiness {
  if (options.testing) {
    return {
      level: "testing",
      label: "Testing",
      detail: "A live validation is running for this model.",
      nextAction: "Wait for the model validation result before changing this model.",
      action: "none",
    };
  }
  const providerReadiness = getProviderReadiness(provider);
  if (providerReadiness.level !== "ready") {
    return {
      level: "blocked",
      label: "Provider blocked",
      detail: `This model cannot be validated because ${providerReadiness.detail.toLowerCase()}`,
      nextAction: providerReadiness.nextAction,
      action: "resolve_provider",
    };
  }
  if (model.status !== "active") {
    return {
      level: "inactive",
      label: "Inactive",
      detail: "This model is disabled and cannot be selected as a default.",
      nextAction: "Activate the model, then run a model test.",
      action: "activate_model",
    };
  }
  if (model.connection_status === "unavailable") {
    return {
      level: "failed",
      label: "Model test failed",
      detail: options.failureReason
        ? `The last model test failed: ${options.failureReason}`
        : "The last model test failed. Model Service did not retain the failure reason.",
      nextAction: "Review model support and provider configuration, then test the model again.",
      action: "test_model",
    };
  }
  if (model.connection_status !== "available") {
    return {
      level: "unknown",
      label: "Unknown",
      detail: "Model Service has not confirmed that this model is supported by its provider.",
      nextAction: "Run a model test before assigning it as a default.",
      action: "test_model",
    };
  }
  return {
    level: "ready",
    label: "Ready",
    detail: "Provider and model are active and validated.",
    nextAction: "No action needed.",
    action: "none",
  };
}
