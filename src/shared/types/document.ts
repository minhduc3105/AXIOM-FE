export type JobFile = {
  key: string;
  size: number;
  last_modified: string | null;
  etag: string | null;
  presigned_url: string;
};

export type JobFilesPagination = {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
};

export type JobFilesPage = {
  organization_id: string;
  datasource_id: string;
  bucket: string;
  count: number;
  files: JobFile[];
  pagination: JobFilesPagination;
};

export type JobFilesResult = Omit<JobFilesPage, "pagination">;
