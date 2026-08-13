import { authFetch } from "@/features/auth/model/authFetch";
import type {
  ProviderCatalogItem,
  ProviderCreateInput,
  ProviderModelCreateInput,
  ProviderModelView,
  ProviderView,
  ResourceStatus,
} from "../model/registryTypes";

export const modelServiceApiBaseUrl =
  import.meta.env.VITE_MODEL_SERVICE_API_BASE_URL ?? "/model-service";
const modelServiceApiVersion = "/api/v2";

export type ModelRegistryContext = {
  userId: string;
  organizationId: string;
  orgRole: "org_admin" | "org_member";
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

async function requestJson<T>(
  context: ModelRegistryContext,
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await authFetch(`${modelServiceApiBaseUrl}${path}`, {
    ...options,
    signal,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      "X-Consumer-Service": "axiom-fe",
      "X-User-ID": context.userId,
      "X-Org-ID": context.organizationId,
      "X-Org-Role": context.orgRole,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const body = JSON.parse(text) as { detail?: string; message?: string };
      detail = body.message ?? body.detail ?? text;
    } catch {
      // Preserve a non-JSON upstream error.
    }
    throw new ModelServiceApiError(
      detail || `Model Service request failed (${response.status}).`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function listProviderCatalog(
  context: ModelRegistryContext,
  signal?: AbortSignal,
) {
  return requestJson<ProviderCatalogItem[]>(
    context,
    `${modelServiceApiVersion}/provider-catalog`,
    {},
    signal,
  );
}

export function listProviders(
  context: ModelRegistryContext,
  signal?: AbortSignal,
) {
  return requestJson<ProviderView[]>(
    context,
    `${modelServiceApiVersion}/providers`,
    {},
    signal,
  );
}

export function createProvider(
  context: ModelRegistryContext,
  input: ProviderCreateInput,
) {
  return requestJson<ProviderView>(
    context,
    `${modelServiceApiVersion}/providers`,
    {
      method: "POST",
      body: JSON.stringify({ ...input, status: input.status ?? "inactive" }),
    },
  );
}

export function updateProvider(
  context: ModelRegistryContext,
  providerId: string,
  input: Partial<
    Pick<
      ProviderCreateInput,
      "display_name" | "source" | "base_url" | "protocol"
    >
  > & { status?: ResourceStatus },
) {
  return requestJson<ProviderView>(
    context,
    `${modelServiceApiVersion}/providers/${encodeURIComponent(providerId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function deleteProvider(
  context: ModelRegistryContext,
  providerId: string,
) {
  return requestJson<{ id: string }>(
    context,
    `${modelServiceApiVersion}/providers/${encodeURIComponent(providerId)}`,
    { method: "DELETE" },
  );
}

export function upsertProviderCredential(
  context: ModelRegistryContext,
  providerId: string,
  apiKey: string,
) {
  return requestJson(
    context,
    `${modelServiceApiVersion}/providers/${encodeURIComponent(providerId)}/credential`,
    { method: "PUT", body: JSON.stringify({ api_key: apiKey }) },
  );
}

export function testProvider(
  context: ModelRegistryContext,
  providerId: string,
) {
  return requestJson<ProviderView>(
    context,
    `${modelServiceApiVersion}/providers/${encodeURIComponent(providerId)}:test-connection`,
    { method: "POST" },
  );
}

export function listProviderModels(
  context: ModelRegistryContext,
  providerId: string,
  signal?: AbortSignal,
) {
  return requestJson<ProviderModelView[]>(
    context,
    `${modelServiceApiVersion}/providers/${encodeURIComponent(providerId)}/models`,
    {},
    signal,
  );
}

export function createProviderModel(
  context: ModelRegistryContext,
  providerId: string,
  input: ProviderModelCreateInput,
) {
  return requestJson<ProviderModelView>(
    context,
    `${modelServiceApiVersion}/providers/${encodeURIComponent(providerId)}/models`,
    {
      method: "POST",
      body: JSON.stringify({ ...input, status: input.status ?? "inactive" }),
    },
  );
}

export function updateProviderModel(
  context: ModelRegistryContext,
  resourceId: string,
  input: Partial<
    Pick<
      ProviderModelCreateInput,
      | "name"
      | "capability"
      | "max_tokens"
      | "max_context_length"
      | "status"
      | "is_default"
    >
  >,
) {
  return requestJson<ProviderModelView>(
    context,
    `${modelServiceApiVersion}/models/${encodeURIComponent(resourceId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function deleteProviderModel(
  context: ModelRegistryContext,
  resourceId: string,
) {
  return requestJson<{ id: string }>(
    context,
    `${modelServiceApiVersion}/models/${encodeURIComponent(resourceId)}`,
    { method: "DELETE" },
  );
}

export function testProviderModel(
  context: ModelRegistryContext,
  resourceId: string,
) {
  return requestJson<ProviderModelView>(
    context,
    `${modelServiceApiVersion}/models/${encodeURIComponent(resourceId)}:test`,
    { method: "POST" },
  );
}
