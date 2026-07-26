import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/shared/lib/utils'
import type { IngestionJobResponse } from '../api/ingestionApi'
import type { ConnectorJobUiStatus } from '../model/types'

type IngestionJobStatusProps = {
  connectorName: string
  mark: string
  description: string
  status: ConnectorJobUiStatus
  job: IngestionJobResponse | null
  error: string | null
  idleNotes: string[]
  onRetryStatus: () => void
  onRetryFiles: () => void
  onNewImport: () => void
}

const backendStatusLabel = {
  pending: 'Import queued',
  pulling: 'Importing source data…',
  completed: 'Source data stored',
  failed: 'Import failed',
} as const

function formatTimestamp(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function IngestionJobStatus({
  connectorName,
  mark,
  description,
  status,
  job,
  error,
  idleNotes,
  onRetryStatus,
  onRetryFiles,
  onNewImport,
}: IngestionJobStatusProps) {
  const visibleStatus = status === 'submitting'
    ? 'Creating import job…'
    : status === 'discovering_files'
      ? 'Preparing indexing'
      : status === 'files_error'
        ? 'Indexing handoff failed'
        : status === 'status_error'
          ? 'Status unavailable'
          : job
            ? backendStatusLabel[job.status]
            : status === 'failed'
              ? 'Import could not start'
              : 'Ready to import'
  const sourceStored = job?.status === 'completed'
  const successful = sourceStored && status === 'completed'
  const jobFailed = status === 'failed' || job?.status === 'failed'
  const failed = jobFailed || status === 'files_error'
  const active = status === 'submitting' || status === 'polling' || status === 'discovering_files'
  const currentStep = sourceStored ? 2 : job?.status === 'pulling' || (job?.status === 'failed' && job.started_at) ? 1 : 0
  const transferSteps = ['Job queued', 'Copying objects', 'Stored']

  return <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
    <div className="flex items-start justify-between gap-4">
      <h2 className="text-2xl font-semibold">Import status</h2>
      <Badge className={cn(
        'rounded-full border px-3 py-1',
        successful && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
        failed && 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
        !successful && !failed && 'border-[#d8d0c2] bg-[#f4efe5] text-[#6d685e] dark:border-[#38372f] dark:bg-[#292923] dark:text-[#aaa397]',
      )}>{visibleStatus}</Badge>
    </div>

    <div className="mt-5 flex gap-4 rounded-3xl border border-[#d8d0c2] bg-[#f4efe5] p-4 dark:border-[#38372f] dark:bg-[#292923]">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#2456e8] text-xs font-bold text-white">{mark}</span>
      <div className="min-w-0">
        <h3 className="text-xl font-semibold">{connectorName}</h3>
        <p className="text-sm text-[#6d685e] dark:text-[#aaa397]">{description}</p>
      </div>
    </div>

    {(job || status === 'submitting') && <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Import progress">
      {transferSteps.map((step, index) => {
        const complete = sourceStored || index < currentStep
        const current = !sourceStored && index === currentStep
        const stepFailed = failed && current
        return <li
          className={cn(
            'grid min-w-0 gap-2 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-3 text-center text-xs text-[#6d685e] dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#aaa397]',
            complete && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
            current && 'border-[#7895ff] bg-[#eef2ff] font-semibold text-[#1018a2] dark:border-[#5661f6] dark:bg-[#202844] dark:text-[#dfe6ff]',
            stepFailed && 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
          )}
          aria-current={current ? 'step' : undefined}
          key={step}
        >
          <span className={cn(
            'mx-auto grid size-6 place-items-center rounded-full border border-[#d8d0c2] bg-white font-semibold dark:border-[#38372f] dark:bg-[#292923]',
            complete && 'border-emerald-500 bg-emerald-500 text-white',
            current && 'border-[#2456e8] bg-[#2456e8] text-white',
            stepFailed && 'border-red-500 bg-red-500 text-white',
          )}>{complete ? '✓' : index + 1}</span>
          <span className="truncate">{step}</span>
        </li>
      })}
    </ol>}

    {active && <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#c8d2ff] bg-[#f4f6ff] p-3 text-sm text-[#1018a2] dark:border-[#38488f] dark:bg-[#202844] dark:text-[#dfe6ff]" role="status">
      <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#c8d2ff] border-t-[#2456e8]" />
      <span>
        {status === 'submitting'
          ? 'Creating the import job…'
          : status === 'discovering_files'
            ? 'Loading stored objects and preparing Corpus indexing status…'
            : job?.status === 'pending'
              ? 'Waiting for the connector worker…'
              : 'Copying source objects into AXIOM storage…'}
      </span>
    </div>}

    {!job && status === 'idle' && <ul className="mt-5 grid gap-2">
      {idleNotes.map((note) => <li className="flex items-start gap-2 rounded-2xl bg-[#f4efe5] px-3 py-2 text-sm dark:bg-[#292923]" key={note}>
        <i className="mt-1.5 size-2 shrink-0 rounded-full bg-[#2456e8]" />
        <span>{note}</span>
      </li>)}
    </ul>}

    {job && <div className="mt-5 grid gap-3" role="status" aria-live="polite">
      <div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d685e] dark:text-[#aaa397]">Job ID</span>
        <strong className="mt-1 block break-all font-mono text-sm">{job.job_id}</strong>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong className="block text-2xl">{job.records_pulled}</strong><span className="text-sm text-[#6d685e] dark:text-[#aaa397]">Records pulled</span></div>
        <div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong className="block text-2xl">{job.objects_written}</strong><span className="text-sm text-[#6d685e] dark:text-[#aaa397]">Objects stored</span></div>
      </div>
      <dl className="grid gap-2 rounded-2xl border border-[#d8d0c2] p-4 text-sm dark:border-[#38372f]">
        <div className="flex justify-between gap-4"><dt className="text-[#6d685e] dark:text-[#aaa397]">Started</dt><dd className="text-right">{formatTimestamp(job.started_at)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#6d685e] dark:text-[#aaa397]">Finished</dt><dd className="text-right">{formatTimestamp(job.finished_at)}</dd></div>
      </dl>
    </div>}

    {(error || job?.error_message) && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
      {job?.error_message || error}
    </div>}

    {successful && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
      Source data is stored and linked to AXIOM's document processing tracker.
    </div>}

    {status === 'status_error' && <Button className="mt-5 w-full rounded-full" variant="outline" type="button" onClick={onRetryStatus}>Retry status check</Button>}
    {status === 'files_error' && <Button className="mt-5 w-full rounded-full" variant="outline" type="button" onClick={onRetryFiles}>Retry indexing handoff</Button>}
    {jobFailed && job && <Button className="mt-5 w-full rounded-full" variant="outline" type="button" onClick={onNewImport}>Start new import</Button>}
  </Card>
}
