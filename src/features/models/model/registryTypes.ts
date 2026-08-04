export type ModelCapability = "llm" | "embedding" | "vlm" | "reranker";

export type ModelStatus =
  | "draft"
  | "validated"
  | "active"
  | "inactive"
  | string;

export type ProviderView = {
  id: string;
  name: string;
  adapter_type: string;
  base_url: string;
  secret_ref: string | null;
  scope: string;
  status: ModelStatus;
  created_at: string;
  updated_at: string;
};

export type LogicalModelView = {
  id: string;
  alias: string;
  display_name: string;
  capability: ModelCapability;
  revision: number;
  status: ModelStatus;
  created_at: string;
  updated_at: string;
};

export type DeploymentView = {
  id: string;
  model_id: string;
  provider_id: string;
  upstream_model_id: string;
  priority: number;
  weight: number;
  timeout_ms: number;
  max_attempts: number;
  status: ModelStatus;
  created_at: string;
  updated_at: string;
};

export type ModelRegistrationRequest = {
  provider: {
    name: string;
    adapter_type: string;
    base_url: string;
    secret_ref: string | null;
    scope: "platform" | "tenant";
  };
  model: {
    alias: string;
    display_name: string;
    capability: ModelCapability;
    upstream_model_id: string;
  };
  deployment: {
    priority: number;
    weight: number;
    timeout_ms: number;
    max_attempts: number;
  };
  activate: boolean;
};

export type ModelRegistrationResponse = {
  provider: {
    id: string;
    name: string;
    status: ModelStatus;
    created: boolean;
  };
  model: {
    id: string;
    alias: string;
    capability: ModelCapability;
    status: ModelStatus;
    created: boolean;
  };
  deployment: {
    id: string;
    upstream_model_id: string;
    status: ModelStatus;
    created: boolean;
  };
  ready: boolean;
};

export type Timing = {
  total_ms: number;
  provider_ms: number | null;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  source: string;
};

export type EmbeddingResponse = {
  id: string;
  trace_id: string;
  model: string;
  model_revision: number;
  dimensions: number;
  data: Array<{
    id: string;
    index: number;
    embedding: number[];
  }>;
  usage: Usage;
  timing: Timing;
  attempt_count: number;
};

export type LlmResponse = {
  id: string;
  trace_id: string;
  model: string;
  model_revision: number;
  output: {
    type: string;
    content: string;
    tool_calls: Array<Record<string, unknown>>;
  };
  finish_reason: string;
  usage: Usage;
  timing: Timing;
  attempt_count: number;
};

export type RerankResponse = {
  id: string;
  trace_id: string;
  model: string;
  model_revision: number;
  results: Array<{
    document_id: string;
    index: number;
    relevance_score: number;
  }>;
  usage: Usage;
  timing: Timing;
  attempt_count: number;
};

export type ModelTestResult = {
  status: "success" | "error";
  title: string;
  detail: string;
  traceId?: string;
  latencyMs?: number;
};
