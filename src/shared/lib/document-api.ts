import type {
  JobFile,
  JobFilesPage,
  JobFilesResult,
} from "@/shared/types/document";

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

function isJobFile(value: unknown): value is JobFile {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    value.key.length > 0 &&
    isNonNegativeInteger(value.size) &&
    isNullableString(value.last_modified) &&
    isNullableString(value.etag) &&
    typeof value.presigned_url === "string" &&
    value.presigned_url.length > 0
  );
}

function isJobFilesPage(value: unknown): value is JobFilesPage {
  if (
    !isRecord(value) ||
    typeof value.organization_id !== "string" ||
    !value.organization_id ||
    typeof value.datasource_id !== "string" ||
    !value.datasource_id ||
    typeof value.bucket !== "string" ||
    !value.bucket ||
    !isNonNegativeInteger(value.count) ||
    !Array.isArray(value.files) ||
    value.files.length !== value.count ||
    !value.files.every(isJobFile) ||
    !isRecord(value.pagination)
  ) return false;
  const pagination = value.pagination;
  if (
    !isPositiveInteger(pagination.page) ||
    !isPositiveInteger(pagination.page_size) ||
    pagination.page_size > 100 ||
    !isNonNegativeInteger(pagination.total_count) ||
    !isNonNegativeInteger(pagination.total_pages) ||
    pagination.total_pages !==
      Math.ceil(pagination.total_count / pagination.page_size) ||
    value.count > pagination.page_size
  ) return false;
  return pagination.total_pages === 0
    ? pagination.page === 1 && pagination.total_count === 0 && value.count === 0
    : pagination.page <= pagination.total_pages;
}

async function getHttpError(response: Response) {
  const fallback = `Job file discovery failed with HTTP ${response.status}.`;
  const text = (await response.text()).trim();
  if (!text) return fallback;
  try {
    const payload: unknown = JSON.parse(text);
    if (isRecord(payload) && typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export async function getFilesForJob(
  jobId: string,
  page = 1,
  pageSize = 100,
  signal?: AbortSignal,
): Promise<JobFilesPage> {
  const normalizedJobId = jobId.trim();
  if (!normalizedJobId) throw new Error("An ingestion job ID is required.");
  if (!isPositiveInteger(page)) {
    throw new Error("The job files page must be a positive integer.");
  }
  if (!isPositiveInteger(pageSize) || pageSize > 100) {
    throw new Error("The job files page size must be between 1 and 100.");
  }
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await fetch(
    `/api/document/jobs/${encodeURIComponent(normalizedJobId)}/files?${query}`,
    { method: "GET", signal },
  );
  if (!response.ok) throw new Error(await getHttpError(response));
  const payload: unknown = await response.json();
  if (
    response.status !== 200 ||
    !isJobFilesPage(payload) ||
    payload.pagination.page !== page ||
    payload.pagination.page_size !== pageSize
  ) {
    throw new Error("The job files response was invalid.");
  }
  return payload;
}

export async function getAllFilesForJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<JobFilesResult> {
  const firstPage = await getFilesForJob(jobId, 1, 100, signal);
  const files = [...firstPage.files];
  const keys = new Set(files.map((file) => file.key));
  if (keys.size !== files.length) {
    throw new Error("The job files response contained duplicate object keys.");
  }
  for (let page = 2; page <= firstPage.pagination.total_pages; page += 1) {
    const nextPage = await getFilesForJob(jobId, page, 100, signal);
    if (
      nextPage.organization_id !== firstPage.organization_id ||
      nextPage.datasource_id !== firstPage.datasource_id ||
      nextPage.bucket !== firstPage.bucket ||
      nextPage.pagination.total_count !== firstPage.pagination.total_count ||
      nextPage.pagination.total_pages !== firstPage.pagination.total_pages
    ) throw new Error("The job files pagination changed while files were being loaded.");
    for (const file of nextPage.files) {
      if (keys.has(file.key)) {
        throw new Error("The job files response contained duplicate object keys.");
      }
      keys.add(file.key);
      files.push(file);
    }
  }
  if (files.length !== firstPage.pagination.total_count) {
    throw new Error(
      `The ingestion job reported ${firstPage.pagination.total_count} files, but ${files.length} were available in storage.`,
    );
  }
  return {
    organization_id: firstPage.organization_id,
    datasource_id: firstPage.datasource_id,
    bucket: firstPage.bucket,
    count: files.length,
    files,
  };
}
