import type { AsyncStatus, IngestionSource, PipelineTask } from '../model/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/shared/lib/utils'

type PipelineWorkspaceProps = {
  source: IngestionSource
  tasks: PipelineTask[]
  status: AsyncStatus
  onRun: () => void
  onReview: () => void
  onBack: () => void
}

export function PipelineWorkspace({ source, tasks, status, onRun, onReview, onBack }: PipelineWorkspaceProps) {
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
    <Card className="rounded-[32px] border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Run pipeline</h2><Badge className={cn('rounded-full px-3 py-1', status === 'success' ? 'bg-status-success/10 text-status-success' : status === 'loading' ? 'bg-info/10 text-info' : 'bg-secondary text-muted-foreground')}>{status === 'success' ? 'Profile ready' : status === 'loading' ? 'Pipeline running' : status === 'error' ? 'Needs retry' : 'Ready to run'}</Badge></div>
      <div className="grid gap-3">{tasks.map((task, index) => <article className={cn('grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card p-4 max-md:grid-cols-[42px_minmax(0,1fr)]', task.status === 'running' && 'border-primary/35 bg-primary/10', task.status === 'complete' && 'border-status-success/25 bg-status-success/10')} key={task.id}>
        <span className={cn('grid size-10 place-items-center rounded-full bg-secondary text-sm font-bold text-muted-foreground', task.status === 'complete' && 'bg-status-success text-primary-foreground', task.status === 'running' && 'bg-primary text-primary-foreground')}>{task.status === 'complete' ? '✓' : index + 1}</span>
        <div><strong>{task.title}</strong><p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p></div>
        <span className="text-xs text-muted-foreground max-md:col-start-2">{task.status === 'running' ? 'Running…' : task.status === 'complete' ? 'Complete' : task.status === 'error' ? 'Failed' : 'Queued'}</span>
      </article>)}</div>
    </Card>
    <Card className="rounded-[32px] border border-border bg-card p-6">
      <h2 className="text-2xl font-semibold">Run controls</h2>
      <div className="mt-5 grid gap-3">
        {status === 'success' ? <Button className="h-12 rounded-full" type="button" onClick={onReview}>Review profile</Button> : <Button className="h-12 rounded-full" type="button" onClick={onRun} disabled={status === 'loading'}>{status === 'loading' ? 'Pipeline running…' : status === 'error' ? 'Retry pipeline' : 'Run pipeline'}</Button>}
        <Button variant="outline" className="h-12 rounded-full" type="button" onClick={onBack} disabled={status === 'loading'}>Back to source</Button>
      </div>
      <div className="mt-5 grid overflow-hidden rounded-2xl border border-border text-sm"><div className="grid grid-cols-2 bg-secondary p-3"><strong>Key</strong><strong>Value</strong></div><div className="grid grid-cols-2 p-3"><span>Repo</span><span>axiom-ingest/workspace-q3</span></div><div className="grid grid-cols-2 p-3"><span>Source</span><span>{source.kind === 'mysql' ? 'MySQL · analytics/public' : `${source.files.length} uploaded file${source.files.length === 1 ? '' : 's'}`}</span></div><div className="grid grid-cols-2 p-3"><span>Mode</span><span>metadata + search index</span></div><div className="grid grid-cols-2 p-3"><span>Access</span><span>read-only source</span></div></div>
      <div className="mt-5 rounded-2xl bg-secondary p-4"><strong>Required gates</strong><p className="mt-1 text-sm text-muted-foreground">PII scan enabled · Reviewer approval gate on · External sharing blocked until index validation passes.</p><Badge className="mt-3 bg-status-success/10 text-status-success">0 write permissions</Badge></div>
    </Card>
  </div>
}
