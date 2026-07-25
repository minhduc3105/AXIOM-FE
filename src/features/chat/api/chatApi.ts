import type { EditableSpecification, EvidenceItem, Investigation, MockResult, ProcessEvent, ProcessStatus, ResultMetric } from '../model/types'

type ProcessDefinition = Omit<ProcessEvent, 'status'>

type SseEvent = {
  type: string
  response_id?: string
  [key: string]: unknown
}

type CapabilityRequirement = {
  name: string
  description?: string | null
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  constraints: Record<string, unknown>
  metadata: Record<string, unknown>
}

type EditableExecutionSpec = {
  intent?: string
  objective?: string
  data_requirements?: string[]
  capability_requirements?: CapabilityRequirement[]
  constraints?: Record<string, unknown>
  confirmed?: boolean
  engine_hint?: string | null
}

type PendingConfirmation = {
  responseId: string
  token: string
  revision: number
  intent: string
  confidence: number
  spec: EditableExecutionSpec
}

type CompletedResponse = {
  responseId: string
  outputText: string
  evidence: unknown
  metadata: Record<string, unknown>
}

type StreamOutcome = {
  confirmation?: PendingConfirmation
  completed?: CompletedResponse
}

const API_BASE_URL = (import.meta.env.VITE_AXIOM_GATEWAY_API_URL || '/intelligence-service').replace(/\/$/, '')

const PROCESS_DEFINITIONS: ProcessDefinition[] = [
  {
    id: 'retrieve',
    label: 'Retrieve scoped sources',
    detail: 'Loading approved records and evidence references from the selected scope.',
  },
  {
    id: 'plan',
    label: 'Build plan & workflow code',
    detail: 'Creating a deterministic execution path from the approved intent and scope.',
  },
  {
    id: 'execute',
    label: 'Execute in sandbox',
    detail: 'Running generated code with a blocked network and read-only data access.',
  },
  {
    id: 'validate',
    label: 'Validate claims and policy',
    detail: 'Checking totals, evidence coverage, quality flags, and policy requirements.',
  },
  {
    id: 'synthesize',
    label: 'Synthesize final answer',
    detail: 'Composing the reviewed answer and linking every material claim to evidence.',
  },
]

let pendingConfirmation: PendingConfirmation | null = null

export function createProcessEvents(): ProcessEvent[] {
  return PROCESS_DEFINITIONS.map(({ id, label, detail }) => ({ id, label, detail, status: 'waiting' }))
}

export async function createInvestigation(question: string, signal?: AbortSignal): Promise<Investigation> {
  pendingConfirmation = null
  const response = await postJson('/api/v1/responses', {
    input: question,
    data_corpus_package: { sources: [], schemas: {}, metadata: {} },
    runtime_options: { engine: 'auto' },
  }, signal)
  const outcome = await readResponseStream(response, signal)

  if (!outcome.confirmation) {
    throw new Error('The intelligence service did not return a confirmation plan.')
  }

  pendingConfirmation = outcome.confirmation
  return confirmationToInvestigation(outcome.confirmation, question)
}

export async function runWorkflow(
  specification: EditableSpecification,
  onStatus: (eventId: string, status: ProcessStatus) => void,
  signal?: AbortSignal,
): Promise<MockResult> {
  if (!pendingConfirmation) {
    throw new Error('No pending AXIOM response is ready to run.')
  }

  let confirmation = pendingConfirmation
  if (specificationChanged(specification, confirmation)) {
    const reviseResponse = await postDecision(
      confirmation,
      {
        action: 'revise',
        revision: confirmation.revision,
        feedback: specification.intent !== confirmation.intent ? `Use intent: ${specification.intent}` : undefined,
        edited_spec: editableSpecRequest(confirmation.spec, specification),
      },
      signal,
    )
    const reviseOutcome = await readResponseStream(reviseResponse, signal, onStatus)
    if (reviseOutcome.completed) {
      pendingConfirmation = null
      markAllDone(onStatus)
      return completedToResult(reviseOutcome.completed)
    }
    if (!reviseOutcome.confirmation) {
      throw new Error('The intelligence service did not return a revised confirmation plan.')
    }
    confirmation = reviseOutcome.confirmation
    pendingConfirmation = confirmation
  }

  const confirmResponse = await postDecision(
    confirmation,
    { action: 'confirm', revision: confirmation.revision },
    signal,
  )
  const outcome = await readResponseStream(confirmResponse, signal, onStatus)

  if (!outcome.completed) {
    throw new Error('The intelligence service did not complete the response.')
  }

  pendingConfirmation = null
  markAllDone(onStatus)
  return completedToResult(outcome.completed)
}

