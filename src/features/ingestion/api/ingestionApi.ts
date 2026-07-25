import type { MySqlConnection, PipelineTaskId } from '../model/types'

export type UploadedFile = {
  key: string
  filename: string | null
  content_type: string | null
  source_archive?: string
}

export type IngestionJobStatus = 'pending' | 'pulling' | 'completed' | 'failed'
export type DatasourceType = 'FILES' | 's3' | 'snowflake'

export type UploadFilesResponse = {
  job_id: string
  status: 'completed'
  organization_id: string
  bucket: string
  count: number
  files: UploadedFile[]
  bucket_metadata: Record<string, unknown>
}

export type IngestionJobResponse = {
  job_id: string
  organization_id: string
  datasource_type: DatasourceType
  status: IngestionJobStatus
  records_pulled: number
  objects_written: number
  manifest: Record<string, unknown>[] | null
  error_message: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
}

export type DocumentProcessingStatus = {
  object_key: string
  found: boolean
  run_id: string | null
  document_id: string | null
  status: string | null
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string | null
}

type S3IngestionRequest = {
  organization_id: string
  datasource_type: 's3'
  credentials: {
    aws_access_key_id: string
    aws_secret_access_key: string
    aws_region: string
    aws_bucket_name: string
  }
}

type SnowflakeIngestionRequest = {
  organization_id: string
  datasource_type: 'snowflake'
  credentials: {
    account: string
    user: string
    private_key: string
    private_key_passphrase: string | null
    warehouse: string | null
    database: string | null
    schema: string | null
    role: string | null
  }
  discover_tables: boolean
  discover_stages: boolean
  stage_pattern: string | null
  table_limit: number | null
  stage_limit: number | null
}

export type CreateIngestionRequest = S3IngestionRequest | SnowflakeIngestionRequest

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isUploadFilesResponse(value: unknown): value is UploadFilesResponse {
  if (!isRecord(value)
    || typeof value.job_id !== 'string'
    || value.job_id.length === 0
    || value.status !== 'completed'
    || typeof value.organization_id !== 'string'
    || typeof value.bucket !== 'string') return false
  if (!Number.isInteger(value.count) || (value.count as number) < 1 || !Array.isArray(value.files) || value.files.length !== value.count) return false
  if (!isRecord(value.bucket_metadata)) return false
  return value.files.every((file) => isRecord(file)
    && typeof file.key === 'string'
    && file.key.length > 0
    && isNullableString(file.filename)
    && isNullableString(file.content_type)
    && (file.source_archive === undefined || typeof file.source_archive === 'string'))
}

function isNullableArrayOfRecords(value: unknown): value is Record<string, unknown>[] | null {
  return value === null || (Array.isArray(value) && value.every(isRecord))
}

function isIngestionJobResponse(value: unknown): value is IngestionJobResponse {
  if (!isRecord(value)) return false
  const statuses: IngestionJobStatus[] = ['pending', 'pulling', 'completed', 'failed']
  const datasourceTypes: DatasourceType[] = ['FILES', 's3', 'snowflake']
  return typeof value.job_id === 'string'
    && value.job_id.length > 0
    && typeof value.organization_id === 'string'
    && datasourceTypes.includes(value.datasource_type as DatasourceType)
    && statuses.includes(value.status as IngestionJobStatus)
    && Number.isInteger(value.records_pulled)
    && (value.records_pulled as number) >= 0
    && Number.isInteger(value.objects_written)
    && (value.objects_written as number) >= 0
    && isNullableArrayOfRecords(value.manifest)
    && isNullableString(value.error_message)
    && typeof value.created_at === 'string'
    && typeof value.updated_at === 'string'
    && isNullableString(value.started_at)
    && isNullableString(value.finished_at)
}

function isDocumentProcessingStatus(value: unknown): value is DocumentProcessingStatus {
  return isRecord(value)
    && typeof value.object_key === 'string'
    && value.object_key.length > 0
    && typeof value.found === 'boolean'
    && isNullableString(value.run_id)
    && isNullableString(value.document_id)
    && isNullableString(value.status)
    && isNullableString(value.error_message)
    && isNullableString(value.started_at)
    && isNullableString(value.finished_at)
    && isNullableString(value.created_at)
}

async function getHttpError(response: Response, operation: string) {
  const fallback = `${operation} failed with HTTP ${response.status}.`
  const responseText = (await response.text()).trim()
  if (!responseText) return fallback
  try {
    const payload: unknown = JSON.parse(responseText)
    if (!isRecord(payload)) return fallback
    if (typeof payload.detail === 'string') return payload.detail
    if (typeof payload.message === 'string') return payload.message
    if (Array.isArray(payload.detail)) {
      const messages = payload.detail
        .map((item) => isRecord(item) && typeof item.msg === 'string' ? item.msg : null)
        .filter((message): message is string => Boolean(message))
      if (messages.length) return messages.join(' ')
    }
  } catch {
    return responseText
  }
  return fallback
}

export async function uploadFiles(
  organizationId: string,
  files: File[],
  signal?: AbortSignal,
): Promise<UploadFilesResponse> {
  const normalizedOrganizationId = organizationId.trim()
  if (!normalizedOrganizationId) throw new Error('VITE_AXIOM_ORGANIZATION_ID is not configured.')
  if (!files.length) throw new Error('Choose at least one file before uploading.')

  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const response = await fetch(
    `/api/document/organizations/${encodeURIComponent(normalizedOrganizationId)}/files`,
    {
      method: 'POST',
      body: formData,
      signal,
    },
  )

  if (!response.ok) throw new Error(await getHttpError(response, 'Upload'))
  if (response.status !== 201) throw new Error(`Upload returned unexpected HTTP ${response.status}.`)

  const payload: unknown = await response.json()
  if (!isUploadFilesResponse(payload)) throw new Error('Upload succeeded but the response was invalid.')
  return payload
}

