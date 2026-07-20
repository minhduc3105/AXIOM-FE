export type ChatStage = 'welcome' | 'pending' | 'intent' | 'planner' | 'execute' | 'result'
export type DetailStage = Exclude<ChatStage, 'welcome' | 'pending'>
export type IngestionStage = 'choose' | 'catalog' | 'mysql' | 'upload'
export type IngestionStatus = 'ready' | 'running' | 'complete'

export type PipelineStep = {
  label: string
  state: 'done' | 'active' | 'waiting'
}

export type Investigation = {
  question: string
  confidence: number
  intent: string
  scope: string
  policy: string
}