async function postJson(path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response))
  return response
}

function postDecision(confirmation: PendingConfirmation, body: unknown, signal?: AbortSignal) {
  return postJsonWithHeaders(
    `/api/v1/responses/${encodeURIComponent(confirmation.responseId)}/decision`,
    body,
    { 'X-Confirmation-Token': confirmation.token },
    signal,
  )
}

async function postJsonWithHeaders(path: string, body: unknown, headers: Record<string, string>, signal?: AbortSignal) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw new Error(await responseErrorMessage(response))
  return response
}

async function responseErrorMessage(response: Response) {
  const fallback = `AXIOM Intelligence API returned ${response.status}.`
  try {
    const text = await response.text()
    if (!text) return fallback
    try {
      const payload = JSON.parse(text) as { detail?: unknown; error?: { message?: unknown } }
      if (typeof payload.detail === 'string') return payload.detail
      if (typeof payload.error?.message === 'string') return payload.error.message
    } catch {
      return text
    }
    return fallback
  } catch {
    return fallback
  }
}

async function readResponseStream(
  response: Response,
  signal?: AbortSignal,
  onStatus?: (eventId: string, status: ProcessStatus) => void,
): Promise<StreamOutcome> {
  if (!response.body) throw new Error('The intelligence service returned an empty response stream.')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const parser = new ResponsesSSEParser()
  const outcome: StreamOutcome = {}

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError')
      const { done, value } = await reader.read()
      const events = done ? parser.finish() : parser.push(decoder.decode(value, { stream: true }))
      for (const event of events) applyStreamEvent(event, outcome, onStatus)
      if (done) break
    }
  } finally {
    reader.releaseLock()
  }

  return outcome
}

function applyStreamEvent(
  event: SseEvent,
  outcome: StreamOutcome,
  onStatus?: (eventId: string, status: ProcessStatus) => void,
) {
  if (event.type.startsWith('pipeline.')) updateProcessStatus(event.type, onStatus)

  if (event.type === 'response.requires_confirmation') {
    outcome.confirmation = confirmationFromEvent(event)
    return
  }

  if (event.type === 'response.completed') {
    outcome.completed = completedFromEvent(event)
    return
  }

  if (event.type === 'response.failed') {
    const error = asRecord(event.error)
    throw new Error(typeof error.message === 'string' ? error.message : 'The intelligence response failed.')
  }
}

function confirmationFromEvent(event: SseEvent): PendingConfirmation {
  const responseId = stringValue(event.response_id) || stringValue(event.responseId)
  const token = stringValue(event.confirmation_token)
  if (!responseId || !token) throw new Error('The confirmation event was missing required response data.')

  const intent = asRecord(event.intent)
  const spec = asRecord(event.spec) as EditableExecutionSpec
  return {
    responseId,
    token,
    revision: numberValue(event.revision) || 1,
    intent: stringValue(intent.value) || stringValue(spec.intent) || 'unknown',
    confidence: percentValue(intent.confidence),
    spec,
  }
}

function completedFromEvent(event: SseEvent): CompletedResponse {
  const response = asRecord(event.response)
  return {
    responseId: stringValue(event.response_id) || stringValue(response.id) || '',
    outputText: stringValue(response.output_text) || stringValue(event.output_text) || '',
    evidence: event.evidence,
    metadata: asRecord(event.metadata),
  }
}

function confirmationToInvestigation(confirmation: PendingConfirmation, question: string): Investigation {
  const constraints = asRecord(confirmation.spec.constraints)
  return {
    question,
    confidence: confirmation.confidence,
    intent: confirmation.intent,
    scope: stringValue(confirmation.spec.objective) || listSummary(confirmation.spec.data_requirements) || 'Pending approved scope',
    policy: stringValue(constraints.policy) || stringValue(constraints.execution_policy) || `Requires confirmation · revision ${confirmation.revision}`,
    output: 'Reviewed answer after approved execution',
  }
}

function completedToResult(completed: CompletedResponse): MockResult {
  const markdown = completed.outputText.trim() || 'No response text was returned.'
  const metadata = completed.metadata
  const evidence = normalizeEvidence(completed.evidence)
  return {
    title: stringValue(metadata.title) || titleFromMarkdown(markdown) || 'AXIOM response',
    summary: stringValue(metadata.summary) || summaryFromMarkdown(markdown),
    markdown,
    metrics: normalizeMetrics(metadata.metrics),
    flags: normalizeFlags(metadata.flags, evidence),
    evidence,
    artifacts: normalizeArtifacts(metadata),
  }
}

