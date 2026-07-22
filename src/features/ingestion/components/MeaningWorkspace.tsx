import { useState } from 'react'
import type { MeaningStatus } from '../model/types'

type MeaningWorkspaceProps = {
  status: MeaningStatus
  revisionCount: number
  onApprove: () => void
  onRevision: () => void
  onBack: () => void
}

const semanticConcepts = [
  {
    title: 'Customer',
    copy: 'customer_id joins revenue rows to payment events',
    relationship: 'customer_revenue_q3.customer_id → payment_events.customer_id → retention_policy governed rules.',
    evidence: 'Preserve file_id and row/page references on every customer chunk.',
  },
  {
    title: 'Revenue',
    copy: 'revenue and amount support financial answer claims',
    relationship: 'customer_revenue_q3.revenue → payment_events.amount → currency-normalized financial claims.',
    evidence: 'Revenue evidence retains customer_id, currency, period, and source-row references.',
  },
  {
    title: 'Retention',
    copy: 'policy memo defines retention and approval constraints',
    relationship: 'retention_rules.policy_id → governed source records → expiration and approval constraints.',
    evidence: 'Retention windows remain attached to every derived chunk and searchable asset.',
  },
  {
    title: 'External sharing',
    copy: 'policy concept gates sensitive fields and generated answers',
    relationship: 'governed identifiers → PII policy gate → reviewer approval before external sharing.',
    evidence: 'External results exclude protected fields until the reviewer gate is satisfied.',
  },
]

export function MeaningWorkspace({ status, revisionCount, onApprove, onRevision, onBack }: MeaningWorkspaceProps) {
  const [selectedConcept, setSelectedConcept] = useState(0)
  const busy = status === 'extracting' || status === 'revising'
  if (status === 'extracting') return <div className="workspace-panel stage-loading" role="status"><span className="loading-spinner" /><h2>Extracting meaning</h2><p>Inferring concepts, relationships, filters, and governed claims from the generated profile…</p></div>

  const activeConcept = semanticConcepts[selectedConcept]
  return <div className="meaning-layout">
    <section className="workspace-panel semantic-panel">
      <h2>Semantic map</h2>
      {semanticConcepts.map((concept, index) => <button
        className={`semantic-row ${index === selectedConcept ? 'selected' : ''}`}
        key={concept.title}
        type="button"
        onClick={() => setSelectedConcept(index)}
        aria-pressed={index === selectedConcept}
        aria-label={`Select semantic concept ${concept.title}`}
      ><strong>{concept.title}</strong><span>{concept.copy}</span></button>)}
      <div className="relationship-card" aria-live="polite"><strong>Suggested relationship graph · {activeConcept.title}</strong><span>{activeConcept.relationship}<br />{activeConcept.evidence}</span></div>
    </section>
    <section className="workspace-panel hints-panel"><div className="panel-heading"><h2>Review semantic hints</h2>{revisionCount > 0 && <span className="success-chip">Revision {revisionCount} applied</span>}</div>{[['High', 'Governed identifiers', 'Detected email and customer_id as governed fields across structured sources.'], ['High', 'Chunk strategy', 'Table rows stay row-addressable; documents split by paragraph/page with source ordering.'], ['Med', 'Search filters', 'segment, region, status, timestamp, currency, renewal_date become filters.'], ['Med', 'Reviewer note', 'Answers involving personal data require approval before external sharing.']].map(([level, title, copy]) => <div className="hint-row" key={title}><span className={level === 'High' ? 'warning-chip' : 'neutral-chip'}>{level}</span><div><strong>{title}</strong><p>{copy}</p></div></div>)}<div className="approval-card"><strong>{busy ? 'Refreshing semantic hints…' : 'Ready to build index?'}</strong><p>Semantic hints are linked to source files, fields, rows, and document chunks.</p><div><button className="primary-button" type="button" disabled={busy} onClick={onApprove}>Approve meaning</button><button className="secondary-button" type="button" disabled={busy} onClick={onRevision}>{busy ? 'Revising…' : 'Request revision'}</button><button className="text-button" type="button" disabled={busy} onClick={onBack}>Back to profile</button></div></div></section>
  </div>
}
