import type { DetailStage } from '../features/chat/model/types'

type DetailInspectorProps = { stage: DetailStage; onClose: () => void }

const detailCopy = {
  intent: { eyebrow: 'DETAIL INSPECTOR', title: 'Intent & Spec' },
  planner: { eyebrow: 'DETAIL INSPECTOR', title: 'Planner review' },
  execute: { eyebrow: 'DETAIL INSPECTOR', title: 'Execute & Validate' },
  result: { eyebrow: 'DETAIL INSPECTOR', title: 'Result & Evidence' },
}

export function DetailInspector({ stage, onClose }: DetailInspectorProps) {
  const copy = detailCopy[stage]
  return <aside className="detail-inspector">
    <div className="inspector-heading"><div><span className="eyebrow blue">{copy.eyebrow}</span><h2>{copy.title}</h2></div><button className="inspector-close" onClick={onClose} type="button" aria-label="Close detail inspector">×</button></div>
    {stage === 'intent' && <IntentDetail />}
    {stage === 'planner' && <PlannerDetail />}
    {stage === 'execute' && <ExecuteDetail />}
    {stage === 'result' && <ResultDetail />}
  </aside>
}

function IntentDetail() {
  return <>
    <section className="inspector-card blue-card"><span className="eyebrow">INTENT ROUTER</span><strong className="confidence">94%</strong><h3>generate_revenue_report</h3><p>Business report + computation + cited evidence required.</p></section>
    <section className="inspector-card"><span className="eyebrow">EXECUTION CONTRACT</span><DetailRows rows={[
      ['Input', 'Q3 revenue review'],
      ['Scope', 'customer_revenue_q3.csv · renewal_risk_notes.md · payment_events.json'],
      ['Constraints', 'policy_mode: strict · require_evidence: true · external_network: blocked'],
      ['Steps', 'retrieve indexed customer records · identify missing customer contact data · calculate Q3 revenue by segment · generate reviewed findings · cite every material claim'],
      ['Output', 'type: markdown_report · executive_summary · segment_table · risks · evidence_map'],
    ]} /></section>
    <section className="inspector-card"><strong>Data readiness</strong><p>3 scoped sources found · external network disabled</p></section>
  </>
}

function PlannerDetail() {
  return <>
    <section className="inspector-card blue-card"><div className="inspector-card-header"><span className="eyebrow">PLANNER OUTPUT</span><button className="expand-button">Expand&nbsp; +</button></div><ol className="planner-output">{[
      ['Search indexed data', 'Retrieve Q3 revenue rows, payment events, and renewal notes.'],
      ['Extract facts', 'Normalize amounts, segments, missing fields, and reviewer flags.'],
      ['Generate workflow code', 'Prepare deterministic script with evidence requirements after plan approval.'],
      ['Execute sandbox', 'Run with network disabled and read-only indexed data.'],
      ['Validate claims', 'Check evidence coverage, totals, and policy requirements.'],
      ['Synthesize evidence', 'Attach source references to final report claims.'],
    ].map(([title, body], index) => <li key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol></section>
    <section className="inspector-card"><span className="eyebrow">APPROVAL GATE</span><p>The Code Generator does not start until the reviewer agrees with this plan. Feedback loops back into Planner, not execution.</p><span className="inspector-pill">Waiting for plan approval</span></section>
    <section className="inspector-card soft-card"><span className="eyebrow">PLANNER HANDOFF</span><p>Inputs: approved spec, selected method, strict policy, data scope.</p><p>Outputs: plan manifest, evidence requirements, code generation contract.</p><span className="light-pill">Planner-only detail</span></section>
  </>
}

function ExecuteDetail() {
  return <>
    <section className="inspector-card blue-card"><span className="eyebrow">SANDBOX CONSTRAINTS</span><DetailRows rows={[
      ['External network', 'Blocked'], ['Filesystem', 'Read-only'], ['Data access', 'Approved indexes only'], ['Policy posture', 'Strict'],
    ]} /></section>
    <section className="inspector-card"><span className="eyebrow">VALIDATOR RECORD</span><strong className="inspector-highlight">0 policy violations</strong><p>4/4 material claims linked · 2 data quality flags surfaced</p></section>
    <section className="inspector-card run-log"><span className="eyebrow">RUN LOG</span><pre>{'[00:01] sandbox allocated\n[00:03] revenue table generated\n[00:05] evidence-map linked\n[00:06] validator passed'}</pre></section>
  </>
}

function ResultDetail() {
  const evidence = [
    ['EV-001', 'customer_revenue_q3.csv · row 14', 'Enterprise generated $505K', 'success'],
    ['EV-002', 'customer_revenue_q3.csv · rows 18,22', 'Two records have missing emails', 'warning'],
    ['EV-003', 'payment_events.json · events 1013,1018', 'Failed payments need attention', 'warning'],
    ['EV-004', 'renewal_risk_notes.md · line 42', 'Reviewer approval required', 'success'],
  ]
  return <>
    <section className="inspector-card blue-card"><span className="eyebrow">FINAL ANSWER</span><strong>Revenue $571K · Enterprise $505K · 2 data-quality flags</strong></section>
    <div className="evidence-title"><strong>Evidence map</strong><span className="light-pill">4/4 cited</span></div>
    <div className="evidence-list">{evidence.map(([tag, source, text, tone]) => <section className="evidence-item" key={tag}><div><span className={`evidence-tag ${tone}`}>{tag}</span><small>{source}</small></div><p>{text}</p></section>)}</div>
    <section className="inspector-card"><strong>Artifacts</strong><p>report.md · evidence-map.json · validator.log</p></section>
  </>
}

function DetailRows({ rows }: { rows: string[][] }) {
  return <div className="detail-rows">{rows.map(([label, value]) => <div key={label}><span>{label}</span><p>{value}</p></div>)}</div>
}
