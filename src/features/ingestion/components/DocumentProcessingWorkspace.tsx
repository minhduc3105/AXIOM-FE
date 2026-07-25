import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/shared/lib/utils'
import type { DocumentProcessingStatus, UploadFilesResponse } from '../api/ingestionApi'
import type { DocumentProcessingUiStatus } from '../model/types'

type DocumentProcessingWorkspaceProps = {
  uploadResult: UploadFilesResponse
  status: DocumentProcessingUiStatus
  results: DocumentProcessingStatus[]
  error: string | null
  onRetry: () => void
  onBack: () => void
}

type FileProcessingState = 'waiting' | 'processing' | 'indexed' | 'failed'

function getFileProcessingState(result: DocumentProcessingStatus | undefined): FileProcessingState {
  if (!result?.found) return 'waiting'
  if (result.status === 'completed') return 'indexed'
  if (result.status === 'failed') return 'failed'
  return 'processing'
}

const fileStateLabel: Record<FileProcessingState, string> = {
  waiting: 'Waiting for indexing',
  processing: 'Processing',
  indexed: 'Indexed',
  failed: 'Failed',
}

function getDisplayName(filename: string | null, key: string) {
  if (filename) return filename
  return key.split('/').filter(Boolean).pop() ?? key
}

export function DocumentProcessingWorkspace({
  uploadResult,
  status,
  results,
  error,
  onRetry,
  onBack,
}: DocumentProcessingWorkspaceProps) {
  const resultsByKey = new Map(results.map((result) => [result.object_key, result]))
  const fileStates = uploadResult.files.map((file) => getFileProcessingState(resultsByKey.get(file.key)))
  const indexedCount = fileStates.filter((state) => state === 'indexed').length
  const failedCount = fileStates.filter((state) => state === 'failed').length
  const waitingCount = uploadResult.count - indexedCount - failedCount
  const active = status === 'polling'
  const complete = status === 'complete'
  const completedWithErrors = status === 'completed_with_errors'
  const statusUnavailable = status === 'status_error'
  const heading = statusUnavailable
    ? 'Status unavailable'
    : completedWithErrors
      ? 'Completed with errors'
      : complete
        ? 'All files indexed'
        : 'Document processing'

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{heading}</h2>
          <p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">
            {indexedCount} of {uploadResult.count} indexed in AXIOM Corpus
          </p>
        </div>
        <Badge className={cn(
          'shrink-0 rounded-full border px-3 py-1',
          active && 'border-[#7895ff] bg-[#eef2ff] text-[#1018a2] dark:border-[#5661f6] dark:bg-[#202844] dark:text-[#dfe6ff]',
          complete && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
          completedWithErrors && 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
          statusUnavailable && 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
        )}>
          {active ? 'Checking Corpus' : complete ? 'Indexed' : completedWithErrors ? 'Needs attention' : 'Unavailable'}
        </Badge>
      </div>

      <div className="mt-6 grid gap-3" role="list" aria-label="Document processing results">
        {uploadResult.files.map((file, index) => {
          const result = resultsByKey.get(file.key)
          const fileState = fileStates[index]
          return <article
            className={cn(
              'grid min-w-0 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#20201c] max-md:grid-cols-[42px_minmax(0,1fr)]',
              fileState === 'indexed' && 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/30',
              fileState === 'failed' && 'border-red-200 bg-red-50/70 dark:border-red-800 dark:bg-red-950/30',
              fileState === 'processing' && 'border-[#7895ff] bg-[#eef2ff] dark:border-[#5661f6] dark:bg-[#202844]',
            )}
            key={file.key}
            role="listitem"
          >
            <span className={cn(
              'grid size-10 place-items-center rounded-xl bg-[#ece6da] text-xs font-bold text-[#6d685e] dark:bg-[#34332c] dark:text-[#ddd6c9]',
              fileState === 'indexed' && 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white',
              fileState === 'failed' && 'bg-red-500 text-white dark:bg-red-500 dark:text-white',
              fileState === 'processing' && 'bg-[#2456e8] text-white dark:bg-[#7895ff] dark:text-[#0e142c]',
            )}>
              {fileState === 'indexed' ? '✓' : fileState === 'failed' ? '!' : index + 1}
            </span>
            <div className="min-w-0">
              <strong className="block truncate">{getDisplayName(file.filename, file.key)}</strong>
              <span className="mt-1 block break-all font-mono text-xs text-[#6d685e] dark:text-[#aaa397]">{file.key}</span>
              {result?.error_message && <span className="mt-2 block text-sm text-red-700 dark:text-red-300">{result.error_message}</span>}
              {result?.document_id && <span className="mt-2 block break-all text-xs text-[#6d685e] dark:text-[#aaa397]">Document {result.document_id}</span>}
            </div>
            <Badge className={cn(
              'justify-self-end rounded-full max-md:col-start-2 max-md:justify-self-start',
              fileState === 'waiting' && 'bg-[#f4efe5] text-[#6d685e] dark:bg-[#292923] dark:text-[#aaa397]',
              fileState === 'processing' && 'bg-[#dfe6ff] text-[#1018a2] dark:bg-[#303b70] dark:text-[#e5eaff]',
              fileState === 'indexed' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
              fileState === 'failed' && 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
            )}>{fileStateLabel[fileState]}</Badge>
          </article>
        })}
      </div>
    </Card>

    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <h2 className="text-2xl font-semibold">Processing summary</h2>
      <div className="mt-5 grid grid-cols-2 gap-3" role="status" aria-live="polite">
        <div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong className="block text-2xl">{uploadResult.count}</strong><span className="text-sm text-[#6d685e] dark:text-[#aaa397]">Stored</span></div>
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><strong className="block text-2xl">{indexedCount}</strong><span className="text-sm">Indexed</span></div>
        <div className="rounded-2xl bg-[#eef2ff] p-4 text-[#1018a2] dark:bg-[#202844] dark:text-[#dfe6ff]"><strong className="block text-2xl">{waitingCount}</strong><span className="text-sm">Waiting</span></div>
        <div className={cn('rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]', failedCount > 0 && 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200')}><strong className="block text-2xl">{failedCount}</strong><span className="text-sm">Failed</span></div>
      </div>

      {active && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#c8d2ff] bg-[#f4f6ff] p-4 text-sm text-[#1018a2] dark:border-[#38488f] dark:bg-[#202844] dark:text-[#dfe6ff]" role="status">
        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#c8d2ff] border-t-[#2456e8]" />
        <span>Checking AXIOM Corpus for document processing results…</span>
      </div>}

      {statusUnavailable && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
        {error ?? 'Document processing status is temporarily unavailable.'}
      </div>}

      <dl className="mt-5 grid gap-3 rounded-2xl border border-[#d8d0c2] p-4 text-sm dark:border-[#38372f]">
        <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d685e] dark:text-[#aaa397]">Bucket</dt><dd className="mt-1 break-all font-mono">{uploadResult.bucket}</dd></div>
        <div><dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6d685e] dark:text-[#aaa397]">Transfer job</dt><dd className="mt-1 break-all font-mono">{uploadResult.job_id}</dd></div>
      </dl>

      <div className="mt-5 grid gap-3">
        {statusUnavailable && <Button className="h-12 rounded-full bg-[#2456e8] text-white hover:bg-[#1d48c7]" type="button" onClick={onRetry}>Retry status check</Button>}
        <Button variant="outline" className="h-12 rounded-full" type="button" onClick={onBack}>Back to upload</Button>
      </div>
    </Card>
  </div>
}
