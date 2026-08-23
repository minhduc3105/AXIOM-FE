export type DataHealthStatus = "success" | "processing" | "failed";
export type DataHealthFilter = "all" | DataHealthStatus;

export type StorageFileDto = {
  dataset_id?: string;
  workspace_id?: string;
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
  files: Array<StorageFileDto & { workspace_id: string }>;
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
  datasource_id: string;
  organization_id: string;
  workspace_id: string;
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
  organizationId: string;
  workspaceId: string;
  datasourceId: string | null;
  bucket: string;
  runId: string | null;
  documentId: string | null;
  datasetId?: string | null;
  canInspect: boolean;
};

export type IngestionJob = IngestionJobDto & {
  healthStatus: DataHealthStatus;
};

export type DataDashboardSnapshot = {
  organizationId: string;
  workspaceId: string;
  bucket: string;
  bucketMetadata: Record<string, unknown>;
  files: DataFile[];
  datasources: DataSource[];
  ingestionJobs: IngestionJob[];
  warnings: string[];
};

export type DataSourceDto = {
  id: string;
  organization_id: string;
  workspace_id: string;
  name: string | null;
  datasource_type: string;
  status?: string;
  current_profile_version?: number | null;
  credentials_configured?: boolean;
  connector_config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DataSource = {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string | null;
  type: string;
  status?: string;
  currentProfileVersion?: number | null;
  credentialsConfigured?: boolean;
  connectorConfig?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DataSourceFileDto = StorageFileDto & {
  name: string;
};

export type DataSourceFileSortField = "name" | "last_modified" | "size";
export type DataSourceFileSortOrder = "asc" | "desc";

export type DataSourceFilesQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: DataSourceFileSortField;
  sortOrder: DataSourceFileSortOrder;
};

export type DataSourceFilesResponseDto = {
  organization_id: string;
  datasource_id: string;
  bucket: string;
  count: number;
  files: DataSourceFileDto[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  total_unfiltered_count: number;
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
};

export type DataSourceFilesPage = {
  organizationId: string;
  datasourceId: string;
  bucket: string;
  files: DataFile[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  totalUnfilteredCount: number;
  warning: string | null;
};
