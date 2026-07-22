import type { AsyncStatus, IngestionSource, PipelineTask } from '../model/types'

type PipelineWorkspaceProps = {
  source: IngestionSource
  tasks: PipelineTask[]
  status: AsyncStatus
  onRun: () => void
  onReview: () => void
  onBack: () => void
}

export function PipelineWorkspace({ source, tasks, status, onRun, onReview, onBack }: PipelineWorkspaceProps) {
  return <div className="pipeline-layout">
    <section className="workspace-panel pipeline-panel">
      <div className="panel-heading"><h2>Run pipeline</h2><span className={`status-pill ${status === 'success' ? 'success-pill' : status === 'loading' ? 'active-pill' : ''}`}>{status === 'success' ? 'Profile ready' : status === 'loading' ? 'Pipeline running' : status === 'error' ? 'Needs retry' : 'Ready to run'}</span></div>
      <div className="pipeline-task-list">{tasks.map((task, index) => <article className={`pipeline-task ${task.status}`} key={task.id}>
        <span className="task-marker">{task.status === 'complete' ? '✓' : index + 1}</span>
        <div><strong>{task.title}</strong><p>{task.description}</p></div>
        <span className="task-status">{task.status === 'running' ? 'Running…' : task.status === 'complete' ? 'Complete' : task.status === 'error' ? 'Failed' : 'Queued'}</span>
      </article>)}</div>
    </section>
    <aside className="workspace-panel run-controls">
      <h2>Run controls</h2>
      <div className="run-actions">
        {status === 'success' ? <button className="primary-button" type="button" onClick={onReview}>Review profile</button> : <button className="primary-button" type="button" onClick={onRun} disabled={status === 'loading'}>{status === 'loading' ? 'Pipeline running…' : status === 'error' ? 'Retry pipeline' : 'Run pipeline'}</button>}
        <button className="secondary-button" type="button" onClick={onBack} disabled={status === 'loading'}>Back to source</button>
      </div>
      <div className="key-value-table"><div><strong>Key</strong><strong>Value</strong></div><div><span>Repo</span><span>axiom-ingest/workspace-q3</span></div><div><span>Source</span><span>{source.kind === 'mysql' ? 'MySQL · analytics/public' : `${source.files.length} uploaded file${source.files.length === 1 ? '' : 's'}`}</span></div><div><span>Mode</span><span>metadata + search index</span></div><div><span>Access</span><span>read-only source</span></div></div>
      <div className="info-card"><strong>Required gates</strong><p>PII scan enabled · Reviewer approval gate on · External sharing blocked until index validation passes.</p><span className="success-chip">0 write permissions</span></div>
    </aside>
  </div>
}