function specificationChanged(specification: EditableSpecification, confirmation: PendingConfirmation) {
  const currentScope = stringValue(confirmation.spec.objective) || ''
  return specification.intent !== confirmation.intent || specification.scope !== currentScope
}

function editableSpecRequest(spec: EditableExecutionSpec, specification: EditableSpecification) {
  return {
    objective: specification.scope,
    data_requirements: spec.data_requirements || [],
    capability_requirements: spec.capability_requirements || [],
    constraints: spec.constraints || {},
    engine_hint: spec.engine_hint || null,
  }
}

function updateProcessStatus(eventType: string, onStatus?: (eventId: string, status: ProcessStatus) => void) {
  if (!onStatus) return
  if (eventType === 'pipeline.intent_analyzed') {
    onStatus('retrieve', 'running')
    onStatus('retrieve', 'done')
  }
  if (eventType === 'pipeline.spec_built' || eventType === 'pipeline.spec_revised' || eventType === 'pipeline.spec_confirmed') {
    onStatus('plan', 'running')
    onStatus('plan', 'done')
  }
  if (eventType === 'pipeline.engine_selected') onStatus('execute', 'running')
  if (eventType === 'pipeline.engine_completed') onStatus('execute', 'done')
  if (eventType === 'pipeline.evidence_collected') {
    onStatus('validate', 'running')
    onStatus('validate', 'done')
  }
  if (eventType === 'pipeline.completed') {
    onStatus('synthesize', 'running')
    onStatus('synthesize', 'done')
  }
}

function markAllDone(onStatus: (eventId: string, status: ProcessStatus) => void) {
  for (const event of PROCESS_DEFINITIONS) onStatus(event.id, 'done')
}

class ResponsesSSEParser {
  private buffer = ''

  push(chunk: string): SseEvent[] {
    this.buffer += chunk.replace(/\r\n/g, '\n')
    const records = this.buffer.split('\n\n')
    this.buffer = records.pop() || ''
    return records.flatMap((record) => this.parseRecord(record))
  }

  finish(): SseEvent[] {
    const record = this.buffer.trim()
    this.buffer = ''
    return record ? this.parseRecord(record) : []
  }

  private parseRecord(record: string): SseEvent[] {
    let eventName = ''
    const dataLines: string[] = []
    for (const line of record.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim()
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
    }
    if (!eventName || dataLines.length === 0) return []
    try {
      const payload = JSON.parse(dataLines.join('\n')) as SseEvent
      return payload && payload.type === eventName ? [payload] : []
    } catch {
      return []
    }
  }
}

function normalizeEvidence(value: unknown): EvidenceItem[] {
  const items = Array.isArray(value) ? value : []
  return items.map((item, index) => {
    const record = asRecord(item)
    const tone = stringValue(record.tone)
    return {
      id: stringValue(record.id) || stringValue(record.evidence_id) || `EV-${String(index + 1).padStart(3, '0')}`,
      source: stringValue(record.source) || stringValue(record.source_ref) || 'AXIOM evidence',
      locator: stringValue(record.locator) || stringValue(record.location) || stringValue(record.page) || 'referenced output',
      claim: stringValue(record.claim) || stringValue(record.text) || stringValue(record.summary) || 'Evidence item returned by AXIOM.',
      tone: tone === 'warning' ? 'warning' : 'success',
    }
  })
}

function normalizeMetrics(value: unknown): ResultMetric[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const record = asRecord(item)
    const label = stringValue(record.label) || stringValue(record.name)
    const metricValue = stringValue(record.value)
    return label && metricValue ? [{ label, value: metricValue }] : []
  })
}

function normalizeFlags(value: unknown, evidence: EvidenceItem[]): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return evidence.filter((item) => item.tone === 'warning').map((item) => item.claim)
}

function normalizeArtifacts(metadata: Record<string, unknown>): string[] {
  const values = [metadata.artifacts, metadata.artifact_refs, metadata.artifactRefs]
  for (const value of values) {
    if (Array.isArray(value)) return value.map(String).filter(Boolean)
  }
  const artifact = stringValue(metadata.artifact_ref)
  return artifact ? [artifact] : []
}

function titleFromMarkdown(markdown: string) {
  const heading = markdown.split('\n').find((line) => line.startsWith('# '))
  return heading?.replace(/^#\s+/, '').trim() || ''
}

function summaryFromMarkdown(markdown: string) {
  const firstParagraph = markdown
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'))
  return firstParagraph || markdown.replace(/[#*_`>\-]/g, '').trim().slice(0, 180)
}

function listSummary(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).join(', ') : ''
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function percentValue(value: unknown) {
  const numeric = numberValue(value)
  if (!numeric) return 0
  return numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
