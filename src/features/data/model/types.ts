export type DataHealthStatus = "success" | "processing" | "failed";

export type StorageFileDto = {
  key: string;
  size: number;
  last_modified: string | null;
  etag: string | null;
  presigned_url: string;
};

export type OrganizationFilesResponseDto = {
  organization_id: string;
  bucket: string;
  count: number;
  files: StorageFileDto[];
  bucket_metadata: Record<string, unknown>;
};

export type DocumentProcessingStatusDto = {
  object_key: string;
  found: boolean;
  run_id: string | null;
  document_id: string | null;
  status: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
};

export type BatchDocumentProcessingStatusResponseDto = {
  results: DocumentProcessingStatusDto[];
};

export type IngestionJobDto = {
  job_id: string;
  organization_id: string;
  datasource_type: string;
  status: string;
  records_pulled: number;
  objects_written: number;
  manifest: Array<Record<string, unknown>> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type DataFile = {
  key: string;
  name: string;
  type: string;
  size: number;
  lastModified: string | null;
  etag: string | null;
  downloadUrl: string;
  status: DataHealthStatus;
  sourceStatus: string | null;
  statusDetail: string;
  errorMessage: string | null;
};

export type IngestionJob = IngestionJobDto & {
  healthStatus: DataHealthStatus;
};

export type DataDashboardSnapshot = {
  organizationId: string;
  bucket: string;
  bucketMetadata: Record<string, unknown>;
  files: DataFile[];
  ingestionJobs: IngestionJob[];
  warnings: string[];
};
