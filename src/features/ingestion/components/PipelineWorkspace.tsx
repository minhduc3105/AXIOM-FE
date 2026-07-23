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
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Run pipeline</h2><Badge className={cn('rounded-full px-3 py-1', status === 'success' ? 'bg-emerald-50 text-emerald-700' : status === 'loading' ? 'bg-[#eef2ff] text-[#1018a2]' : 'bg-[#f4efe5] text-[#6d685e] dark:bg-[#292923] dark:text-[#aaa397]')}>{status === 'success' ? 'Profile ready' : status === 'loading' ? 'Pipeline running' : status === 'error' ? 'Needs retry' : 'Ready to run'}</Badge></div>
      <div className="grid gap-3">{tasks.map((task, index) => <article className={cn('grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#20201c] max-md:grid-cols-[42px_minmax(0,1fr)]', task.status === 'running' && 'border-[#2456e8]/50 bg-[#eef2ff] dark:bg-[#202844]', task.status === 'complete' && 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30')} key={task.id}>
        <span className={cn('grid size-10 place-items-center rounded-full bg-[#ece6da] text-sm font-bold text-[#6d685e]', task.status === 'complete' && 'bg-emerald-500 text-white', task.status === 'running' && 'bg-[#2456e8] text-white')}>{task.status === 'complete' ? '✓' : index + 1}</span>
        <div><strong>{task.title}</strong><p className="text-sm leading-relaxed text-[#6d685e] dark:text-[#aaa397]">{task.description}</p></div>
        <span className="text-xs text-[#6d685e] dark:text-[#aaa397] max-md:col-start-2">{task.status === 'running' ? 'Running…' : task.status === 'complete' ? 'Complete' : task.status === 'error' ? 'Failed' : 'Queued'}</span>
      </article>)}</div>
    </Card>
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <h2 className="text-2xl font-semibold">Run controls</h2>
      <div className="mt-5 grid gap-3">
        {status === 'success' ? <Button className="h-12 rounded-full bg-[#2456e8] text-white hover:bg-[#1d48c7]" type="button" onClick={onReview}>Review profile</Button> : <Button className="h-12 rounded-full bg-[#2456e8] text-white hover:bg-[#1d48c7]" type="button" onClick={onRun} disabled={status === 'loading'}>{status === 'loading' ? 'Pipeline running…' : status === 'error' ? 'Retry pipeline' : 'Run pipeline'}</Button>}
        <Button variant="outline" className="h-12 rounded-full" type="button" onClick={onBack} disabled={status === 'loading'}>Back to source</Button>
      </div>
      <div className="mt-5 grid overflow-hidden rounded-2xl border border-[#d8d0c2] text-sm dark:border-[#38372f]"><div className="grid grid-cols-2 bg-[#f4efe5] p-3 dark:bg-[#292923]"><strong>Key</strong><strong>Value</strong></div><div className="grid grid-cols-2 p-3"><span>Repo</span><span>axiom-ingest/workspace-q3</span></div><div className="grid grid-cols-2 p-3"><span>Source</span><span>{source.kind === 'mysql' ? 'MySQL · analytics/public' : `${source.files.length} uploaded file${source.files.length === 1 ? '' : 's'}`}</span></div><div className="grid grid-cols-2 p-3"><span>Mode</span><span>metadata + search index</span></div><div className="grid grid-cols-2 p-3"><span>Access</span><span>read-only source</span></div></div>
      <div className="mt-5 rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong>Required gates</strong><p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">PII scan enabled · Reviewer approval gate on · External sharing blocked until index validation passes.</p><Badge className="mt-3 bg-emerald-50 text-emerald-700">0 write permissions</Badge></div>
    </Card>
  </div>
}
