import type {
  BatchDocumentProcessingStatusResponseDto,
  DataDashboardSnapshot,
  DataFile,
  DataHealthStatus,
  DocumentProcessingStatusDto,
  IngestionJob,
  IngestionJobDto,
  OrganizationFilesResponseDto,
} from "../model/types";
import { getBrowserStorageUrl } from "@/shared/lib/storage-url";
import { getAllFilesForJob } from "@/shared/lib/document-api";

const documentApiBaseUrl =
  import.meta.env.VITE_DOCUMENT_API_BASE_URL ?? "/document-api";
const corpusApiBaseUrl =
  import.meta.env.VITE_CORPUS_API_BASE_URL ?? "/corpus-api";

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
): DataFile {
  const name = getFileName(file.key);
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
  };
}

function normalizeIngestionJob(job: IngestionJobDto): IngestionJob {
  return {
    ...job,
    healthStatus: resolveHealthStatus(job.status, job.error_message),
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
    `${documentApiBaseUrl}/api/v1/organizations/${encodeURIComponent(organizationId)}/files`,
    { signal },
  );
}

async function listIngestionJobs(
  organizationId: string,
  signal: AbortSignal,
) {
  return getJson<IngestionJobDto[]>(
    `${documentApiBaseUrl}/api/v1/ingestions?organization_id=${encodeURIComponent(organizationId)}`,
    { signal },
  );
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
        `${corpusApiBaseUrl}/api/v1/documents/processing-status:batch-get`,
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
    normalizeFile(file, statusByKey.get(file.key)),
  );
}

export async function getDataDashboard(
  organizationId: string,
  signal: AbortSignal,
): Promise<DataDashboardSnapshot> {
  const ingestionJobsRequest = listIngestionJobs(organizationId, signal).then(
    (value) => ({ value, error: null }),
    (error: unknown) => ({ value: [] as IngestionJobDto[], error }),
  );
  const filesResponse = await listOrganizationFiles(organizationId, signal);
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
      normalizeFile(file, statusByObjectKey.get(file.key)),
    ),
    ingestionJobs: ingestionJobsResult.value
      .map(normalizeIngestionJob)
      .sort(
        (first, second) =>
          Date.parse(second.updated_at) - Date.parse(first.updated_at),
      ),
    warnings,
  };
}
