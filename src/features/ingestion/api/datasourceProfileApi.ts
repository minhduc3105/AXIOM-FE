import { authFetch } from "@/features/auth/model/authFetch";
import type {
  IngestionJobResponse,
  S3FileListResponse,
} from "./ingestionApi";

const documentApiBaseUrl =
  import.meta.env.VITE_DOCUMENT_API_BASE_URL ?? "/api/document";

export type DatasourceProfileType = "s3" | "snowflake";

export type S3DatasourceConfig = {
  region: string;
  bucket_name: string;
  endpoint_url?: string | null;
};

export type SnowflakeDatasourceConfig = {
  account: string;
  user: string;
  warehouse?: string | null;
  database?: string | null;
  schema?: string | null;
  role?: string | null;
};

export type S3DatasourceCredentials = {
  aws_access_key_id: string;
  aws_secret_access_key: string;
};

export type SnowflakeDatasourceCredentials = {
  private_key: string;
  private_key_passphrase?: string | null;
};

export type DatasourceProfileResponse = {
  datasource_id: string;
  organization_id: string;
  workspace_id: string;
  name: string | null;
  datasource_type: DatasourceProfileType;
  status: string;
  current_profile_version: number;
  credentials_configured: boolean;
  connector_config: Record<string, unknown>;
  created: boolean;
};

type DatasourceProfileConfig =
  | S3DatasourceConfig
  | SnowflakeDatasourceConfig;
type DatasourceProfileCredentials =
  | S3DatasourceCredentials
  | SnowflakeDatasourceCredentials;

type CreateDatasourceProfileInput = {
  workspaceId: string;
  name: string;
  datasourceType: DatasourceProfileType;
  connectorConfig: DatasourceProfileConfig;
  credentials: DatasourceProfileCredentials;
  idempotencyKey?: string;
};

type UpdateDatasourceProfileInput = Omit<
  CreateDatasourceProfileInput,
  "workspaceId" | "datasourceType"
> & {
  datasourceId: string;
  idempotencyKey?: string;
};

export type SavedDatasourceIngestionOptions = {
  s3Keys?: string[];
  discoverTables?: boolean;
  discoverStages?: boolean;
  stagePattern?: string | null;
  tableLimit?: number | null;
  stageLimit?: number | null;
};

function profilePath(suffix = "") {
  return `${documentApiBaseUrl}${suffix}`;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object") {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await authFetch(profilePath(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, `Datasource request failed (${response.status}).`),
    );
  }
  return payload as T;
}

function idempotencyKey(value?: string) {
  return value?.trim() || crypto.randomUUID();
}

export function createDatasourceProfile(input: CreateDatasourceProfileInput) {
  if (!input.workspaceId.trim()) throw new Error("Choose a workspace first.");
  if (!input.name.trim()) throw new Error("Source name is required.");
  return requestJson<DatasourceProfileResponse>("/datasources", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey(input.idempotencyKey) },
    body: JSON.stringify({
      workspace_id: input.workspaceId,
      name: input.name.trim(),
      datasource_type: input.datasourceType,
      connector_config: input.connectorConfig,
      credentials: input.credentials,
    }),
  });
}

export function updateDatasourceProfile(input: UpdateDatasourceProfileInput) {
  if (!input.datasourceId.trim()) throw new Error("Datasource ID is required.");
  if (!input.name.trim()) throw new Error("Source name is required.");
  return requestJson<DatasourceProfileResponse>(
    `/datasources/${encodeURIComponent(input.datasourceId)}/profile-versions`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey(input.idempotencyKey) },
      body: JSON.stringify({
        name: input.name.trim(),
        connector_config: input.connectorConfig,
        credentials: input.credentials,
      }),
    },
  );
}

export function getDatasourceProfile(datasourceId: string) {
  return requestJson<DatasourceProfileResponse>(
    `/datasources/${encodeURIComponent(datasourceId)}`,
  );
}

export function listSavedS3Files(
  datasourceId: string,
  maxKeys = 100,
  nextToken: string | null = null,
  signal?: AbortSignal,
) {
  return requestJson<S3FileListResponse>(
    `/datasources/${encodeURIComponent(datasourceId)}/s3/files:list`,
    {
      method: "POST",
      signal,
      body: JSON.stringify({ maxKey: maxKeys, nextToken }),
    },
  );
}

export function startSavedDatasourceIngestion(input: {
  datasourceId: string;
  profileVersion?: number | null;
  options?: SavedDatasourceIngestionOptions;
  signal?: AbortSignal;
}) {
  const options = input.options ?? {};
  return requestJson<IngestionJobResponse>("/ingestions", {
    method: "POST",
    signal: input.signal,
    body: JSON.stringify({
      datasource_id: input.datasourceId,
      ...(input.profileVersion
        ? { profile_version: input.profileVersion }
        : {}),
      request_options: {
        ...(options.s3Keys ? { s3_keys: options.s3Keys } : {}),
        ...(options.discoverTables === undefined
          ? {}
          : { discover_tables: options.discoverTables }),
        ...(options.discoverStages === undefined
          ? {}
          : { discover_stages: options.discoverStages }),
        ...(options.stagePattern === undefined
          ? {}
          : { stage_pattern: options.stagePattern }),
        ...(options.tableLimit === undefined
          ? {}
          : { table_limit: options.tableLimit }),
        ...(options.stageLimit === undefined
          ? {}
          : { stage_limit: options.stageLimit }),
      },
    }),
  });
}
