export type ChatStage = 'welcome' | 'pending' | 'intent' | 'planner' | 'execute' | 'result'
export type DetailStage = Exclude<ChatStage, 'welcome' | 'pending'>

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

export type ChatWorkflowState = {
  stage: ChatStage
  detailStage: DetailStage | null
  investigation: Investigation | null
  loading: boolean
  error: string | null
}
