export type IngestionStage = 'source' | 'catalog' | 'mysql' | 'upload' | 'pipeline' | 'profile' | 'meaning' | 'index'

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

export type IngestionFile = {
  id: string
  file: File
  name: string
  extension: string
  sizeLabel: string
}

export type IngestionSource =
  | { kind: 'files'; files: IngestionFile[] }
  | { kind: 'mysql'; connectionId: string; connection: MySqlConnection }

export type MeaningStatus = 'idle' | 'extracting' | 'ready' | 'revising' | 'approved'
export type IndexStatus = 'idle' | 'building' | 'ready'

export const progressStageByView: Record<IngestionStage, ProgressStage> = {
  source: 'source',
  catalog: 'transfer',
  mysql: 'transfer',
  upload: 'transfer',
  pipeline: 'pipeline',
  profile: 'profile',
  meaning: 'meaning',
  index: 'index',
}
