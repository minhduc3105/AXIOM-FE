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
} from "../model/types";

export const modelServiceApiBaseUrl =
  import.meta.env.VITE_MODEL_SERVICE_API_BASE_URL ?? "/model-service";

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

export function listProviders(signal?: AbortSignal) {
  return requestJson<ProviderView[]>("/api/v1/model-registry/providers", {}, signal);
}

export function listModels(signal?: AbortSignal, capability?: ModelCapability) {
  const params = new URLSearchParams();
  if (capability) params.set("capability", capability);
  const query = params.toString();
  return requestJson<LogicalModelView[]>(
    `/api/v1/model-registry/models${query ? `?${query}` : ""}`,
    {},
    signal,
  );
}

export function listDeployments(modelId: string, signal?: AbortSignal) {
  return requestJson<DeploymentView[]>(
    `/api/v1/model-registry/models/${encodeURIComponent(modelId)}/deployments`,
    {},
    signal,
  );
}

export function registerModel(body: ModelRegistrationRequest) {
  return requestJson<ModelRegistrationResponse>(
    "/api/v1/model-registry/registrations",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function activateModel(modelId: string) {
  return requestJson<LogicalModelView>(
    `/api/v1/model-registry/models/${encodeURIComponent(modelId)}/activate`,
    { method: "POST" },
  );
}

export function activateDeployment(modelId: string, deploymentId: string) {
  return requestJson<DeploymentView>(
    `/api/v1/model-registry/models/${encodeURIComponent(modelId)}/deployments/${encodeURIComponent(deploymentId)}/activate`,
    { method: "POST" },
  );
}

export async function testModel(
  model: LogicalModelView,
): Promise<ModelTestResult> {
  const startedAt = performance.now();
  try {
    if (model.capability === "embedding") {
      const response = await requestJson<EmbeddingResponse>(
        "/api/v1/inference/embeddings",
        {
          method: "POST",
          body: JSON.stringify({
            model: model.alias,
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
        "/api/v1/inference/reranks",
        {
          method: "POST",
          body: JSON.stringify({
            model: model.alias,
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
      return {
        status: "error",
        title: "Vision smoke test needs an image",
        detail:
          "The configured VLM endpoint requires an image URL or data URI. Use registry activation here, then test VLMs from an image-aware flow.",
      };
    }

    const response = await requestJson<LlmResponse>(
      "/api/v1/inference/responses",
      {
        method: "POST",
        body: JSON.stringify({
          model: model.alias,
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
