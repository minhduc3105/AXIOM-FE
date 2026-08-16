import { authFetch } from "@/features/auth/model/authFetch";
import type {
  ProviderCatalogItem,
  ProviderCreateInput,
  ProviderModelCreateInput,
  ProviderModelView,
  ProviderView,
  ResourceStatus,
} from "../model/registryTypes";
import {
  modelServiceRoutes,
  type DeleteResult,
  type ProviderCredentialView,
} from "./modelServiceContract";
import { normalizeProvider, normalizeProviderModel } from "./modelServiceMappers";

export const modelServiceApiBaseUrl =
  import.meta.env.VITE_MODEL_SERVICE_API_BASE_URL ?? "/model-service";

export type ModelRegistryContext = {
  userId: string;
  organizationId: string;
  orgRole: "org_admin" | "org_member";
};

export class ModelServiceApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ModelServiceApiError";
  }
}

function requireRegistryAdmin(context: ModelRegistryContext) {
  // UX/defense-in-depth only. Model Service and Gateway must independently
  // authorize every mutation from the authenticated server-side identity.
  if (context.orgRole !== "org_admin") {
    throw new ModelServiceApiError(
      "Only organization admins can change Model Service configuration.",
      403,
    );
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
    modelServiceRoutes.providerCatalog,
    {},
    signal,
  );
}

export function listProviders(
  context: ModelRegistryContext,
  signal?: AbortSignal,
) {
  return requestJson<unknown[]>(
    context,
    modelServiceRoutes.providers,
    {},
    signal,
  ).then((providers) => providers.map((provider) => normalizeProvider(provider, context.organizationId)));
}

export function getProvider(
  context: ModelRegistryContext,
  providerId: string,
) {
  return requestJson<unknown>(context, modelServiceRoutes.provider(providerId))
    .then((provider) => normalizeProvider(provider, context.organizationId));
}

export function createProvider(
  context: ModelRegistryContext,
  input: ProviderCreateInput,
) {
  requireRegistryAdmin(context);
  return requestJson<unknown>(
    context,
    modelServiceRoutes.providers,
    {
      method: "POST",
      body: JSON.stringify({ ...input, status: input.status ?? "inactive" }),
    },
  ).then((provider) => normalizeProvider(provider, context.organizationId));
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
  requireRegistryAdmin(context);
  return requestJson<unknown>(
    context,
    modelServiceRoutes.provider(providerId),
    { method: "PATCH", body: JSON.stringify(input) },
  ).then((provider) => normalizeProvider(provider, context.organizationId));
}

export function deleteProvider(
  context: ModelRegistryContext,
  providerId: string,
) {
  requireRegistryAdmin(context);
  return requestJson<DeleteResult>(
    context,
    modelServiceRoutes.provider(providerId),
    { method: "DELETE" },
  );
}

export function upsertProviderCredential(
  context: ModelRegistryContext,
  providerId: string,
  apiKey: string,
) {
  requireRegistryAdmin(context);
  return requestJson<ProviderCredentialView>(
    context,
    modelServiceRoutes.providerCredential(providerId),
    { method: "PUT", body: JSON.stringify({ api_key: apiKey }) },
  );
}

export function deleteProviderCredential(
  context: ModelRegistryContext,
  providerId: string,
) {
  requireRegistryAdmin(context);
  return requestJson<ProviderCredentialView>(
    context,
    modelServiceRoutes.providerCredential(providerId),
    { method: "DELETE" },
  );
}

export function testProvider(
  context: ModelRegistryContext,
  providerId: string,
) {
  requireRegistryAdmin(context);
  return requestJson<unknown>(
    context,
    modelServiceRoutes.providerTest(providerId),
    { method: "POST" },
  ).then((provider) => normalizeProvider(provider, context.organizationId));
}

export function listProviderModels(
  context: ModelRegistryContext,
  providerId: string,
  signal?: AbortSignal,
) {
  return requestJson<unknown[]>(
    context,
    modelServiceRoutes.providerModels(providerId),
    {},
    signal,
  ).then((models) => models.map((model) => normalizeProviderModel(model, context.organizationId)));
}

export function createProviderModel(
  context: ModelRegistryContext,
  providerId: string,
  input: ProviderModelCreateInput,
) {
  requireRegistryAdmin(context);
  return requestJson<unknown>(
    context,
    modelServiceRoutes.providerModels(providerId),
    {
      method: "POST",
      body: JSON.stringify({ ...input, status: input.status ?? "inactive" }),
    },
  ).then((model) => normalizeProviderModel(model, context.organizationId));
}

export function getProviderModel(
  context: ModelRegistryContext,
  resourceId: string,
) {
  return requestJson<unknown>(context, modelServiceRoutes.model(resourceId))
    .then((model) => normalizeProviderModel(model, context.organizationId));
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
  > & { status?: ResourceStatus },
) {
  requireRegistryAdmin(context);
  return requestJson<unknown>(
    context,
    modelServiceRoutes.model(resourceId),
    { method: "PATCH", body: JSON.stringify(input) },
  ).then((model) => normalizeProviderModel(model, context.organizationId));
}

export function deleteProviderModel(
  context: ModelRegistryContext,
  resourceId: string,
) {
  requireRegistryAdmin(context);
  return requestJson<DeleteResult>(
    context,
    modelServiceRoutes.model(resourceId),
    { method: "DELETE" },
  );
}

export function testProviderModel(
  context: ModelRegistryContext,
  resourceId: string,
) {
  requireRegistryAdmin(context);
  return requestJson<unknown>(
    context,
    modelServiceRoutes.modelTest(resourceId),
    { method: "POST" },
  ).then((model) => normalizeProviderModel(model, context.organizationId));
}
