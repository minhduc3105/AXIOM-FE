export const MODEL_SERVICE_API_VERSION = "/api/v2";

const encode = encodeURIComponent;

export const modelServiceRoutes = {
  healthReady: `${MODEL_SERVICE_API_VERSION}/health/ready`,
  providerCatalog: `${MODEL_SERVICE_API_VERSION}/provider-catalog`,
  providers: `${MODEL_SERVICE_API_VERSION}/providers`,
  provider: (providerId: string) =>
    `${MODEL_SERVICE_API_VERSION}/providers/${encode(providerId)}`,
  providerCredential: (providerId: string) =>
    `${MODEL_SERVICE_API_VERSION}/providers/${encode(providerId)}/credential`,
  providerTest: (providerId: string) =>
    `${MODEL_SERVICE_API_VERSION}/providers/${encode(providerId)}:test-connection`,
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
