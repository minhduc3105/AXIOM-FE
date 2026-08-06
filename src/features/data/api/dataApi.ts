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
import { getBrowserStorageUrl } from "@/shared/lib/storage-url";
import { getAllFilesForJob } from "@/shared/lib/document-api";

const documentApiBaseUrl = "/api/document";
const corpusApiBaseUrl = "/api/corpus";

const successfulStatuses = new Set([
  "completed",
  "indexed",
  "ready",
  "success",
  "succeeded",
]);
const failedStatuses = new Set(["cancelled", "error", "failed"]);

export const defaultOrganizationId =
  import.meta.env.VITE_ORGANIZATION_ID ?? "test-org";

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1;
}

function isDataSourceDto(value: unknown): value is DataSourceDto {
  return isRecord(value)
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.organization_id === "string"
    && isNullableString(value.name)
    && typeof value.datasource_type === "string"
    && typeof value.created_at === "string"
    && typeof value.updated_at === "string";
}

function isDataSourceFileDto(value: unknown) {
  return isRecord(value)
    && typeof value.key === "string"
    && typeof value.name === "string"
    && isNonNegativeInteger(value.size)
    && isNullableString(value.last_modified)
    && isNullableString(value.etag)
    && typeof value.presigned_url === "string";
}

function isDataSourceFilesResponseDto(
  value: unknown,
): value is DataSourceFilesResponseDto {
  if (!isRecord(value)
    || typeof value.organization_id !== "string"
    || typeof value.datasource_id !== "string"
    || typeof value.bucket !== "string"
    || !isNonNegativeInteger(value.count)
    || !Array.isArray(value.files)
    || value.files.length !== value.count
    || !value.files.every(isDataSourceFileDto)
    || !isPositiveInteger(value.page)
    || !isPositiveInteger(value.page_size)
    || value.page_size > 100
    || !isNonNegativeInteger(value.total_count)
    || !isNonNegativeInteger(value.total_pages)
    || !isNonNegativeInteger(value.total_unfiltered_count)
    || !isRecord(value.pagination)) return false;
  return value.pagination.page === value.page
    && value.pagination.page_size === value.page_size
    && value.pagination.total_count === value.total_count
    && value.pagination.total_pages === value.total_pages
    && value.total_pages === Math.ceil(value.total_count / value.page_size)
    && value.total_unfiltered_count >= value.total_count;
}

async function getJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ? ` ${body.detail}` : "";
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
  const extension =
    name.includes(".") ? segments[segments.length - 1] : null;
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
  file: OrganizationFilesResponseDto["files"][number],
  processingStatus: DocumentProcessingStatusDto | undefined,
  context: {
    organizationId: string;
    bucket: string;
    datasourceId?: string | null;
    name?: string;
  },
): DataFile {
  const name = context.name ?? getFileName(file.key);
  const normalizedProcessingStatus = processingStatus?.status?.trim().toLowerCase();
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
    datasourceId: context.datasourceId ?? null,
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
    name: datasource.name,
    type: datasource.datasource_type,
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

async function listIngestionJobs(
  organizationId: string,
  signal: AbortSignal,
) {
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
  organizationId: string,
  bucket: string,
  objectKeys: string[],
  signal: AbortSignal,
) {
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
            organization_id: organizationId,
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
  signal: AbortSignal,
): Promise<DataFile[]> {
  const result = await getAllFilesForJob(jobId, signal);
  let statuses: DocumentProcessingStatusDto[] = [];
  if (result.files.length > 0) {
    try {
      statuses = await getProcessingStatuses(
        result.organization_id,
        result.bucket,
        result.files.map((file) => file.key),
        signal,
      );
    } catch (error) {
      if (signal.aborted) throw error;
      statuses = [];
    }
  }
  const statusByKey = new Map(statuses.map((status) => [status.object_key, status]));
  return result.files.map((file) =>
    normalizeFile(file, statusByKey.get(file.key), {
      organizationId: result.organization_id,
      datasourceId: result.datasource_id,
      bucket: result.bucket,
    }),
  );
}

export async function getDataSourceFiles(
  datasourceId: string,
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
  if (!isDataSourceFilesResponseDto(payload) || payload.datasource_id !== datasourceId) {
    throw new Error("The data source files response was invalid.");
  }
  const response = payload;
  let processingStatuses: DocumentProcessingStatusDto[] = [];
  let warning: string | null = null;
  if (response.files.length > 0) {
    try {
      processingStatuses = await getProcessingStatuses(
        response.organization_id,
        response.bucket,
        response.files.map((file) => file.key),
        signal,
      );
    } catch (error) {
      if (signal.aborted) throw error;
      warning = "Processing status is temporarily unavailable. File inventory is still current.";
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
        bucket: response.bucket,
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

export async function getDataDashboard(
  organizationId: string,
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

  let processingStatuses: DocumentProcessingStatusDto[] = [];
  if (filesResponse.files.length > 0) {
    try {
      processingStatuses = await getProcessingStatuses(
        filesResponse.organization_id,
        filesResponse.bucket,
        filesResponse.files.map((file) => file.key),
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
    bucket: filesResponse.bucket,
    bucketMetadata: filesResponse.bucket_metadata,
    files: filesResponse.files.map((file) =>
      normalizeFile(file, statusByObjectKey.get(file.key), {
        organizationId: filesResponse.organization_id,
        bucket: filesResponse.bucket,
      }),
    ),
    datasources: datasourcesResponse.map(normalizeDataSource),
    ingestionJobs: ingestionJobsResult.value
      .map(normalizeIngestionJob)
      .sort(
        (first, second) =>
          Date.parse(second.updated_at) - Date.parse(first.updated_at),
      ),
    warnings,
  };
}
