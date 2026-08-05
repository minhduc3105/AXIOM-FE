import type { ProcessingFile } from "@/shared/types/document-results"
export { getSourcePreviewKind } from "@/shared/types/document-results"
export type { ProcessingFile, SourcePreviewKind } from "@/shared/types/document-results"

export type IngestionStage = 'source' | 'catalog' | 'mysql' | 's3' | 'snowflake' | 'upload' | 'processing' | 'pipeline' | 'profile' | 'meaning' | 'index'

export type ProgressStage = 'source' | 'transfer' | 'pipeline' | 'profile' | 'meaning' | 'index'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export type PipelineTaskId = 'source-intake' | 'normalize' | 'profile' | 'meaning' | 'index'
export type PipelineTaskStatus = 'queued' | 'running' | 'complete' | 'error'

export type PipelineTask = {
  id: PipelineTaskId
  title: string
  description: string
  status: PipelineTaskStatus
}

export type MySqlConnection = {
  host: string
  port: string
  database: string
  schema: string
  username: string
  password: string
  sslMode: 'Require' | 'Prefer' | 'Disable'
  encrypted: boolean
}

export type S3Connection = {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucketName: string
}

export type SnowflakeConnection = {
  account: string
  user: string
  privateKey: string
  privateKeyPassphrase: string
  warehouse: string
  database: string
  schema: string
  role: string
  discoverTables: boolean
  discoverStages: boolean
  stagePattern: string
  tableLimit: string
  stageLimit: string
}

export type ConnectorJobUiStatus =
  | 'idle'
  | 'submitting'
  | 'polling'
  | 'discovering_files'
  | 'completed'
  | 'failed'
  | 'status_error'
  | 'files_error'

export type S3BrowserStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'loading_more'
  | 'loading_all'
  | 'error'

export type DocumentProcessingUiStatus =
  | 'idle'
  | 'polling'
  | 'empty'
  | 'complete'
  | 'completed_with_errors'
  | 'status_error'

export type ProcessingSourceKind = 'upload' | 's3' | 'snowflake'

export type DocumentProcessingBatch = {
  job_id: string
  organization_id: string
  bucket: string
  count: number
  source_kind: ProcessingSourceKind
  files: ProcessingFile[]
}

export type IngestionFile = {
  id: string
  file: File
  name: string
  extension: string
  sizeLabel: string
}

export const SUPPORTED_UPLOAD_EXTENSIONS = [
  'csv',
  'json',
  'pdf',
  'txt',
  'md',
  'markdown',
  'parquet',
  'xlsx',
  'png',
  'jpg',
  'jpeg',
] as const

export const UPLOAD_FILE_ACCEPT = SUPPORTED_UPLOAD_EXTENSIONS
  .map((extension) => `.${extension}`)
  .join(',')

export type IngestionSource =
  | { kind: 'files'; files: IngestionFile[] }
  | { kind: 'mysql'; connectionId: string; connection: MySqlConnection }

export type MeaningStatus = 'idle' | 'extracting' | 'ready' | 'revising' | 'approved'
export type IndexStatus = 'idle' | 'building' | 'ready'

export const progressStageByView: Record<IngestionStage, ProgressStage> = {
  source: 'source',
  catalog: 'transfer',
  mysql: 'transfer',
  s3: 'transfer',
  snowflake: 'transfer',
  upload: 'transfer',
  processing: 'pipeline',
  pipeline: 'pipeline',
  profile: 'profile',
  meaning: 'meaning',
  index: 'index',
}
