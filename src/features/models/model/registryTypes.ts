import type { ModelFeatureSupport } from "../api/modelServiceContract";

export type ModelCapability = "llm" | "embedding" | "vlm" | "reranker";
export type ResourceStatus = "active" | "inactive";
export type ConnectionStatus = "unknown" | "available" | "unavailable";
export type CredentialSource = "database" | "environment" | "none" | "unknown";

export type ProviderModelCandidate = {
  model_id: string;
  name: string;
  capability: ModelCapability | null;
  max_tokens: number | null;
  max_context_length: number | null;
  tools: boolean | null;
  streaming: boolean | null;
  structured_output: boolean | null;
  vision: boolean | null;
  discovered_at: string;
};

export type ProviderView = {
  resource_id: string;
  id: string;
  scope: "system" | "organization";
  organization_id: string | null;
  display_name: string;
  base_url: string;
  status: ResourceStatus;
  connection_status: ConnectionStatus;
  credential_configured: boolean | null;
  credential_source: CredentialSource;
  discovered_models: ProviderModelCandidate[];
  created_at: string;
  updated_at: string;
};

export type ProviderModelView = {
  resource_id: string;
  provider_id: string;
  provider_scope: "system" | "organization";
  organization_id: string | null;
  model_id: string;
  name: string;
  capability: ModelCapability;
  max_tokens: number | null;
  max_context_length: number | null;
  status: ResourceStatus;
  connection_status: ConnectionStatus;
  is_default: boolean;
  /** Flat fields mirror the Model Service v2 registry response. */
  tools?: boolean | null;
  streaming?: boolean | null;
  structured_output?: boolean | null;
  vision?: boolean | null;
  /** Canonical feature view used by task eligibility checks. */
  features?: ModelFeatureSupport;
  created_at: string;
  updated_at: string;
};

export type ProviderCreateInput = {
  display_name: string;
  base_url: string;
  api_key: string;
  status?: ResourceStatus;
};

export type ProviderModelCreateInput = {
  model_id: string;
  name: string;
  capability: ModelCapability;
  max_tokens?: number | null;
  max_context_length?: number | null;
  status?: ResourceStatus;
  is_default?: boolean;
  tools?: boolean | null;
  streaming?: boolean | null;
  structured_output?: boolean | null;
  vision?: boolean | null;
};
