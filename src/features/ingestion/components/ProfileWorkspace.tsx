import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/shared/lib/utils'
import type { IngestionSource } from '../model/types'

type ProfileWorkspaceProps = {
  source: IngestionSource
  onContinue: () => void
  onBack: () => void
}

const fileRows = [
  ['customer_revenue_q3.csv', '1,248 rows', 'customer_id, email, revenue', 'PII + missing email', 'approve profile'],
  ['payment_events.json', '421 events', 'event_id, customer_id, status', 'nested metadata', 'flatten metadata'],
  ['retention_policy.md', '4 chunks', 'policy terms, retention', 'external sharing', 'semantic review'],
  ['supplier_contracts.pdf', '151 pages', 'vendor, renewal, legal terms', 'OCR confidence', 'manual sample check'],
]

const mysqlRows = [
  ['customers', '1,248 rows', 'customer_id, email, segment', 'PII + missing email', 'approve profile'],
  ['payment_events', '421 rows', 'event_id, customer_id, status', 'nested metadata', 'flatten metadata'],
  ['retention_rules', '4 records', 'policy_id, retention_days', 'external sharing', 'semantic review'],
  ['supplier_contracts', '151 rows', 'vendor, renewal, legal_terms', 'sensitive terms', 'manual sample check'],
]

export function ProfileWorkspace({ source, onContinue, onBack }: ProfileWorkspaceProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const rows = source.kind === 'mysql' ? mysqlRows : source.files.map((file, index) => {
    const fixture = fileRows[index % fileRows.length]
    return [file.name, fixture[1], fixture[2], fixture[3], fixture[4]]
  })
  const selectedRow = rows[selectedIndex] ?? rows[0]
  const sourceLabel = source.kind === 'mysql' ? 'Tables' : 'Files'

  return <div className="space-y-6">
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{[[String(rows.length), sourceLabel], ['1,824', 'Records / chunks'], ['48', 'Detected fields'], ['7', 'Governed fields'], ['2.1%', 'Missing values'], ['98%', 'Parse quality']].map(([value, label], index) => <div className={cn('rounded-2xl border border-[#d8d0c2] bg-[#fffdf8]/90 p-4 dark:border-[#38372f] dark:bg-[#1a1a17]/90', (index === 3 || index === 4) && 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200', index === 5 && 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200')} key={label}><strong className="block text-2xl">{value}</strong><span className="text-xs opacity-75">{label}</span></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
        <h2 className="text-2xl font-semibold">{source.kind === 'mysql' ? 'Table coverage' : 'File coverage'}</h2>
        {rows.map((row, index) => <Button
          className={cn('mt-3 min-h-16 w-full justify-start gap-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-3 text-left dark:border-[#38372f] dark:bg-[#20201c]', index === selectedIndex && 'border-[#2456e8] bg-[#eef2ff] dark:bg-[#202844]')}
          key={row[0]}
          type="button"
          onClick={() => setSelectedIndex(index)}
          aria-pressed={index === selectedIndex}
          aria-label={`View profile for ${row[0]}`}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#2456e8] text-xs font-bold text-white">{source.kind === 'mysql' ? 'SQL' : row[0].split('.').pop()?.toUpperCase()}</span>
          <div className="grid min-w-0"><strong className="truncate">{row[0].replace(/_/g, ' ').replace(/\.(csv|json|md|pdf)$/, '')}</strong><small className="text-[#6d685e] dark:text-[#aaa397]">{row[1]} · {index === selectedIndex ? 'selected' : 'profiled'}</small></div>
        </Button>)}
      </Card>
      <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
        <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Cross-source quality matrix</h2><Badge className="bg-emerald-50 text-emerald-700">Profile generated</Badge></div>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#d8d0c2] dark:border-[#38372f]"><Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Units</TableHead><TableHead>Key fields</TableHead><TableHead>Risk</TableHead><TableHead>Next action</TableHead></TableRow></TableHeader><TableBody>{rows.map((row, rowIndex) => <TableRow className={rowIndex === selectedIndex ? 'bg-[#eef2ff] dark:bg-[#202844]' : ''} data-interactive key={row[0]} onClick={() => setSelectedIndex(rowIndex)}>{row.map((cell, cellIndex) => <TableCell key={cell}>{cellIndex === 0 ? <Button variant="ghost" className="justify-start px-0 text-[#2456e8]" type="button" onClick={() => setSelectedIndex(rowIndex)}>{cell}</Button> : cell}</TableCell>)}</TableRow>)}</TableBody></Table></div>
        {selectedRow && <div className="mt-5 grid gap-3 rounded-3xl bg-[#f4efe5] p-4 md:grid-cols-4 dark:bg-[#292923]" aria-live="polite"><div><small className="text-[#6d685e] dark:text-[#aaa397]">Selected source</small><strong className="block">{selectedRow[0]}</strong></div><div><small className="text-[#6d685e] dark:text-[#aaa397]">Units</small><strong className="block">{selectedRow[1]}</strong></div><div><small className="text-[#6d685e] dark:text-[#aaa397]">Detected risk</small><strong className="block">{selectedRow[3]}</strong></div><div><small className="text-[#6d685e] dark:text-[#aaa397]">Next action</small><strong className="block">{selectedRow[4]}</strong></div></div>}
        <div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong>Identity cluster</strong><span className="block text-sm text-[#6d685e] dark:text-[#aaa397]">customer_id, event_id, account identifiers</span></div><div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong>Money cluster</strong><span className="block text-sm text-[#6d685e] dark:text-[#aaa397]">revenue, amount, currency, contract value</span></div><div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong>Time cluster</strong><span className="block text-sm text-[#6d685e] dark:text-[#aaa397]">renewal_date, timestamp, retention window</span></div></div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" type="button" onClick={onBack}>Back to pipeline</Button><Button className="bg-[#2456e8] text-white hover:bg-[#1d48c7]" type="button" onClick={onContinue}>Continue to meaning</Button></div>
      </Card>
    </div>
  </div>
}
