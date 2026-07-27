import type { FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { IngestionJobResponse } from '../api/ingestionApi'
import type { ConnectorJobUiStatus, SnowflakeConnection } from '../model/types'
import { IngestionJobStatus } from './IngestionJobStatus'

type SnowflakeFormProps = {
  connection: SnowflakeConnection
  status: ConnectorJobUiStatus
  job: IngestionJobResponse | null
  error: string | null
  onChange: (field: keyof SnowflakeConnection, value: string | boolean) => void
  onSubmit: () => void
  onRetryStatus: () => void
  onRetryFiles: () => void
  onNewImport: () => void
  onBack: () => void
}

function isValidLimit(value: string) {
  if (!value.trim()) return true
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1
}

export function SnowflakeForm({ connection, status, job, error, onChange, onSubmit, onRetryStatus, onRetryFiles, onNewImport, onBack }: SnowflakeFormProps) {
  const busy = status === 'submitting' || status === 'polling' || status === 'discovering_files'
  const locked = Boolean(job) || busy
  const discoveryReady = connection.discoverTables || connection.discoverStages
  const limitsReady = isValidLimit(connection.tableLimit) && isValidLimit(connection.stageLimit)
  const requiredReady = Boolean(connection.account.trim() && connection.user.trim() && connection.privateKey.trim() && discoveryReady && limitsReady)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (requiredReady && !locked) onSubmit()
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Snowflake import</h2><Badge className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Live API</Badge></div>
      <p className="text-sm text-[#6d685e] dark:text-[#aaa397]">Discover tables or stages and copy their data into AXIOM storage.</p>
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">Account<Input autoComplete="off" value={connection.account} onChange={(event) => onChange('account', event.target.value)} disabled={locked} required /></label>
          <label className="grid gap-2">User<Input autoComplete="off" value={connection.user} onChange={(event) => onChange('user', event.target.value)} disabled={locked} required /></label>
        </div>
        <label className="grid gap-2">Private key<textarea className="min-h-40 resize-y rounded-xl border border-[#d8d0c2] bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-[#2456e8] focus-visible:ring-3 focus-visible:ring-[#2456e8]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#38372f]" autoComplete="off" placeholder="-----BEGIN PRIVATE KEY-----" value={connection.privateKey} onChange={(event) => onChange('privateKey', event.target.value)} disabled={locked} required /></label>

        <details className="rounded-2xl border border-[#d8d0c2] bg-[#f4efe5] p-4 dark:border-[#38372f] dark:bg-[#292923]">
          <summary className="cursor-pointer font-semibold">Advanced connection and discovery</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 md:col-span-2">Private key passphrase<Input autoComplete="new-password" type="password" value={connection.privateKeyPassphrase} onChange={(event) => onChange('privateKeyPassphrase', event.target.value)} disabled={locked} /></label>
            <label className="grid gap-2">Warehouse<Input value={connection.warehouse} onChange={(event) => onChange('warehouse', event.target.value)} disabled={locked} /></label>
            <label className="grid gap-2">Database<Input value={connection.database} onChange={(event) => onChange('database', event.target.value)} disabled={locked} /></label>
            <label className="grid gap-2">Schema<Input value={connection.schema} onChange={(event) => onChange('schema', event.target.value)} disabled={locked} /></label>
            <label className="grid gap-2">Role<Input value={connection.role} onChange={(event) => onChange('role', event.target.value)} disabled={locked} /></label>
            <label className="flex items-center gap-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-3 dark:border-[#38372f] dark:bg-[#20201c]"><Checkbox checked={connection.discoverTables} onCheckedChange={(checked) => onChange('discoverTables', Boolean(checked))} disabled={locked} /><span>Discover tables</span></label>
            <label className="flex items-center gap-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-3 dark:border-[#38372f] dark:bg-[#20201c]"><Checkbox checked={connection.discoverStages} onCheckedChange={(checked) => onChange('discoverStages', Boolean(checked))} disabled={locked} /><span>Discover stages</span></label>
            <label className="grid gap-2 md:col-span-2">Stage pattern<Input value={connection.stagePattern} onChange={(event) => onChange('stagePattern', event.target.value)} disabled={locked || !connection.discoverStages} /></label>
            <label className="grid gap-2">Table limit<Input inputMode="numeric" min={1} type="number" value={connection.tableLimit} onChange={(event) => onChange('tableLimit', event.target.value)} disabled={locked || !connection.discoverTables} aria-invalid={!isValidLimit(connection.tableLimit)} /></label>
            <label className="grid gap-2">Stage limit<Input inputMode="numeric" min={1} type="number" value={connection.stageLimit} onChange={(event) => onChange('stageLimit', event.target.value)} disabled={locked || !connection.discoverStages} aria-invalid={!isValidLimit(connection.stageLimit)} /></label>
          </div>
          {!discoveryReady && <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">Enable table or stage discovery.</p>}
          {!limitsReady && <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">Discovery limits must be whole numbers greater than zero.</p>}
        </details>

        <div className="mt-2 flex justify-end gap-3"><Button variant="outline" onClick={onBack} disabled={busy} type="button">Back</Button><Button className="bg-[#2456e8] text-white hover:bg-[#1d48c7]" disabled={!requiredReady || locked} type="submit">{status === 'submitting' ? 'Creating job…' : status === 'failed' && !job ? 'Retry import' : 'Start Snowflake import'}</Button></div>
      </form>
    </Card>
    <IngestionJobStatus
      connectorName="Snowflake"
      mark="SF"
      description="Warehouse connector · table and stage discovery"
      status={status}
      job={job}
      error={error}
      idleNotes={['Key-pair authentication is required', 'Tables and stages are copied into AXIOM storage', 'Private key material is cleared after job creation']}
      onRetryStatus={onRetryStatus}
      onRetryFiles={onRetryFiles}
      onNewImport={onNewImport}
    />
  </div>
}
