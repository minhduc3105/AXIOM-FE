import type {
  BatchDocumentProcessingStatusResponseDto,
  DataDashboardSnapshot,
  DataFile,
  DataHealthStatus,
  DataSource,
  DataSourceDto,
  DataSourceFilesPage,
  DataSourceFilesQuery,
  DataSourceFilesResponseDto,
  DocumentProcessingStatusDto,
  IngestionJob,
  IngestionJobDto,
  OrganizationFilesResponseDto,
} from "../model/types";
import { authFetch } from "@/features/auth/model/authFetch";
import { getBrowserStorageUrl } from "@/shared/lib/storage-url";
import { getAllFilesForJob } from "@/shared/lib/document-api";
import { filterWorkspaceRecords } from "../model/workspaceScope";

const documentApiBaseUrl =
  import.meta.env.VITE_DOCUMENT_API_BASE_URL ?? "/api/document";
const corpusApiBaseUrl =
  import.meta.env.VITE_CORPUS_API_BASE_URL ?? "/api/corpus";

const successfulStatuses = new Set([
  "completed",
  "indexed",
  "ready",
  "success",
  "succeeded",
]);
const failedStatuses = new Set(["cancelled", "error", "failed"]);

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export type IndexingJobStatus =
  | "queued"
  | "running"
  | "cancel_requested"
  | "activating"
  | "cancelled"
  | "completed"
  | "failed";

export type IndexingJob = {
  job_id: string;
  dataset_id: string | null;
  document_id: string;
  organization_id: string;
  workspace_id: string;
  bucket: string;
  object_key: string;
  source_etag: string;
  processing_profile_id: string;
  processing_profile_version: string;
  job_type: "initial_process" | "reprocess" | "reindex";
  root_job_id: string;
  attempt_number: number;
  requested_by: string | null;
  status: IndexingJobStatus;
  current_stage: string | null;
  worker_id: string | null;
  heartbeat_at: string | null;
  lease_expires_at: string | null;
  cancel_requested_at: string | null;
  cancel_requested_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  error_code: string | null;
  error_message: string | null;
  retryable: boolean | null;
  failed_stage: string | null;
  created_at: string;
  updated_at: string;
};

export type CancelIndexingJobResponse = {
  job_id: string;
  status: IndexingJobStatus;
  cancel_applied: boolean;
  requested_at: string | null;
};

export type RetryIndexingJobResponse = {
  job_id: string;
  root_job_id: string;
  attempt_number: number;
  status: IndexingJobStatus;
  created: boolean;
  reused_reason: "idempotency" | "active_attempt" | null;
};

export type ReprocessIndexingJobResponse = {
  job_id: string;
  root_job_id: string;
  attempt_number: 1;
  job_type: "reprocess";
  status: IndexingJobStatus;
  created: boolean;
  reused_reason: "idempotency" | null;
};

export type ReprocessIndexingFileOptions = {
  processingProfileId?: string;
  processingProfileVersion?: string;
  signal?: AbortSignal;
};

export type FilePurgePreviewItem = {
  dataset_id: string;
  file_name: string;
  workspace_id: string;
  size_bytes: number;
};

export type FilePurgePreviewResponse = {
  operation_id: string;
  file_count: number;
  total_size_bytes: number;
  files: FilePurgePreviewItem[];
};

export type FilePurgeOperationItem = {
  dataset_id: string;
  workspace_id: string;
  status: "pending" | "deleting" | "deleted" | "failed";
  error_code: string | null;
};

