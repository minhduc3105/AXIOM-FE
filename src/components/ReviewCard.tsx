import type { DetailStage, Investigation } from '../types'
import { PipelineRail } from './PipelineRail'

export function ReviewCard({ investigation, stage, onReview, onSelectStage }: { investigation: Investigation; stage: DetailStage; onReview: () => void; onSelectStage: (stage: DetailStage) => void }) {
  const titles = {
    intent: 'Intent & Spec',
    planner: 'Planner & Code Generator',
    execute: 'Execute & Validate',
    result: 'Result & Evidence',
  }
  const activeIndex = { intent: 0, planner: 1, execute: 2, result: 3 }[stage]
  return (
    <article className="review-card">
      <div className="response-head">
        <div><span className="response-label">AXIOM</span><h2>{titles[stage]}</h2></div>
        <button className="status-pill review-trigger" onClick={onReview} type="button">{stage === 'result' ? 'Complete · Review' : 'Review'}</button>
      </div>
      <p className="response-copy">
        {stage === 'intent' && `Detected intent: ${investigation.intent} · ${investigation.confidence}% confidence. AXIOM extracts scope, constraints, and approval requirements before planning.`}
        {stage === 'planner' && 'Spec approved. AXIOM now generates a deterministic 4-step plan and linked code path before execution.'}
        {stage === 'execute' && 'Plan approved. AXIOM is running the generated code against the scoped Q3 sources in a strict sandbox.'}
        {stage === 'result' && 'Q3 revenue review completed with evidence for every material claim. Missing customer data and risky payment records are flagged.'}
      </p>
      <PipelineRail activeIndex={activeIndex} onSelect={onSelectStage} />
      {stage === 'intent' && <div className="summary-grid"><Summary title="Intent" value={investigation.intent} /><Summary title="Scope" value={investigation.scope} /><Summary title="Policy" value={investigation.policy} /></div>}
      {stage === 'planner' && <div className="summary-grid plan-grid"><Summary title="01" value="Retrieve scoped Q3 rows" /><Summary title="02" value="Normalize revenue" /><Summary title="03" value="Generate report tags" /><Summary title="04" value="Attach evidence" /></div>}
      {stage === 'execute' && <div className="summary-grid dark-grid"><Summary title="Network" value="blocked" /><Summary title="Filesystem" value="read-only" /><Summary title="Policy" value="0 violations" /><Summary title="Evidence" value="4 links" /></div>}
      {stage === 'result' && <div className="summary-grid"><Summary title="$571K" value="reviewed revenue" /><Summary title="Enterprise" value="top segment" /><Summary title="2 flags" value="data quality" /></div>}
    </article>
  )
}

function Summary({ title, value }: { title: string; value: string }) {
  return <div className="summary-item"><strong>{title}</strong><span>{value}</span></div>
}
