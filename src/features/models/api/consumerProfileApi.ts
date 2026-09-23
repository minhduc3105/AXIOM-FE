import { authFetch } from "@/features/auth/model/authFetch";
import { modelServiceApiBaseUrl, type ModelRegistryContext } from "./modelServiceApi";
import {
  modelServiceRoutes,
  type ConsumerProfileBatchInput,
  type ConsumerProfileBatchResponse,
} from "./consumerProfileContract";
import {
  normalizeConsumerProfileBatchResponse,
  normalizeConsumerProfiles,
} from "./consumerProfileMappers";

export class ConsumerProfileApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ConsumerProfileApiError";
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
      // Keep the upstream text when it is not JSON.
    }
    throw new ConsumerProfileApiError(detail || `Model profile request failed (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}

function requireAdmin(context: ModelRegistryContext) {
  if (context.orgRole !== "org_admin") {
    throw new ConsumerProfileApiError("Only organization admins can change model profiles.", 403);
  }
}

export function getConsumerModelProfiles(context: ModelRegistryContext, signal?: AbortSignal) {
  return requestJson<unknown>(context, modelServiceRoutes.consumerProfiles, {}, signal)
    .then(normalizeConsumerProfiles);
}

export function updateConsumerModelProfiles(
  context: ModelRegistryContext,
  input: ConsumerProfileBatchInput,
): Promise<ConsumerProfileBatchResponse> {
  requireAdmin(context);
  return requestJson<unknown>(context, modelServiceRoutes.consumerProfiles, {
    method: "PUT",
    body: JSON.stringify(input),
  }).then(normalizeConsumerProfileBatchResponse);
}

export const listConsumerModelProfiles = getConsumerModelProfiles;
