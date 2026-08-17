export type ModelCapability = "llm" | "embedding" | "vlm" | "reranker";
export type ResourceStatus = "active" | "inactive";
export type ConnectionStatus = "unknown" | "available" | "unavailable";
export type CredentialSource = "database" | "environment" | "none" | "unknown";
export type ProviderSource = "cloud" | "self_hosted" | "custom";
export type ProviderProtocol =
  | "builtin"
  | "openrouter"
  | "openai_compatible"
  | "cohere_compatible";

export type ProviderCatalogItem = {
  id: string;
  display_name: string;
  source: ProviderSource;
  default_base_url: string;
  protocol: ProviderProtocol;
  requires_api_key: boolean;
};

export type ProviderView = {
  resource_id: string;
  id: string;
  scope: "system" | "organization";
  organization_id: string | null;
  display_name: string;
  source: ProviderSource;
  base_url: string;
  protocol: ProviderProtocol;
  status: ResourceStatus;
  connection_status: ConnectionStatus;
  credential_configured: boolean | null;
  credential_source: CredentialSource;
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
  created_at: string;
  updated_at: string;
};

export type ProviderCreateInput = {
  id: string;
  display_name: string;
  source: ProviderSource;
  base_url: string;
  protocol: ProviderProtocol;
  status?: ResourceStatus;
};

export type ProviderModelCreateInput = {
  model_id: string;
  name: string;
  capability: ModelCapability;
  max_tokens?: number;
  max_context_length?: number;
  status?: ResourceStatus;
  is_default?: boolean;
};
