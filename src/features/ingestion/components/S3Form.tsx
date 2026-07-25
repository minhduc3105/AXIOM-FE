import type { FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { IngestionJobResponse } from '../api/ingestionApi'
import type { ConnectorJobUiStatus, S3Connection } from '../model/types'
import { IngestionJobStatus } from './IngestionJobStatus'

type S3FormProps = {
  connection: S3Connection
  status: ConnectorJobUiStatus
  job: IngestionJobResponse | null
  error: string | null
  onChange: (field: keyof S3Connection, value: string) => void
  onSubmit: () => void
  onRetryStatus: () => void
  onNewImport: () => void
  onBack: () => void
}

export function S3Form({ connection, status, job, error, onChange, onSubmit, onRetryStatus, onNewImport, onBack }: S3FormProps) {
  const busy = status === 'submitting' || status === 'polling'
  const locked = Boolean(job) || busy
  const requiredReady = Boolean(
    connection.accessKeyId.trim()
    && connection.secretAccessKey.trim()
    && connection.region.trim()
    && connection.bucketName.trim(),
  )
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (requiredReady && !locked) onSubmit()
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Amazon S3 import</h2><Badge className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Live API</Badge></div>
      <p className="text-sm text-[#6d685e] dark:text-[#aaa397]">Copy source objects into AXIOM-managed storage.</p>
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <label className="grid gap-2">AWS access key ID<Input autoComplete="off" value={connection.accessKeyId} onChange={(event) => onChange('accessKeyId', event.target.value)} disabled={locked} required /></label>
        <label className="grid gap-2">AWS secret access key<Input autoComplete="new-password" type="password" value={connection.secretAccessKey} onChange={(event) => onChange('secretAccessKey', event.target.value)} disabled={locked} required /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">AWS region<Input placeholder="ap-southeast-1" value={connection.region} onChange={(event) => onChange('region', event.target.value)} disabled={locked} required /></label>
          <label className="grid gap-2">Source bucket<Input placeholder="company-documents" value={connection.bucketName} onChange={(event) => onChange('bucketName', event.target.value)} disabled={locked} required /></label>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          This imports every object in the selected bucket. Prefix, folder and object filters are not available.
        </div>
        <div className="mt-2 flex justify-end gap-3"><Button variant="outline" onClick={onBack} disabled={busy} type="button">Back</Button><Button className="bg-[#2456e8] text-white hover:bg-[#1d48c7]" disabled={!requiredReady || locked} type="submit">{status === 'submitting' ? 'Creating job…' : status === 'failed' && !job ? 'Retry import' : 'Start S3 import'}</Button></div>
      </form>
    </Card>
    <IngestionJobStatus
      connectorName="Amazon S3"
      mark="S3"
      description="External object storage · full bucket import"
      status={status}
      job={job}
      error={error}
      idleNotes={['Read access to the source bucket', 'Every source object will be copied', 'Credentials are cleared after job creation']}
      onRetryStatus={onRetryStatus}
      onNewImport={onNewImport}
    />
  </div>
}
