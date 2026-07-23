import type { AsyncStatus, IndexStatus, IngestionSource } from '../model/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/shared/lib/utils'

type IndexWorkspaceProps = {
  source: IngestionSource
  status: IndexStatus
  query: string
  completedQuery: string
  searchStatus: AsyncStatus
  onQueryChange: (query: string) => void
  onSearch: () => void
  onBack: () => void
}

const evidence = [
  ['C-1002 · Packet Foundry', 'Missing email, Mid-market segment, $48K revenue, matched row 14.'],
  ['C-1005 · Lattice Bank', 'Missing email, Enterprise segment, $210K revenue, matched row 22.'],
  ['Policy chunk 02', 'External sharing requires reviewer approval for personal data fields.'],
]

export function IndexWorkspace({ source, status, query, completedQuery, searchStatus, onQueryChange, onSearch, onBack }: IndexWorkspaceProps) {
  if (status === 'building') return <Card className="grid min-h-80 place-items-center rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-10 text-center dark:border-[#38372f] dark:bg-[#1a1a17]/90" role="status"><span className="size-10 animate-spin rounded-full border-4 border-[#d8d0c2] border-t-[#2456e8]" /><h2 className="mt-5 text-2xl font-semibold">Building searchable index</h2><p className="mt-2 max-w-xl text-[#6d685e] dark:text-[#aaa397]">Creating evidence chunks, source maps, governance filters, and retrieval metadata…</p></Card>
  const sourceRows = source.kind === 'mysql'
    ? [['customers', 'SQL table', '1,248 rows', 'PII gate'], ['payment_events', 'SQL table', '421 rows', 'risk filters'], ['retention_rules', 'SQL table', '4 rows', 'sharing rules'], ['supplier_contracts', 'SQL table', '151 rows', 'review sample']]
    : source.files.map((file, index) => [file.name, file.extension === 'CSV' ? 'CSV table' : file.extension === 'JSON' ? 'JSON events' : file.extension === 'PDF' ? 'PDF/OCR' : 'Document', index === 0 ? '1,248 units' : 'Mock chunks', index === 0 ? 'PII gate' : 'review sample'])
  const sourceCount = sourceRows.length

  return <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90"><h2 className="text-2xl font-semibold">Activation summary</h2>{[['Ready', 'Index status'], [`${sourceCount} source${sourceCount === 1 ? '' : 's'}`, 'Indexed assets'], ['1,824 chunks', 'Evidence map'], ['PII gated', 'Policy posture']].map(([value, label], index) => <div className={cn('mt-3 rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]', index === 0 && 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200', index === 3 && 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200')} key={label}><strong className="block text-2xl">{value}</strong><span className="text-xs opacity-75">{label}</span></div>)}<div className="mt-5 rounded-2xl border border-[#d8d0c2] bg-[#fffaf0] p-4 dark:border-[#38372f] dark:bg-[#20201c]"><strong>Artifacts</strong><p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">source-manifest.json · profile-report.json · semantic-map.json · search-index.json · ingestion-audit.log</p></div><Button variant="outline" className="mt-5 w-full rounded-full" type="button" onClick={onBack}>Back to meaning</Button></Card>
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90"><div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Search indexed asset</h2><Badge className="bg-emerald-50 text-emerald-700">{sourceCount}/{sourceCount} sources searchable</Badge></div><form className="mt-5 flex gap-3 max-sm:flex-col" onSubmit={(event) => { event.preventDefault(); onSearch() }}><Input value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label="Search indexed evidence" /><Button className="bg-[#2456e8] text-white hover:bg-[#1d48c7]" type="submit" disabled={!query.trim() || searchStatus === 'loading'}>{searchStatus === 'loading' ? 'Searching…' : 'Search'}</Button></form><div className="mt-5 overflow-x-auto rounded-2xl border border-[#d8d0c2] dark:border-[#38372f]"><Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Chunks</TableHead><TableHead>Governance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{sourceRows.map((row) => <TableRow key={row[0]}>{row.map((cell) => <TableCell key={cell}>{cell}</TableCell>)}<TableCell>Ready</TableCell></TableRow>)}</TableBody></Table></div>{completedQuery ? <div className="mt-5 grid gap-3" aria-live="polite"><small className="text-[#6d685e] dark:text-[#aaa397]">Showing mock evidence for “{completedQuery}”</small>{evidence.map(([title, copy], index) => <Card className={cn('rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#20201c]', index === 0 && 'border-[#2456e8] bg-[#eef2ff] dark:bg-[#202844]')} key={title}><strong>{title}</strong><span className="mt-1 block text-sm text-[#6d685e] dark:text-[#aaa397]">{copy}</span></Card>)}</div> : <div className="mt-5 rounded-2xl bg-[#f4efe5] p-4 text-sm text-[#6d685e] dark:bg-[#292923] dark:text-[#aaa397]">Run the example search to validate indexed evidence and row-level source references.</div>}</Card>
  </div>
}
