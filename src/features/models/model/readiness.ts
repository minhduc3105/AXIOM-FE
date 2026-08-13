import type { ProviderModelView, ProviderView } from "./registryTypes";

export type ReadinessLevel = "ready" | "needs_attention" | "not_configured";

export type ProviderReadiness = {
  level: ReadinessLevel;
  label: string;
  detail: string;
};

export type ModelReadiness = ProviderReadiness;

export function getProviderReadiness(provider: ProviderView): ProviderReadiness {
  if (provider.status !== "active") {
    return {
      level: "needs_attention",
      label: "Inactive",
      detail: "Activate the provider before routing inference to it.",
    };
  }
  if (provider.connection_status === "unavailable") {
    return {
      level: "needs_attention",
      label: "Unavailable",
      detail: "The last provider connection test failed.",
    };
  }
  if (provider.connection_status !== "available") {
    return {
      level: "needs_attention",
      label: provider.credential_source === "none" ? "Credential needed" : "Test required",
      detail:
        provider.credential_source === "none"
          ? "Store a credential when required, then test the connection."
          : "Run a provider connection test to verify readiness.",
    };
  }
  return {
    level: "ready",
    label: "Ready",
    detail: "Provider is active and its connection is available.",
  };
}

export function getModelReadiness(
  provider: ProviderView,
  model: ProviderModelView,
): ModelReadiness {
  const providerReadiness = getProviderReadiness(provider);
  if (providerReadiness.level !== "ready") return providerReadiness;
  if (model.status !== "active") {
    return {
      level: "needs_attention",
      label: "Inactive",
      detail: "Selecting this model will activate it before making it default.",
    };
  }
  if (model.connection_status === "unavailable") {
    return {
      level: "needs_attention",
      label: "Unavailable",
      detail: "The last model validation failed.",
    };
  }
  if (model.connection_status !== "available") {
    return {
      level: "needs_attention",
      label: "Test recommended",
      detail: "The model has not been validated against its provider.",
    };
  }
  return {
    level: "ready",
    label: "Ready",
    detail: "Provider and model are active and validated.",
  };
}