export async function createIngestionJob(
  request: CreateIngestionRequest,
  signal?: AbortSignal,
): Promise<IngestionJobResponse> {
  if (!request.organization_id.trim()) throw new Error('VITE_AXIOM_ORGANIZATION_ID is not configured.')

  const response = await fetch('/api/document/ingestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) throw new Error(await getHttpError(response, 'Import'))
  if (response.status !== 202) throw new Error(`Import returned unexpected HTTP ${response.status}.`)

  const payload: unknown = await response.json()
  if (!isIngestionJobResponse(payload)) throw new Error('Import was accepted but the job response was invalid.')
  return payload
}

export async function getIngestionJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<IngestionJobResponse> {
  const normalizedJobId = jobId.trim()
  if (!normalizedJobId) throw new Error('An ingestion job ID is required.')

  const response = await fetch(`/api/document/ingestions/${encodeURIComponent(normalizedJobId)}`, {
    method: 'GET',
    signal,
  })

  if (!response.ok) throw new Error(await getHttpError(response, 'Status check'))
  const payload: unknown = await response.json()
  if (!isIngestionJobResponse(payload)) throw new Error('The ingestion job response was invalid.')
  return payload
}

const CORPUS_STATUS_BATCH_SIZE = 100

export async function getDocumentProcessingStatuses(
  organizationId: string,
  bucket: string,
  objectKeys: string[],
  signal?: AbortSignal,
): Promise<DocumentProcessingStatus[]> {
  const normalizedOrganizationId = organizationId.trim()
  const normalizedBucket = bucket.trim()
  if (!normalizedOrganizationId) throw new Error('An organization ID is required for processing status.')
  if (!normalizedBucket) throw new Error('A bucket is required for processing status.')
  if (!objectKeys.length) throw new Error('At least one object key is required for processing status.')
  if (objectKeys.some((key) => !key)) throw new Error('Processing status object keys cannot be empty.')

  const results: DocumentProcessingStatus[] = []
  for (let index = 0; index < objectKeys.length; index += CORPUS_STATUS_BATCH_SIZE) {
    const batch = objectKeys.slice(index, index + CORPUS_STATUS_BATCH_SIZE)
    const response = await fetch('/api/corpus/documents/processing-status:batch-get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: normalizedOrganizationId,
        bucket: normalizedBucket,
        object_keys: batch,
      }),
      signal,
    })

    if (!response.ok) throw new Error(await getHttpError(response, 'Processing status check'))
    if (response.status !== 200) throw new Error(`Processing status check returned unexpected HTTP ${response.status}.`)

    const payload: unknown = await response.json()
    if (!isRecord(payload)
      || !Array.isArray(payload.results)
      || payload.results.length !== batch.length
      || !payload.results.every(isDocumentProcessingStatus)
      || payload.results.some((result, resultIndex) => result.object_key !== batch[resultIndex])) {
      throw new Error('The document processing status response was invalid.')
    }
    results.push(...payload.results)
  }
  return results
}

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => {
    window.clearTimeout(timer)
    reject(new DOMException('The mock request was cancelled.', 'AbortError'))
  }, { once: true })
})

const pipelineDelays: Partial<Record<PipelineTaskId, number>> = {
  'source-intake': 1300,
  normalize: 1600,
  profile: 1500,
  meaning: 1500,
  index: 2000,
}

export async function testMySqlConnection(connection: MySqlConnection, signal?: AbortSignal): Promise<{ ok: true; message: string }> {
  await wait(900, signal)
  const required = [connection.host, connection.port, connection.database, connection.username, connection.password]
  if (required.some((value) => !value.trim())) throw new Error('Complete the required connection fields before testing.')
  return { ok: true, message: 'Connection verified. Read-only credentials accepted.' }
}

export async function saveConnection(connection: MySqlConnection, signal?: AbortSignal): Promise<{ ok: true; connectionId: string }> {
  await wait(700, signal)
  if (!connection.host.trim()) throw new Error('The verified connection is no longer valid.')
  return { ok: true, connectionId: 'mysql-workspace-q3' }
}

export async function runPipelineTask(task: PipelineTaskId, signal?: AbortSignal): Promise<{ ok: true; task: PipelineTaskId }> {
  await wait(pipelineDelays[task] ?? 1200, signal)
  return { ok: true, task }
}

export async function extractMeaning(signal?: AbortSignal): Promise<{ ok: true }> {
  await runPipelineTask('meaning', signal)
  return { ok: true }
}

export async function reviseMeaning(signal?: AbortSignal): Promise<{ ok: true }> {
  await wait(1400, signal)
  return { ok: true }
}

export async function buildSearchIndex(signal?: AbortSignal): Promise<{ ok: true; indexedAssets: number }> {
  await runPipelineTask('index', signal)
  return { ok: true, indexedAssets: 4 }
}

export async function searchIndexedEvidence(query: string, signal?: AbortSignal): Promise<{ ok: true; query: string }> {
  await wait(500, signal)
  return { ok: true, query: query.trim() }
}
