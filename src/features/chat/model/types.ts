export type ChatStage = 'welcome' | 'pending' | 'intent' | 'process' | 'result'
export type WorkflowStage = Exclude<ChatStage, 'welcome' | 'pending'>
export type ProcessStatus = 'waiting' | 'running' | 'done'

export type Investigation = {
  question: string
  confidence: number
  intent: string
  scope: string
  policy: string
  output: string
}

export type EditableSpecification = Pick<Investigation, 'intent' | 'scope'>

export type ProcessEvent = {
  id: string
  label: string
  detail: string
  status: ProcessStatus
}

export type ResultMetric = {
  label: string
  value: string
}

export type EvidenceItem = {
  id: string
  source: string
  locator: string
  claim: string
  tone: 'success' | 'warning'
}

export type MockResult = {
  title: string
  summary: string
  metrics: ResultMetric[]
  flags: string[]
  evidence: EvidenceItem[]
  artifacts: string[]
}

export type ChatTurn = {
  investigation: Investigation
  result: MockResult
}

export type ChatWorkflowState = {
  stage: ChatStage
  evidenceOpen: boolean
  investigation: Investigation | null
  draft: EditableSpecification | null
  approvedSpecification: EditableSpecification | null
  processEvents: ProcessEvent[]
  result: MockResult | null
  history: ChatTurn[]
  loading: boolean
  error: string | null
}