export type FilePurgeOperationResponse = {
  operation_id: string;
  status: "awaiting_confirmation" | "running" | "completed" | "failed";
  file_count: number;
  items: FilePurgeOperationItem[];
  created_at: string;
  finished_at: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNullableBoolean(value: unknown): value is boolean | null {
  return typeof value === "boolean" || value === null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1;
}

const indexingJobStatuses = new Set<IndexingJobStatus>([
  "queued",
  "running",
  "cancel_requested",
  "activating",
  "cancelled",
  "completed",
  "failed",
]);

function isIndexingJob(value: unknown): value is IndexingJob {
  if (!isRecord(value)) return false;
  return (
    typeof value.job_id === "string" &&
    isNullableString(value.dataset_id) &&
    typeof value.document_id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.workspace_id === "string" &&
    typeof value.bucket === "string" &&
    typeof value.object_key === "string" &&
    typeof value.source_etag === "string" &&
    typeof value.processing_profile_id === "string" &&
    typeof value.processing_profile_version === "string" &&
    ["initial_process", "reprocess", "reindex"].includes(
      value.job_type as string,
    ) &&
    typeof value.root_job_id === "string" &&
    isPositiveInteger(value.attempt_number) &&
    isNullableString(value.requested_by) &&
    indexingJobStatuses.has(value.status as IndexingJobStatus) &&
    isNullableString(value.current_stage) &&
    isNullableString(value.worker_id) &&
    isNullableString(value.heartbeat_at) &&
    isNullableString(value.lease_expires_at) &&
    isNullableString(value.cancel_requested_at) &&
    isNullableString(value.cancel_requested_by) &&
    isNullableString(value.started_at) &&
    isNullableString(value.finished_at) &&
    isNullableString(value.error_code) &&
    isNullableString(value.error_message) &&
    isNullableBoolean(value.retryable) &&
    isNullableString(value.failed_stage) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isFilePurgePreviewResponse(
  value: unknown,
): value is FilePurgePreviewResponse {
  if (
    !isRecord(value) ||
    typeof value.operation_id !== "string" ||
    !isPositiveInteger(value.file_count) ||
    !isNonNegativeInteger(value.total_size_bytes) ||
    !Array.isArray(value.files) ||
    value.files.length !== value.file_count
  )
    return false;
  return value.files.every(
    (item) =>
      isRecord(item) &&
      typeof item.dataset_id === "string" &&
      typeof item.file_name === "string" &&
      typeof item.workspace_id === "string" &&
      isNonNegativeInteger(item.size_bytes),
  );
}

function isFilePurgeOperationResponse(
  value: unknown,
): value is FilePurgeOperationResponse {
  const operationStatuses = new Set([
    "awaiting_confirmation",
    "running",
    "completed",
    "failed",
  ]);
  const itemStatuses = new Set(["pending", "deleting", "deleted", "failed"]);
  if (
    !isRecord(value) ||
    typeof value.operation_id !== "string" ||
    !operationStatuses.has(value.status as string) ||
    !isPositiveInteger(value.file_count) ||
    !Array.isArray(value.items) ||
    value.items.length !== value.file_count ||
    typeof value.created_at !== "string" ||
    !isNullableString(value.finished_at)
  )
    return false;
  return value.items.every(
    (item) =>
      isRecord(item) &&
      typeof item.dataset_id === "string" &&
      typeof item.workspace_id === "string" &&
      itemStatuses.has(item.status as string) &&
      isNullableString(item.error_code),
  );
}

function isCancelIndexingJobResponse(
  value: unknown,
): value is CancelIndexingJobResponse {
  return (
    isRecord(value) &&
    typeof value.job_id === "string" &&
    indexingJobStatuses.has(value.status as IndexingJobStatus) &&
    typeof value.cancel_applied === "boolean" &&
    isNullableString(value.requested_at)
  );
}

function isRetryIndexingJobResponse(
  value: unknown,
): value is RetryIndexingJobResponse {
  return (
    isRecord(value) &&
    typeof value.job_id === "string" &&
    typeof value.root_job_id === "string" &&
    isPositiveInteger(value.attempt_number) &&
    indexingJobStatuses.has(value.status as IndexingJobStatus) &&
    typeof value.created === "boolean" &&
    (value.reused_reason === null ||
      value.reused_reason === "idempotency" ||
      value.reused_reason === "active_attempt")
  );
}

function isReprocessIndexingJobResponse(
  value: unknown,
): value is ReprocessIndexingJobResponse {
  return (
    isRecord(value) &&
    typeof value.job_id === "string" &&
    typeof value.root_job_id === "string" &&
    value.attempt_number === 1 &&
    value.job_type === "reprocess" &&
    indexingJobStatuses.has(value.status as IndexingJobStatus) &&
    typeof value.created === "boolean" &&
    (value.reused_reason === null || value.reused_reason === "idempotency")
  );
}

function isDataSourceDto(value: unknown): value is DataSourceDto {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.organization_id === "string" &&
    typeof value.workspace_id === "string" &&
    isNullableString(value.name) &&
    typeof value.datasource_type === "string" &&
    (value.status === undefined || typeof value.status === "string") &&
    (value.current_profile_version === undefined ||
      value.current_profile_version === null ||
      isPositiveInteger(value.current_profile_version)) &&
    (value.credentials_configured === undefined ||
      typeof value.credentials_configured === "boolean") &&
    (value.connector_config === undefined ||
      isRecord(value.connector_config)) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isDataSourceFileDto(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.name === "string" &&
    isNonNegativeInteger(value.size) &&
    isNullableString(value.last_modified) &&
    isNullableString(value.etag) &&
    typeof value.presigned_url === "string"
  );
}

function isDataSourceFilesResponseDto(
  value: unknown,
): value is DataSourceFilesResponseDto {
  if (
    !isRecord(value) ||
    typeof value.organization_id !== "string" ||
    typeof value.datasource_id !== "string" ||
    typeof value.bucket !== "string" ||
    !isNonNegativeInteger(value.count) ||
    !Array.isArray(value.files) ||
    value.files.length !== value.count ||
    !value.files.every(isDataSourceFileDto) ||
    !isPositiveInteger(value.page) ||
    !isPositiveInteger(value.page_size) ||
    value.page_size > 100 ||
    !isNonNegativeInteger(value.total_count) ||
    !isNonNegativeInteger(value.total_pages) ||
    !isNonNegativeInteger(value.total_unfiltered_count) ||
    !isRecord(value.pagination)
  )
    return false;
  return (
    value.pagination.page === value.page &&
    value.pagination.page_size === value.page_size &&
    value.pagination.total_count === value.total_count &&
    value.pagination.total_pages === value.total_pages &&
    value.total_pages === Math.ceil(value.total_count / value.page_size) &&
    value.total_unfiltered_count >= value.total_count
  );
}

async function getJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as unknown;
      if (isRecord(body)) {
        if (typeof body.detail === "string") {
          detail = ` ${body.detail}`;
        } else if (
          isRecord(body.detail) &&
          typeof body.detail.message === "string"
        ) {
          detail = ` ${body.detail.message}`;
        }
      }
    } catch {
      detail = "";
    }
    throw new ApiRequestError(
      `API request failed (${response.status}).${detail}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

function resolveHealthStatus(
  status: string | null,
  errorMessage?: string | null,
): DataHealthStatus {
  if (errorMessage) return "failed";

  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  if (successfulStatuses.has(normalizedStatus)) return "success";
  if (failedStatuses.has(normalizedStatus)) return "failed";
  return "processing";
}

function getFileName(key: string) {
  const segments = key.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? key;
}

function getFileType(name: string) {
  const segments = name.split(".");
  const extension = name.includes(".") ? segments[segments.length - 1] : null;
  return extension ? `${extension.toUpperCase()} file` : "File";
}

function getStatusDetail(
  processingStatus: DocumentProcessingStatusDto | undefined,
) {
  if (!processingStatus?.found) return "Awaiting processing";
  if (processingStatus.error_message) return "Processing failed";

  const status = processingStatus.status?.trim().toLowerCase();
  if (!status) return "Processing";
  return status.split("_").join(" ");
}

export function normalizeFile(
  file: Omit<OrganizationFilesResponseDto["files"][number], "workspace_id"> & {
    workspace_id?: string;
  },
  processingStatus: DocumentProcessingStatusDto | undefined,
  context: {
    organizationId: string;
    bucket: string;
    workspaceId: string;
    datasourceId?: string | null;
    datasetId?: string | null;
    name?: string;
  },
): DataFile {
  const name = context.name ?? getFileName(file.key);
  const normalizedProcessingStatus = processingStatus?.status
    ?.trim()
    .toLowerCase();
  return {
    key: file.key,
    name,
    type: getFileType(name),
    size: file.size,
    lastModified: file.last_modified,
    etag: file.etag,
    downloadUrl: getBrowserStorageUrl(file.presigned_url),
    status: resolveHealthStatus(
      processingStatus?.status ?? null,
      processingStatus?.error_message,
    ),
    sourceStatus: processingStatus?.status ?? null,
    statusDetail: getStatusDetail(processingStatus),
    errorMessage: processingStatus?.error_message ?? null,
    organizationId: context.organizationId,
    workspaceId: context.workspaceId,
    datasourceId: context.datasourceId ?? null,
    datasetId: context.datasetId ?? null,
    bucket: context.bucket,
    runId: processingStatus?.run_id ?? null,
    documentId: processingStatus?.document_id ?? null,
    canInspect: Boolean(
      processingStatus?.found && normalizedProcessingStatus === "completed",
    ),
  };
}

function normalizeIngestionJob(job: IngestionJobDto): IngestionJob {
  return {
    job_id: job.job_id,
    datasource_id: job.datasource_id,
    organization_id: job.organization_id,
    workspace_id: job.workspace_id,
    datasource_type: job.datasource_type,
    status: job.status,
    records_pulled: job.records_pulled,
    objects_written: job.objects_written,
    manifest: job.manifest,
    error_message: job.error_message,
    created_at: job.created_at,
    updated_at: job.updated_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
    healthStatus: resolveHealthStatus(job.status, job.error_message),
  };
}

function normalizeDataSource(datasource: DataSourceDto): DataSource {
  return {
    id: datasource.id,
    organizationId: datasource.organization_id,
    workspaceId: datasource.workspace_id,
    name: datasource.name,
    type: datasource.datasource_type,
    status: datasource.status ?? "active",
    currentProfileVersion: datasource.current_profile_version ?? null,
    credentialsConfigured: datasource.credentials_configured ?? false,
    connectorConfig: datasource.connector_config ?? {},
    createdAt: datasource.created_at,
    updatedAt: datasource.updated_at,
  };
}

function chunkObjectKeys(objectKeys: string[], size = 100) {
  return Array.from(
    { length: Math.ceil(objectKeys.length / size) },
    (_, index) => objectKeys.slice(index * size, (index + 1) * size),
  );
}

async function listOrganizationFiles(
  organizationId: string,
  signal: AbortSignal,
) {
  return getJson<OrganizationFilesResponseDto>(
    `${documentApiBaseUrl}/organizations/${encodeURIComponent(organizationId)}/files`,
    { signal },
  );
}

async function listIngestionJobs(organizationId: string, signal: AbortSignal) {
  return getJson<IngestionJobDto[]>(
    `${documentApiBaseUrl}/ingestions?organization_id=${encodeURIComponent(organizationId)}`,
    { signal },
  );
}

async function listDataSources(organizationId: string, signal: AbortSignal) {
  const payload = await getJson<unknown>(
    `${documentApiBaseUrl}/organizations/${encodeURIComponent(organizationId)}/datasources`,
    { signal },
  );
  if (!Array.isArray(payload) || !payload.every(isDataSourceDto)) {
    throw new Error("The data source list response was invalid.");
  }
  return payload;
}

export async function getProcessingStatuses(
  workspaceId: string,
  bucket: string,
  objectKeys: string[],
  signal: AbortSignal,
) {
  const normalizedWorkspaceId = workspaceId.trim();
  if (!normalizedWorkspaceId) {
    throw new Error("A workspace ID is required for processing status.");
  }
  const batches = chunkObjectKeys(objectKeys);
  const responses = await Promise.all(
    batches.map((batch) =>
      getJson<BatchDocumentProcessingStatusResponseDto>(
        `${corpusApiBaseUrl}/documents/processing-status:batch-get`,
        {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: normalizedWorkspaceId,
            bucket,
            object_keys: batch,
          }),
        },
      ),
    ),
  );

  return responses.flatMap((response) => response.results);
}

export async function getDataFilesForJob(
  jobId: string,
  workspaceId: string,
  signal: AbortSignal,
): Promise<DataFile[]> {
  const result = await getAllFilesForJob(jobId, signal);
  let statuses: DocumentProcessingStatusDto[] = [];
  if (result.files.length > 0) {
    try {
      statuses = await getProcessingStatuses(
        workspaceId,
        result.bucket,
        result.files.map((file) => file.key),
        signal,
      );
    } catch (error) {
      if (signal.aborted) throw error;
      statuses = [];
    }
  }
  const statusByKey = new Map(
    statuses.map((status) => [status.object_key, status]),
  );
  return result.files.map((file) =>
    normalizeFile(file, statusByKey.get(file.key), {
      organizationId: result.organization_id,
      datasourceId: result.datasource_id,
      datasetId: file.dataset_id,
      bucket: result.bucket,
      workspaceId,
    }),
  );
}

export async function getDataSourceFiles(
  datasourceId: string,
  workspaceId: string,
  query: DataSourceFilesQuery,
  signal: AbortSignal,
): Promise<DataSourceFilesPage> {
  const searchParams = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
  });
  const search = query.search.trim();
  if (search) searchParams.set("search", search);

  const payload = await getJson<unknown>(
    `${documentApiBaseUrl}/datasources/${encodeURIComponent(datasourceId)}/files?${searchParams}`,
    { signal },
  );
  if (
    !isDataSourceFilesResponseDto(payload) ||
    payload.datasource_id !== datasourceId
  ) {
    throw new Error("The data source files response was invalid.");
  }
  const response = payload;
  let processingStatuses: DocumentProcessingStatusDto[] = [];
  let warning: string | null = null;
  if (response.files.length > 0) {
    try {
      processingStatuses = await getProcessingStatuses(
        workspaceId,
        response.bucket,
        response.files.map((file) => file.key),
        signal,
      );
    } catch (error) {
      if (signal.aborted) throw error;
      warning =
        "Processing status is temporarily unavailable. File inventory is still current.";
    }
  }

  const statusByObjectKey = new Map(
    processingStatuses.map((status) => [status.object_key, status]),
  );
  return {
    organizationId: response.organization_id,
    datasourceId: response.datasource_id,
    bucket: response.bucket,
    files: response.files.map((file) =>
      normalizeFile(file, statusByObjectKey.get(file.key), {
        organizationId: response.organization_id,
        datasourceId: response.datasource_id,
        datasetId: file.dataset_id,
        bucket: response.bucket,
        workspaceId,
        name: file.name,
      }),
    ),
    page: response.page,
    pageSize: response.page_size,
    totalCount: response.total_count,
    totalPages: response.total_pages,
    totalUnfilteredCount: response.total_unfiltered_count,
    warning,
  };
}

export async function getDataSourceFileCount(
  datasourceId: string,
  signal: AbortSignal,
): Promise<number> {
  const searchParams = new URLSearchParams({
    page: "1",
    page_size: "1",
    sort_by: "last_modified",
    sort_order: "desc",
  });
  const payload = await getJson<unknown>(
    `${documentApiBaseUrl}/datasources/${encodeURIComponent(datasourceId)}/files?${searchParams}`,
    { signal },
  );
  if (
    !isDataSourceFilesResponseDto(payload) ||
    payload.datasource_id !== datasourceId
  ) {
    throw new Error("The data source file count response was invalid.");
  }
  return payload.total_unfiltered_count;
}

export async function previewFilePurge(
  datasetIds: string[],
  signal?: AbortSignal,
): Promise<FilePurgePreviewResponse> {
  const normalizedDatasetIds = Array.from(
    new Set(datasetIds.map((datasetId) => datasetId.trim()).filter(Boolean)),
  );
  if (!normalizedDatasetIds.length) {
    throw new Error("At least one dataset ID is required to delete files.");
  }
  if (normalizedDatasetIds.length > 100) {
    throw new Error("You can delete at most 100 files at a time.");
  }

  const payload = await getJson<unknown>(
    `${documentApiBaseUrl}/files:purge-preview`,
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_ids: normalizedDatasetIds }),
    },
  );
  if (!isFilePurgePreviewResponse(payload)) {
    throw new Error("The file deletion preview response was invalid.");
  }
  return payload;
}

export async function confirmFilePurge(
  operationId: string,
  signal?: AbortSignal,
): Promise<FilePurgeOperationResponse> {
  const normalizedOperationId = operationId.trim();
  if (!normalizedOperationId) {
    throw new Error("A file deletion operation ID is required.");
  }

  const payload = await getJson<unknown>(
    `${documentApiBaseUrl}/file-purge-operations/${encodeURIComponent(normalizedOperationId)}:confirm`,
    { method: "POST", signal },
  );
  if (!isFilePurgeOperationResponse(payload)) {
    throw new Error("The file deletion response was invalid.");
  }
  return payload;
}

export async function getFilePurgeOperation(
  operationId: string,
  signal?: AbortSignal,
): Promise<FilePurgeOperationResponse> {
  const normalizedOperationId = operationId.trim();
  if (!normalizedOperationId) {
    throw new Error("A file deletion operation ID is required.");
  }

  const payload = await getJson<unknown>(
    `${documentApiBaseUrl}/file-purge-operations/${encodeURIComponent(normalizedOperationId)}`,
    { signal },
  );
  if (!isFilePurgeOperationResponse(payload)) {
    throw new Error("The file deletion status response was invalid.");
  }
  return payload;
}

export async function purgeDataFile(
  datasetId: string,
  signal?: AbortSignal,
): Promise<FilePurgeOperationResponse> {
  return purgeDataFiles([datasetId], signal);
}

export async function purgeDataFiles(
  datasetIds: string[],
  signal?: AbortSignal,
): Promise<FilePurgeOperationResponse> {
  const preview = await previewFilePurge(datasetIds, signal);
  return confirmFilePurge(preview.operation_id, signal);
}

export async function retryIndexingFile(
  datasetId: string,
  signal?: AbortSignal,
): Promise<RetryIndexingJobResponse> {
  const latestJob = await getLatestIndexingJob(datasetId, signal);
  if (latestJob.status !== "failed") {
    throw new Error(
      "Retry is only available after the latest indexing attempt fails.",
    );
  }
  return retryIndexingJob(latestJob.job_id, crypto.randomUUID(), signal);
}

export async function getLatestIndexingJob(
  datasetId: string,
  signal?: AbortSignal,
): Promise<IndexingJob> {
  const normalizedDatasetId = datasetId.trim();
  if (!normalizedDatasetId) throw new Error("A dataset ID is required.");

  const payload = await getJson<unknown>(
    `${corpusApiBaseUrl}/indexing-jobs/latest?dataset_id=${encodeURIComponent(normalizedDatasetId)}`,
    { signal },
  );
  if (!isIndexingJob(payload)) {
    throw new Error("The latest indexing job response was invalid.");
  }
  return payload;
}

export async function cancelIndexingJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<CancelIndexingJobResponse> {
  const normalizedJobId = jobId.trim();
  if (!normalizedJobId) throw new Error("An indexing job ID is required.");

  const payload = await getJson<unknown>(
    `${corpusApiBaseUrl}/indexing-jobs/${encodeURIComponent(normalizedJobId)}:cancel`,
    { method: "POST", signal },
  );
  if (!isCancelIndexingJobResponse(payload)) {
    throw new Error("The indexing cancellation response was invalid.");
  }
  return payload;
}

export async function retryIndexingJob(
  jobId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<RetryIndexingJobResponse> {
  const normalizedJobId = jobId.trim();
  const normalizedIdempotencyKey = idempotencyKey.trim();
  if (!normalizedJobId) throw new Error("An indexing job ID is required.");
  if (!normalizedIdempotencyKey) {
    throw new Error("An idempotency key is required to retry indexing.");
  }

  const payload = await getJson<unknown>(
    `${corpusApiBaseUrl}/indexing-jobs/${encodeURIComponent(normalizedJobId)}:retry`,
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": normalizedIdempotencyKey,
      },
    },
  );
  if (!isRetryIndexingJobResponse(payload)) {
    throw new Error("The indexing retry response was invalid.");
  }
  return payload;
}

export async function reprocessIndexingFile(
  datasetId: string,
  idempotencyKey: string,
  options: ReprocessIndexingFileOptions = {},
): Promise<ReprocessIndexingJobResponse> {
  const normalizedDatasetId = datasetId.trim();
  const normalizedIdempotencyKey = idempotencyKey.trim();
  if (!normalizedDatasetId) throw new Error("A dataset ID is required.");
  if (!normalizedIdempotencyKey) {
    throw new Error("An idempotency key is required to reprocess indexing.");
  }

  const processingProfileId = options.processingProfileId?.trim() ?? "";
  const processingProfileVersion =
    options.processingProfileVersion?.trim() ?? "";
  if (Boolean(processingProfileId) !== Boolean(processingProfileVersion)) {
    throw new Error(
      "Processing profile ID and version must be supplied together.",
    );
  }

  const body: Record<string, string> = { dataset_id: normalizedDatasetId };
  if (processingProfileId) {
    body.processing_profile_id = processingProfileId;
  }
  if (processingProfileVersion) {
    body.processing_profile_version = processingProfileVersion;
  }

  const payload = await getJson<unknown>(
    `${corpusApiBaseUrl}/indexing-jobs:reprocess`,
    {
      method: "POST",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": normalizedIdempotencyKey,
      },
      body: JSON.stringify(body),
    },
  );
  if (!isReprocessIndexingJobResponse(payload)) {
    throw new Error("The indexing reprocess response was invalid.");
  }
  return payload;
}

export async function getDataDashboard(
  organizationId: string,
  workspaceId: string,
  signal: AbortSignal,
): Promise<DataDashboardSnapshot> {
  const ingestionJobsRequest = listIngestionJobs(organizationId, signal).then(
    (value) => ({ value, error: null }),
    (error: unknown) => ({ value: [] as IngestionJobDto[], error }),
  );
  const [filesResponse, datasourcesResponse] = await Promise.all([
    listOrganizationFiles(organizationId, signal),
    listDataSources(organizationId, signal),
  ]);
  const warnings: string[] = [];
  const scoped = filterWorkspaceRecords(
    filesResponse.files,
    datasourcesResponse,
    (await ingestionJobsRequest).value,
    workspaceId,
  );

  let processingStatuses: DocumentProcessingStatusDto[] = [];
  if (scoped.files.length > 0) {
    try {
      processingStatuses = await getProcessingStatuses(
        workspaceId,
        filesResponse.bucket,
        scoped.files.map((file) => file.key),
        signal,
      );
    } catch (error) {
      if (signal.aborted) throw error;
      warnings.push(
        "Corpus status is temporarily unavailable. Files are shown as processing.",
      );
    }
  }

  const ingestionJobsResult = await ingestionJobsRequest;
  if (signal.aborted && ingestionJobsResult.error) {
    throw ingestionJobsResult.error;
  }
  if (ingestionJobsResult.error) {
    warnings.push(
      "Ingestion history is temporarily unavailable. File inventory is still current.",
    );
  }

  const statusByObjectKey = new Map(
    processingStatuses.map((status) => [status.object_key, status]),
  );

  return {
    organizationId: filesResponse.organization_id,
    workspaceId,
    bucket: filesResponse.bucket,
    bucketMetadata: filesResponse.bucket_metadata,
    files: scoped.files.map((file) =>
      normalizeFile(file, statusByObjectKey.get(file.key), {
        organizationId: filesResponse.organization_id,
        bucket: filesResponse.bucket,
        workspaceId,
        datasetId: file.dataset_id,
      }),
    ),
    datasources: scoped.datasources.map(normalizeDataSource),
    ingestionJobs: scoped.jobs
      .map(normalizeIngestionJob)
      .sort(
        (first, second) =>
          Date.parse(second.updated_at) - Date.parse(first.updated_at),
      ),
    warnings,
  };
}
