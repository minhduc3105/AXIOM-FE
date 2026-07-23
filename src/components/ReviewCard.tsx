import type { EditableSpecification, Investigation, MockResult, ProcessEvent } from '../features/chat/model/types'
import { PipelineRail } from './PipelineRail'

type ReviewCardProps =
  | {
    stage: 'pending'
    investigation: Investigation
  }
  | {
    stage: 'intent'
    investigation: Investigation
    draft: EditableSpecification
    error: string | null
    onSpecificationChange: (specification: EditableSpecification) => void
    onReset: () => void
    onRun: () => void
  }
  | {
    stage: 'process'
    investigation: Investigation
    events: ProcessEvent[]
    error: string | null
    onRetry: () => void
  }
  | {
    stage: 'result'
    investigation: Investigation
    result: MockResult
    onEvidence: () => void
  }

export function ReviewCard(props: ReviewCardProps) {
  if (props.stage === 'pending') return <PendingCard investigation={props.investigation} />
  if (props.stage === 'intent') return <IntentCard {...props} />
  if (props.stage === 'process') return <ProcessCard {...props} />
  return <FinalAnswerCard {...props} />
}

function ResponseHeading({ title, badge }: { title: string; badge: string }) {
  return (
    <header className="response-head">
      <div className="response-identity">
        <span className="axiom-mark" aria-hidden="true">A</span>
        <div><span className="response-label">AXIOM</span><h2>{title}</h2></div>
      </div>
      <span className="response-badge">{badge}</span>
    </header>
  )
}

function PendingCard({ investigation }: { investigation: Investigation }) {
  return (
    <article className="review-card pending-card" aria-live="polite">
      <ResponseHeading title="Understanding your request" badge="Analyzing" />
      <p className="response-copy">AXIOM is identifying an editable intent and scope for “{investigation.question}”.</p>
      <PipelineRail current="intent" />
      <div className="pending-skeleton">
        <span /><span /><span />
      </div>
    </article>
  )
}

function IntentCard({
  investigation,
  draft,
  error,
  onSpecificationChange,
  onReset,
  onRun,
}: Extract<ReviewCardProps, { stage: 'intent' }>) {
  const valid = Boolean(draft.intent.trim() && draft.scope.trim())

  return (
    <article className="review-card intent-card">
      <ResponseHeading title="Intent & Spec" badge={`${investigation.confidence}% confidence`} />
      <p className="response-copy">Review what AXIOM understood. Intent and scope remain editable until you approve the workflow.</p>
      <PipelineRail current="intent" />

      <form className="spec-form" onSubmit={(event) => { event.preventDefault(); onRun() }}>
        <div className="spec-edit-grid">
          <label>
            <span>Intent</span>
            <input
              value={draft.intent}
              onChange={(event) => onSpecificationChange({ ...draft, intent: event.target.value })}
              aria-label="Intent"
              required
            />
            <small>Machine-readable action for this investigation.</small>
          </label>
          <label>
            <span>Scope</span>
            <textarea
              value={draft.scope}
              onChange={(event) => onSpecificationChange({ ...draft, scope: event.target.value })}
              aria-label="Scope"
              rows={2}
              required
            />
            <small>Data and business boundary AXIOM may use.</small>
          </label>
        </div>

        <div className="spec-contract">
          <div><span>Policy</span><strong>{investigation.policy}</strong></div>
          <div><span>Output</span><strong>{investigation.output}</strong></div>
        </div>

        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="spec-actions">
          <button className="secondary-button" type="button" onClick={onReset}>Reset changes</button>
          <button className="primary-button" type="submit" disabled={!valid}>Approve &amp; run</button>
        </div>
      </form>
    </article>
  )
}

function ProcessCard({
  investigation,
  events,
  error,
  onRetry,
}: Extract<ReviewCardProps, { stage: 'process' }>) {
  const completed = events.filter((event) => event.status === 'done').length
  const running = events.some((event) => event.status === 'running')
  const progress = Math.round(((completed + (running ? 0.5 : 0)) / events.length) * 100)

  return (
    <article className="review-card process-card" aria-live="polite">
      <ResponseHeading title="Processing workflow" badge={error ? 'Paused' : `${progress}%`} />
      <p className="response-copy"><strong>{investigation.intent}</strong> is running against <strong>{investigation.scope}</strong>. This panel stays in place while information moves through the workflow.</p>
      <PipelineRail current="process" />

      <div className="process-progress">
        <div><span>Workflow progress</span><strong>{progress}%</strong></div>
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ol className="process-timeline">
        {events.map((event, index) => (
          <li className={event.status} key={event.id}>
            <span className="process-node" aria-hidden="true">{event.status === 'done' ? '✓' : index + 1}</span>
            <div><strong>{event.label}</strong><p>{event.detail}</p></div>
            <small>{event.status === 'done' ? 'Done' : event.status === 'running' ? 'Running…' : 'Waiting'}</small>
          </li>
        ))}
      </ol>

      {error && (
        <div className="process-error" role="alert">
          <span>{error}</span>
          <button className="secondary-button" type="button" onClick={onRetry}>Retry process</button>
        </div>
      )}
    </article>
  )
}

function FinalAnswerCard({
  result,
  onEvidence,
}: Extract<ReviewCardProps, { stage: 'result' }>) {
  return (
    <article className="review-card final-answer-card">
      <ResponseHeading title="Final Answer" badge="Complete" />
      <PipelineRail current="result" />

      <section className="answer-hero">
        <span className="eyebrow blue">REVIEWED ANSWER</span>
        <h3>{result.title}</h3>
        <p>{result.summary}</p>
      </section>

      <div className="result-metrics">
        {result.metrics.map((metric) => (
          <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>
        ))}
      </div>

      <section className="result-flags">
        <div><strong>Items requiring attention</strong><span>{result.flags.length} flags</span></div>
        <ul>{result.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul>
      </section>

      <div className="result-actions">
        <button className="primary-button" type="button" onClick={onEvidence}>View evidence ({result.evidence.length})</button>
        <span>All material claims are cited and ready for review.</span>
      </div>
    </article>
  )
}
