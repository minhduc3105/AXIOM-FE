import type { AsyncStatus, MySqlConnection } from '../model/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

type MySqlFormProps = {
  connection: MySqlConnection
  status: AsyncStatus | 'verified' | 'saving' | 'saved'
  onChange: (field: keyof MySqlConnection, value: string | boolean) => void
  onTest: () => void
  onSave: () => void
  onBack: () => void
}

export function MySqlForm({ connection, status, onChange, onTest, onSave, onBack }: MySqlFormProps) {
  const tested = status === 'verified' || status === 'saving' || status === 'saved'
  const testing = status === 'loading'
  const saving = status === 'saving'
  const requiredReady = Boolean(connection.host.trim() && connection.port.trim() && connection.database.trim() && connection.username.trim() && connection.password.trim())

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">MySQL connection</h2><Badge className="rounded-full bg-[#eef2ff] text-[#1018a2] dark:bg-[#202844] dark:text-[#dfe6ff]">SQL database</Badge></div>
      <p className="text-sm text-[#6d685e] dark:text-[#aaa397]">Enter the credentials AXIOM needs to read your source.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 md:col-span-2">Host<Input value={connection.host} onChange={(event) => onChange('host', event.target.value)} required /></label>
        <label className="grid gap-2">Port<Input value={connection.port} onChange={(event) => onChange('port', event.target.value)} inputMode="numeric" required /></label>
        <label className="grid gap-2">Database<Input value={connection.database} onChange={(event) => onChange('database', event.target.value)} required /></label>
        <label className="grid gap-2">Schema<Input value={connection.schema} onChange={(event) => onChange('schema', event.target.value)} /></label>
        <label className="grid gap-2">Username<Input value={connection.username} onChange={(event) => onChange('username', event.target.value)} required /></label>
        <label className="grid gap-2">Password<Input type="password" value={connection.password} onChange={(event) => onChange('password', event.target.value)} required /></label>
        <label className="grid gap-2 md:col-span-2">SSL mode<select className="h-10 rounded-lg border border-[#d8d0c2] bg-transparent px-3 dark:border-[#38372f]" value={connection.sslMode} onChange={(event) => onChange('sslMode', event.target.value)}><option>Require</option><option>Prefer</option><option>Disable</option></select></label>
      </div>
      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-[#d8d0c2] bg-[#f4efe5] p-4 dark:border-[#38372f] dark:bg-[#292923]"><Checkbox checked={connection.encrypted} onCheckedChange={(checked) => onChange('encrypted', Boolean(checked))} /><span className="grid"><span>Use encrypted connection</span><small className="text-[#6d685e] dark:text-[#aaa397]">Recommended for production sources</small></span></label>
      <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onBack} type="button">Back</Button><Button className="bg-[#2456e8] text-white hover:bg-[#1d48c7]" onClick={onTest} disabled={testing || saving || !requiredReady} type="button">{testing ? 'Testing…' : tested ? 'Test again' : 'Test connection'}</Button></div>
    </Card>
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Connection preview</h2><Badge className={tested ? 'rounded-full bg-emerald-50 text-emerald-700' : 'rounded-full bg-[#f4efe5] text-[#6d685e] dark:bg-[#292923] dark:text-[#aaa397]'}>{tested ? 'Verified' : 'Ready to test'}</Badge></div>
      <div className="flex gap-4 rounded-3xl border border-[#d8d0c2] bg-[#f4efe5] p-4 dark:border-[#38372f] dark:bg-[#292923]"><span className="grid size-12 place-items-center rounded-2xl bg-[#2456e8] text-xs font-bold text-white">MY</span><div><h3 className="text-xl font-semibold">MySQL</h3><p className="text-sm text-[#6d685e] dark:text-[#aaa397]">Relational database · live connection</p><small className="text-[#6d685e] dark:text-[#aaa397]">{tested ? 'Connection verified' : 'Selected from connector catalog'}</small></div></div>
      <h3 className="mt-6 text-lg font-semibold">What we need</h3>
      <ul className="mt-3 grid gap-2">{['Host and port', 'Database and schema', 'Read-only credentials', 'Encrypted connection'].map((item) => <li className="flex items-center gap-2 rounded-2xl bg-[#f4efe5] px-3 py-2 text-sm dark:bg-[#292923]" key={item}><i className={tested ? 'size-2 rounded-full bg-emerald-500' : 'size-2 rounded-full bg-[#d8d0c2]'} />{item}</li>)}</ul>
      <div className="my-5 rounded-2xl border border-[#d8d0c2] bg-[#fffaf0] p-4 text-sm text-[#6d685e] dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#aaa397]">Fields adapt to each connector; MySQL uses host, port, database, schema, username, password and SSL mode.</div>
      <Button className="h-12 w-full rounded-full bg-[#2456e8] text-white hover:bg-[#1d48c7]" onClick={onSave} disabled={status !== 'verified'} type="button">{saving ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save connection and continue to pipeline'}</Button>
    </Card>
  </div>
}
