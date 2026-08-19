import type {
  GlobalIngestionJob,
  GlobalIngestionObject,
  GlobalIngestionState,
} from "./globalIngestionTypes";
import type { DocumentProcessingBatch } from "./types";

const sourceValues = new Set(["upload", "s3"]);
const jobStatusValues = new Set([
  "submitting",
  "transferring",
  "processing",
  "complete",
  "partial_failure",
  "failed",
]);
const objectStatusValues = new Set([
  "waiting",
  "processing",
  "indexed",
  "failed",
]);
const retryValues = new Set([
  "retry_processing",
  "retry_job_status",
  "retry_file_discovery",
  "start_new_upload",
]);

function storageKey(organizationId: string, workspaceId: string) {
  return `axiom:ingestion:${organizationId}:${workspaceId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isBatch(value: unknown): value is DocumentProcessingBatch | null {
  if (value === null) return true;
  if (!isRecord(value) || !Array.isArray(value.files)) return false;
  return (
    typeof value.job_id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.workspace_id === "string" &&
    typeof value.bucket === "string" &&
    typeof value.count === "number" &&
    (value.source_kind === "upload" || value.source_kind === "s3") &&
    value.files.every(
      (file) =>
        isRecord(file) &&
        typeof file.key === "string" &&
        isNullableString(file.filename) &&
        isNullableString(file.contentType),
    )
  );
}

function isObject(value: unknown): value is GlobalIngestionObject {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.name === "string" &&
    typeof value.status === "string" &&
    objectStatusValues.has(value.status) &&
    isNullableString(value.runId) &&
    isNullableString(value.documentId) &&
    isNullableString(value.errorMessage)
  );
}

function isJob(value: unknown): value is GlobalIngestionJob {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    sourceValues.has(value.source) &&
    typeof value.title === "string" &&
    typeof value.status === "string" &&
    jobStatusValues.has(value.status) &&
    isNullableString(value.serverJobId) &&
    isBatch(value.batch) &&
    Array.isArray(value.objects) &&
    value.objects.every(isObject) &&
    isNullableString(value.errorMessage) &&
    (value.retry === null ||
      (typeof value.retry === "string" && retryValues.has(value.retry))) &&
    typeof value.createdAt === "string"
  );
}

function toStoredJob(job: GlobalIngestionJob): GlobalIngestionJob {
  return {
    id: job.id,
    source: job.source,
    title: job.title,
    status: job.status,
    serverJobId: job.serverJobId,
    batch: job.batch,
    objects: job.objects.map((object) => ({
      key: object.key,
      name: object.name,
      status: object.status,
      runId: object.runId,
      documentId: object.documentId,
      errorMessage: object.errorMessage,
    })),
    errorMessage: job.errorMessage,
    retry: job.retry,
    createdAt: job.createdAt,
  };
}

export function writeStoredIngestionJobs(
  organizationId: string,
  workspaceId: string,
  jobs: GlobalIngestionJob[],
) {
  if (!organizationId.trim() || !workspaceId.trim()) return;
  window.sessionStorage.setItem(
    storageKey(organizationId, workspaceId),
    JSON.stringify(jobs.map(toStoredJob)),
  );
}

export function readStoredIngestionJobs(
  organizationId: string,
  workspaceId: string,
): GlobalIngestionState["jobs"] {
  if (!organizationId.trim() || !workspaceId.trim()) return [];
  const value = window.sessionStorage.getItem(storageKey(organizationId, workspaceId));
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(isJob) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearStoredIngestionJobs(
  organizationId: string,
  workspaceId: string,
) {
  if (!organizationId.trim() || !workspaceId.trim()) return;
  window.sessionStorage.removeItem(storageKey(organizationId, workspaceId));
}
