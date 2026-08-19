import type {
  DocumentProcessingStatus,
  IngestionJobResponse,
  UploadFilesResponse,
} from "../api/ingestionApi";
import type { JobFilesResult } from "../api/ingestionApi";
import type {
  DocumentProcessingBatch,
  DocumentProcessingUiStatus,
} from "./types";

export function createPendingProcessingStatus(
  objectKey: string,
): DocumentProcessingStatus {
  return {
    object_key: objectKey,
    found: false,
    run_id: null,
    document_id: null,
    status: null,
    error_message: null,
    started_at: null,
    finished_at: null,
    created_at: null,
  };
}

export function createUploadProcessingBatch(
  result: UploadFilesResponse,
): DocumentProcessingBatch {
  return {
    job_id: result.job_id,
    organization_id: result.organization_id,
    workspace_id: result.workspace_id,
    bucket: result.bucket,
    count: result.count,
    source_kind: "upload",
    files: result.files.map((file) => ({
      key: file.key,
      filename: file.filename,
      contentType: file.content_type,
    })),
  };
}

export function createConnectorProcessingBatch(
  job: IngestionJobResponse,
  filesResult: JobFilesResult,
): DocumentProcessingBatch {
  if (job.datasource_type !== "s3") {
    throw new Error(
      `Unsupported connector indexing source: ${job.datasource_type}.`,
    );
  }
  return {
    job_id: job.job_id,
    organization_id: filesResult.organization_id,
    workspace_id: job.workspace_id,
    bucket: filesResult.bucket,
    count: filesResult.count,
    source_kind: "s3",
    files: filesResult.files.map((file) => ({
      key: file.key,
      filename: null,
      contentType: null,
    })),
  };
}

export function isTerminalProcessingStatus(
  result: DocumentProcessingStatus | undefined,
) {
  return Boolean(
    result?.found &&
      (result.status === "completed" || result.status === "failed"),
  );
}

export function getDocumentProcessingUiStatus(
  results: DocumentProcessingStatus[],
): DocumentProcessingUiStatus {
  if (!results.length) return "empty";
  const allTerminal = results.every(isTerminalProcessingStatus);
  if (!allTerminal) return "polling";
  return results.some((result) => result.status === "failed")
    ? "completed_with_errors"
    : "complete";
}
