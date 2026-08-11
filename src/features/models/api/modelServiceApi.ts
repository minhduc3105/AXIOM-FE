import type {
  DeploymentView,
  EmbeddingResponse,
  LlmResponse,
  LogicalModelView,
  ModelCapability,
  ModelRegistrationRequest,
  ModelRegistrationResponse,
  ModelTestResult,
  ProviderView,
  RerankResponse,
} from "../model/registryTypes";

export const modelServiceApiBaseUrl =
  import.meta.env.VITE_MODEL_SERVICE_API_BASE_URL ?? "/model-service";

type V2ProviderView = {
  id: string;
  scope: "system" | "organization";
  display_name: string;
  source: string;
  base_url: string;
  protocol: string;
  status: string;
  credential_configured: boolean;
  created_at: string;
  updated_at: string;
};

type V2ProviderModelView = {
  resource_id: string;
  provider_id: string;
  model_id: string;
  name: string;
  capability: ModelCapability;
  max_tokens: number | null;
  max_context_length: number | null;
  status: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

class ModelServiceApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ModelServiceApiError";
  }
}

async function readErrorDetail(response: Response) {
  try {
    const body = (await response.json()) as {
      detail?: string;
      message?: string;
      code?: string;
    };
    const message = body.message || body.detail || "";
    return body.code ? `${body.code}: ${message}` : message;
  } catch {
    return "";
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${modelServiceApiBaseUrl}${path}`, {
    ...options,
    signal,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "X-Consumer-Service": "axiom-fe",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ModelServiceApiError(
      `Model Service request failed (${response.status}).${detail ? ` ${detail}` : ""}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

function v2ProviderToProviderView(provider: V2ProviderView): ProviderView {
  return {
    id: provider.id,
    name: provider.display_name,
    adapter_type: provider.protocol,
    base_url: provider.base_url,
    secret_ref: provider.credential_configured ? "configured" : null,
    scope: provider.scope === "organization" ? "tenant" : "platform",
    status: provider.status,
    created_at: provider.created_at,
    updated_at: provider.updated_at,
  };
}

function v2ModelToLogicalModelView(
  model: V2ProviderModelView,
): LogicalModelView {
  return {
    id: model.resource_id,
    alias: model.resource_id,
    display_name: model.name || model.model_id,
    capability: model.capability,
    revision: 1,
    status: model.status,
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

function v2ModelToDeploymentView(model: V2ProviderModelView): DeploymentView {
  return {
    id: model.resource_id,
    model_id: model.resource_id,
    provider_id: model.provider_id,
    upstream_model_id: model.model_id,
    priority: model.is_default ? 0 : 1,
    weight: 1,
    timeout_ms: 0,
    max_attempts: 1,
    status: model.status,
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

async function requestProvider(
  path: string,
  method: "POST" | "PATCH",
  payload: Record<string, unknown>,
) {
  return requestJson<V2ProviderView>(path, {
    method,
    body: JSON.stringify(payload),
  });
}

async function upsertProvider(
  providerId: string,
  payload: Record<string, unknown>,
) {
  try {
    return await requestProvider("/api/v2/providers", "POST", payload);
  } catch (error) {
    if (!(error instanceof ModelServiceApiError) || error.status !== 409) {
      throw error;
    }
    return requestProvider(
      `/api/v2/providers/${encodeURIComponent(providerId)}`,
      "PATCH",
      {
        display_name: payload.display_name,
        source: payload.source,
        base_url: payload.base_url,
        protocol: payload.protocol,
        status: payload.status,
      },
    );
  }
}

async function upsertProviderCredential(
  providerId: string,
  apiKey: string | null,
) {
  if (!apiKey) return;
  await requestJson(
    `/api/v2/providers/${encodeURIComponent(providerId)}/credential`,
    {
      method: "PUT",
      body: JSON.stringify({ api_key: apiKey }),
    },
  );
}

async function upsertProviderModel(
  providerId: string,
  payload: Record<string, unknown>,
) {
  try {
    return await requestJson<V2ProviderModelView>(
      `/api/v2/providers/${encodeURIComponent(providerId)}/models`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  } catch (error) {
    if (!(error instanceof ModelServiceApiError) || error.status !== 409) {
      throw error;
    }
    const models = await requestJson<V2ProviderModelView[]>(
      `/api/v2/providers/${encodeURIComponent(providerId)}/models`,
    );
    const existing = models.find(
      (model) => model.model_id === payload.model_id,
    );
    if (!existing) throw error;
    return requestJson<V2ProviderModelView>(
      `/api/v2/models/${encodeURIComponent(existing.resource_id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          name: payload.name,
          capability: payload.capability,
          max_tokens: payload.max_tokens,
          max_context_length: payload.max_context_length,
          status: payload.status,
          is_default: payload.is_default,
        }),
      },
    );
  }
}

function slugifyProviderId(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/^[^a-z0-9]+/, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64) || "provider"
  );
}

function apiKeyFromSecretRef(value: string | null) {
  if (!value) return null;
  if (value.startsWith("literal:")) return value.slice("literal:".length);
  return null;
}

export function listProviders(signal?: AbortSignal) {
  return requestJson<V2ProviderView[]>("/api/v2/providers", {}, signal).then(
    (providers) => providers.map(v2ProviderToProviderView),
  );
}

export async function listModels(
  signal?: AbortSignal,
  capability?: ModelCapability,
) {
  const params = new URLSearchParams();
  if (capability) params.set("capability", capability);
  const query = params.toString();
  const providers = await requestJson<V2ProviderView[]>(
    "/api/v2/providers",
    {},
    signal,
  );
  const results = await Promise.allSettled(
    providers.map((provider) =>
      requestJson<V2ProviderModelView[]>(
        `/api/v2/providers/${encodeURIComponent(provider.id)}/models${query ? `?${query}` : ""}`,
        {},
        signal,
      ),
    ),
  );
  return results.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value.map(v2ModelToLogicalModelView)
      : [],
  );
}

export async function listDeployments(modelId: string, signal?: AbortSignal) {
  const model = await requestJson<V2ProviderModelView>(
    `/api/v2/models/${encodeURIComponent(modelId)}`,
    {},
    signal,
  );
  return [v2ModelToDeploymentView(model)];
}

export async function registerModel(
  body: ModelRegistrationRequest,
): Promise<ModelRegistrationResponse> {
  const organizationProviderId =
    body.provider.scope === "tenant" ? body.provider.id : undefined;
  const providerId =
    organizationProviderId || slugifyProviderId(`custom-${body.provider.name}`);
  const apiKey = apiKeyFromSecretRef(body.provider.secret_ref);
  const providerPayload = {
    id: providerId,
    display_name: body.provider.name,
    source: body.provider.scope === "tenant" ? "custom" : "cloud",
    base_url: body.provider.base_url,
    protocol: body.provider.adapter_type,
    status: body.activate ? "active" : "inactive",
  };
  const provider = await upsertProvider(providerId, providerPayload);
  await upsertProviderCredential(provider.id, apiKey);
  const model = await upsertProviderModel(provider.id, {
    model_id: body.model.upstream_model_id,
    name: body.model.display_name || body.model.alias,
    capability: body.model.capability,
    max_tokens: null,
    max_context_length: null,
    status: body.activate ? "active" : "inactive",
    is_default: body.activate,
  });

  return {
    provider: {
      id: provider.id,
      name: provider.display_name,
      status: provider.status,
      created: false,
    },
    model: {
      id: model.resource_id,
      alias: model.resource_id,
      capability: model.capability,
      status: model.status,
      created: false,
    },
    deployment: {
      id: model.resource_id,
      upstream_model_id: model.model_id,
      status: model.status,
      created: false,
    },
    ready: model.status === "active",
  };
}

export function activateModel(modelId: string) {
  return requestJson<V2ProviderModelView>(
    `/api/v2/models/${encodeURIComponent(modelId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "active", is_default: true }),
    },
  ).then(v2ModelToLogicalModelView);
}

export function activateDeployment(modelId: string, deploymentId: string) {
  return requestJson<V2ProviderModelView>(
    `/api/v2/models/${encodeURIComponent(deploymentId || modelId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "active", is_default: true }),
    },
  ).then(v2ModelToDeploymentView);
}

async function resolveModelTarget(model: LogicalModelView) {
  const deployments = await listDeployments(model.id);
  const deployment =
    deployments.find((item) => item.status.toLowerCase() === "active") ??
    deployments[0];
  if (!deployment) {
    throw new Error("No Model Service deployment found for this model.");
  }
  return {
    provider_id: deployment.provider_id,
    model_id: deployment.upstream_model_id,
  };
}

function createVisionSmokeTestImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create the VLM smoke-test image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#2563eb";
  context.fillRect(8, 8, 22, 22);
  context.fillStyle = "#f97316";
  context.beginPath();
  context.arc(46, 46, 12, 0, Math.PI * 2);
  context.fill();

  return canvas.toDataURL("image/png");
}

export async function testModel(
  model: LogicalModelView,
): Promise<ModelTestResult> {
  const startedAt = performance.now();
  try {
    const target = await resolveModelTarget(model);

    if (model.capability === "embedding") {
      const response = await requestJson<EmbeddingResponse>(
        "/api/v2/inference/embeddings",
        {
          method: "POST",
          body: JSON.stringify({
            ...target,
            input: [
              {
                id: "settings-smoke-test",
                text: "AXIOM Model Service embedding smoke test.",
              },
            ],
            input_type: "query",
          }),
        },
      );
      return {
        status: "success",
        title: "Embedding request succeeded",
        detail: `${response.dimensions} dimensions returned in ${Math.round(response.timing.total_ms)} ms.`,
        traceId: response.trace_id,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    }

    if (model.capability === "reranker") {
      const response = await requestJson<RerankResponse>(
        "/api/v2/inference/reranks",
        {
          method: "POST",
          body: JSON.stringify({
            ...target,
            query: "model service smoke test",
            documents: [
              { id: "a", text: "AXIOM model registry smoke test." },
              { id: "b", text: "Unrelated document." },
            ],
            top_n: 1,
          }),
        },
      );
      return {
        status: "success",
        title: "Rerank request succeeded",
        detail: `${response.results.length} result returned in ${Math.round(response.timing.total_ms)} ms.`,
        traceId: response.trace_id,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    }

    if (model.capability === "vlm") {
      const response = await requestJson<LlmResponse>(
        "/api/v2/inference/vision-responses",
        {
          method: "POST",
          body: JSON.stringify({
            ...target,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Briefly identify the colored shapes in this image.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: createVisionSmokeTestImage(),
                      detail: "low",
                    },
                  },
                ],
              },
            ],
            temperature: 0,
            max_output_tokens: 64,
            stream: false,
          }),
        },
      );
      return {
        status: "success",
        title: "Vision request succeeded",
        detail:
          response.output.content.trim() ||
          `Finished with reason ${response.finish_reason}.`,
        traceId: response.trace_id,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    }

    const response = await requestJson<LlmResponse>(
      "/api/v2/inference/responses",
      {
        method: "POST",
        body: JSON.stringify({
          ...target,
          messages: [
            {
              role: "user",
              content: "Reply with exactly: AXIOM model ready",
            },
          ],
          temperature: 0,
          max_output_tokens: 32,
          stream: false,
        }),
      },
    );
    return {
      status: "success",
      title: "LLM request succeeded",
      detail:
        response.output.content.trim() ||
        `Finished with reason ${response.finish_reason}.`,
      traceId: response.trace_id,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      status: "error",
      title: "Smoke test failed",
      detail:
        error instanceof Error
          ? error.message
          : "The model test request failed.",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}
