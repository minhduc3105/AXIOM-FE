export const MODEL_SERVICE_API_VERSION = "/api/v2";

const encode = encodeURIComponent;

export const modelServiceRoutes = {
  healthReady: `${MODEL_SERVICE_API_VERSION}/health/ready`,
  modelTasks: `${MODEL_SERVICE_API_VERSION}/model-tasks`,
  taskAssignments: `${MODEL_SERVICE_API_VERSION}/task-assignments`,
  providers: `${MODEL_SERVICE_API_VERSION}/providers`,
  provider: (providerId: string) =>
    `${MODEL_SERVICE_API_VERSION}/providers/${encode(providerId)}`,
  providerCredential: (providerId: string) =>
    `${MODEL_SERVICE_API_VERSION}/providers/${encode(providerId)}/credential`,
  providerTest: (providerId: string) =>
    `${MODEL_SERVICE_API_VERSION}/providers/${encode(providerId)}:test-connection`,
  providerDiscoverModels: (providerId: string) =>
    `${MODEL_SERVICE_API_VERSION}/providers/${encode(providerId)}:discover-models`,
  providerModels: (providerId: string) =>
    `${MODEL_SERVICE_API_VERSION}/providers/${encode(providerId)}/models`,
  model: (resourceId: string) =>
    `${MODEL_SERVICE_API_VERSION}/models/${encode(resourceId)}`,
  modelTest: (resourceId: string) =>
    `${MODEL_SERVICE_API_VERSION}/models/${encode(resourceId)}:test`,
  inferenceResponses: `${MODEL_SERVICE_API_VERSION}/inference/responses`,
  inferenceVisionResponses: `${MODEL_SERVICE_API_VERSION}/inference/vision-responses`,
  inferenceEmbeddings: `${MODEL_SERVICE_API_VERSION}/inference/embeddings`,
  inferenceReranks: `${MODEL_SERVICE_API_VERSION}/inference/reranks`,
  inferenceRequest: (requestId: string) =>
    `${MODEL_SERVICE_API_VERSION}/inference/requests/${encode(requestId)}`,
  inferenceAttempts: (requestId: string) =>
    `${MODEL_SERVICE_API_VERSION}/inference/requests/${encode(requestId)}/attempts`,
  auditOutbox: `${MODEL_SERVICE_API_VERSION}/audit/outbox`,
} as const;

export type ModelFeatureName =
  | "tools"
  | "streaming"
  | "structured_output"
  | "vision";

export type ModelFeatureSupport = Record<ModelFeatureName, boolean | null>;

export type ModelTask = {
  task_id: string;
  display_name: string;
  group: string;
  required_capabilities: string[];
  required_features: string[];
  allowed_consumers: string[];
  requires_index_profile: boolean;
  vision_optional: boolean;
  consumer_id?: string | null;
  role?: string | null;
};

export type TaskAssignmentStatus =
  | "assigned"
  | "unconfigured"
  | "unavailable"
  | "conflict";

export type TaskAssignment = {
  task_id: string;
  provider_id: string | null;
  model_id: string | null;
  assignment_revision?: number | null;
  status: TaskAssignmentStatus;
  reason: string | null;
  features: ModelFeatureSupport;
  required_capabilities: string[];
  required_features: string[];
};

export type TaskAssignmentsView = {
  organization_id: string;
  revision: number;
  config_revision: number;
  assignments: TaskAssignment[];
};

export type TaskAssignmentChange = {
  task_id: string;
  provider_id: string;
  model_id: string;
};

export type TaskAssignmentBatchInput = {
  expected_revision: number;
  changes: TaskAssignmentChange[];
};

export type TaskAssignmentBatchResponse = TaskAssignmentsView & {
  changed: boolean;
  changed_task_ids: string[];
};

export type ProviderCredentialView = {
  provider_id: string;
  scope?: "system" | "organization";
  organization_id?: string | null;
  credential_configured: boolean;
  credential_source: "database" | "environment" | "none";
};

export type DeleteResult = {
  id: string;
  deleted?: boolean;
};
