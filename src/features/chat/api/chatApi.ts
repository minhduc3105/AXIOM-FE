import type { EditableSpecification, Investigation, MockResult, ProcessEvent, ProcessStatus } from '../model/types'

type ProcessDefinition = Omit<ProcessEvent, 'status'> & { duration: number }

export const PROCESS_DEFINITIONS: ProcessDefinition[] = [
  {
    id: 'retrieve',
    label: 'Retrieve scoped sources',
    detail: 'Loading approved records and evidence references from the selected scope.',
    duration: 1300,
  },
  {
    id: 'plan',
    label: 'Build plan & workflow code',
    detail: 'Creating a deterministic execution path from the approved intent and scope.',
    duration: 1700,
  },
  {
    id: 'execute',
    label: 'Execute in sandbox',
    detail: 'Running generated code with a blocked network and read-only data access.',
    duration: 2200,
  },
  {
    id: 'validate',
    label: 'Validate claims and policy',
    detail: 'Checking totals, evidence coverage, quality flags, and policy requirements.',
    duration: 1800,
  },
  {
    id: 'synthesize',
    label: 'Synthesize final answer',
    detail: 'Composing the reviewed answer and linking every material claim to evidence.',
    duration: 1500,
  },
]

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The request was aborted.', 'AbortError'))
      return
    }

    const abort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('The request was aborted.', 'AbortError'))
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, ms)

    signal?.addEventListener('abort', abort, { once: true })
  })
}

export function createProcessEvents(): ProcessEvent[] {
  return PROCESS_DEFINITIONS.map(({ id, label, detail }) => ({ id, label, detail, status: 'waiting' }))
}

export async function createInvestigation(question: string, signal?: AbortSignal): Promise<Investigation> {
  await wait(1000, signal)
  return {
    question,
    confidence: 94,
    intent: 'generate_revenue_report',
    scope: 'Q3 revenue, payments',
    policy: 'Strict · read-only sandbox · external network blocked',
    output: 'Reviewed markdown answer with cited evidence',
  }
}

function readableIntent(intent: string) {
  return intent.trim().split('_').join(' ')
}

function createResult(specification: EditableSpecification): MockResult {
  const title = 'Q3 revenue review'
  const summary = `The approved "${readableIntent(specification.intent)}" workflow completed for ${specification.scope}. Reviewed revenue is $571K, led by Enterprise at $505K, with two data-quality issues requiring attention.`
  const metrics = [
    { label: 'Reviewed revenue', value: '$571K' },
    { label: 'Top segment', value: 'Enterprise · $505K' },
    { label: 'Evidence coverage', value: '4/4 claims' },
  ]
  const flags = [
    'Two customer records are missing email addresses.',
    'Two failed payment events require reviewer attention.',
  ]
  const evidence = [
    { id: 'EV-001', source: 'customer_revenue_q3.csv', locator: 'row 14', claim: 'Enterprise generated $505K in reviewed revenue.', tone: 'success' as const },
    { id: 'EV-002', source: 'customer_revenue_q3.csv', locator: 'rows 18, 22', claim: 'Two customer records have missing email addresses.', tone: 'warning' as const },
    { id: 'EV-003', source: 'payment_events.json', locator: 'events 1013, 1018', claim: 'Failed payment events need reviewer attention.', tone: 'warning' as const },
    { id: 'EV-004', source: 'renewal_risk_notes.md', locator: 'line 42', claim: 'Reviewer approval is required before external sharing.', tone: 'success' as const },
  ]

  return {
    title,
    summary,
    markdown: [
      `# ${title}`,
      '',
      summary,
      '',
      '## Key numbers',
      '',
      `- **${metrics[0].label}:** ${metrics[0].value}`,
      `- **${metrics[1].label}:** ${metrics[1].value}`,
      `- **${metrics[2].label}:** ${metrics[2].value}`,
      '',
      '## Items requiring attention',
      '',
      ...flags.map((flag) => `- ${flag}`),
      '',
      '## Evidence',
      '',
      ...evidence.map((item) => `- **${item.id}:** ${item.claim} (${item.source}, ${item.locator})`),
    ].join('\n'),
    metrics,
    flags,
    evidence,
    artifacts: ['report.md', 'evidence-map.json', 'validator.log'],
  }
}

export async function runWorkflow(
  specification: EditableSpecification,
  onStatus: (eventId: string, status: ProcessStatus) => void,
  signal?: AbortSignal,
): Promise<MockResult> {
  for (const event of PROCESS_DEFINITIONS) {
    onStatus(event.id, 'running')
    await wait(event.duration, signal)
    onStatus(event.id, 'done')
  }

  return createResult(specification)
}
