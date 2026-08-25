import type { DocumentProcessingBatch } from "./types";

export type GlobalIngestionSource = "upload" | "s3";

export type GlobalIngestionJobStatus =
  | "submitting"
  | "transferring"
  | "processing"
  | "complete"
  | "partial_failure"
  | "failed";

export type GlobalIngestionObjectStatus =
  | "waiting"
  | "processing"
  | "indexed"
  | "failed";

export type GlobalIngestionRetry =
  | "retry_processing"
  | "retry_job_status"
  | "retry_file_discovery"
  | "retry_upload_confirmation"
  | "start_new_upload"
  | null;

export type GlobalIngestionObject = {
  key: string;
  name: string;
  status: GlobalIngestionObjectStatus;
  runId: string | null;
  documentId: string | null;
  errorMessage: string | null;
};

export type GlobalIngestionJob = {
  id: string;
  source: GlobalIngestionSource;
  title: string;
  status: GlobalIngestionJobStatus;
  serverJobId: string | null;
  batch: DocumentProcessingBatch | null;
  objects: GlobalIngestionObject[];
  errorMessage: string | null;
  retry: GlobalIngestionRetry;
  createdAt: string;
};

export type GlobalIngestionState = {
  jobs: GlobalIngestionJob[];
};
