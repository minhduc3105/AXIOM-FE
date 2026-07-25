import { useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/shared/lib/utils'
import type { UploadFilesResponse } from '../api/ingestionApi'
import type { AsyncStatus, IngestionFile } from '../model/types'

type UploadWorkspaceProps = {
  files: IngestionFile[]
  selectedFileId: string | null
  uploadStatus: AsyncStatus
  uploadResult: UploadFilesResponse | null
  onFiles: (files: FileList | File[]) => void
  onSelectFile: (id: string) => void
  onUpload: () => void
  onProcessing: () => void
  onBack: () => void
}

const previewRows = [
  ['C-1001', 'Northstar Labs', 'ops@northstar.co', 'Enterprise', '$124K'],
  ['C-1002', 'Packet Foundry', 'missing', 'Mid-market', '$48K'],
  ['C-1003', 'Vector Works', 'finance@vector.io', 'Enterprise', '$171K'],
  ['C-1005', 'Lattice Bank', 'missing', 'Enterprise', '$210K'],
]

function getPreviewMetrics(extension: string) {
  if (extension === 'PDF') return [['151', 'Pages'], ['9', 'Sections'], ['3', 'OCR warnings'], ['2', 'Governed fields'], ['96.4%', 'Parse quality']]
  if (extension === 'MD') return [['4', 'Chunks'], ['7', 'Headings'], ['0', 'Parser errors'], ['2', 'Governed terms'], ['100%', 'Completeness']]
  if (extension === 'JSON') return [['421', 'Events'], ['18', 'Fields'], ['11', 'Missing values'], ['3', 'Nested objects'], ['98.2%', 'Completeness']]
  return [['1,248', 'Rows'], ['12', 'Fields'], ['27', 'Missing cells'], ['2', 'Governed fields'], ['97.8%', 'Completeness']]
}

export function UploadWorkspace({ files, selectedFileId, uploadStatus, uploadResult, onFiles, onSelectFile, onUpload, onProcessing, onBack }: UploadWorkspaceProps) {
  const [dragging, setDragging] = useState(false)
  const inputId = 'axiom-upload-more'
  const uploading = uploadStatus === 'loading'
  const uploaded = uploadStatus === 'success'
  const selected = files.find((file) => file.id === selectedFileId) ?? files[0]
  const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0)
  const totalSize = totalBytes < 1024 * 1024 ? `${(totalBytes / 1024).toFixed(1)} KB` : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
  const typeCount = new Set(files.map((file) => file.extension)).size

  const dropFiles = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    if (!uploading && event.dataTransfer.files.length) onFiles(event.dataTransfer.files)
  }

  return <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <h2 className="text-2xl font-semibold">Upload queue</h2>
      <label className={cn('mt-5 grid cursor-pointer place-items-center rounded-3xl border border-dashed border-[#d8d0c2] bg-[#f4efe5] p-8 text-center dark:border-[#38372f] dark:bg-[#292923]', dragging && 'border-[#2456e8] bg-[#eef2ff] dark:bg-[#202844]', uploading && 'cursor-not-allowed opacity-60')} htmlFor={inputId} onDragOver={(event) => { event.preventDefault(); if (!uploading) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={dropFiles}>
        <strong>Drop or browse multiple files</strong>
        <span className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">CSV, JSON, TXT/MD, PDF, and Parquet are supported.</span>
        <Input id={inputId} className="sr-only" type="file" multiple disabled={uploading} accept=".csv,.json,.pdf,.txt,.md,.markdown,.parquet" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && onFiles(event.target.files)} />
      </label>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong className="block text-2xl">{files.length}</strong><span className="text-sm text-[#6d685e] dark:text-[#aaa397]">Files</span></div>
        <div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong className="block text-2xl">{typeCount}</strong><span className="text-sm text-[#6d685e] dark:text-[#aaa397]">Types</span></div>
        <div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong className="block text-2xl">{totalSize}</strong><span className="text-sm text-[#6d685e] dark:text-[#aaa397]">Size</span></div>
        <div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong className="block text-2xl">2</strong><span className="text-sm text-[#6d685e] dark:text-[#aaa397]">PII</span></div>
      </div>
      <div className="mt-5 grid gap-3">
        {files.map((file) => {
          const isSelected = file.id === selected?.id
          return <Button
            variant="outline"
            type="button"
            className={cn(
              'grid min-h-16 grid-cols-[42px_minmax(0,1fr)_auto] gap-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-3 text-left text-[#191915] hover:text-[#191915] dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#eee8dc] dark:hover:text-[#eee8dc]',
              isSelected && 'border-[#2456e8] bg-[#eef2ff] text-[#191915] hover:text-[#191915] dark:bg-[#202844] dark:text-[#eee8dc] dark:hover:text-[#eee8dc]',
            )}
            key={file.id}
            onClick={() => onSelectFile(file.id)}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#2456e8] text-xs font-bold text-white">{file.extension}</span>
            <span className="grid min-w-0"><strong className="truncate">{file.name}</strong><small className="text-[#6d685e] dark:text-[#aaa397]">{file.sizeLabel} · {uploading ? 'uploading' : uploaded ? 'stored' : uploadStatus === 'error' ? 'upload failed' : 'ready'}</small></span>
            <em className={cn('text-xs not-italic text-[#6d685e] dark:text-[#aaa397]', uploaded && 'text-emerald-700 dark:text-emerald-300')}>{uploading ? 'Uploading' : uploaded ? 'Stored' : isSelected ? 'Selected' : 'Queued'}</em>
          </Button>
        })}
      </div>
      {uploadResult && <div className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100" role="status" aria-live="polite">
        <div className="flex items-center justify-between gap-3"><strong>Upload successful</strong><Badge className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">{uploadResult.status}</Badge></div>
        <p className="mt-1 text-sm">{uploadResult.count} object{uploadResult.count === 1 ? '' : 's'} stored in <span className="font-semibold">{uploadResult.bucket}</span>.</p>
        <div className="mt-3 rounded-xl border border-emerald-200/80 bg-white/50 p-3 dark:border-emerald-800 dark:bg-black/10"><span className="text-xs font-semibold uppercase tracking-[0.14em]">Transfer job</span><strong className="mt-1 block break-all font-mono text-xs">{uploadResult.job_id}</strong></div>
        <ul className="mt-3 grid gap-1 text-sm">{uploadResult.files.map((file) => <li className="break-all font-mono" key={file.key}>{file.key}</li>)}</ul>
        <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-200">Files are stored. AXIOM is tracking document processing in the next step.</p>
      </div>}
      <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onBack} disabled={uploading} type="button">Back</Button><Button className="bg-[#2456e8] text-white hover:bg-[#1d48c7]" onClick={uploaded ? onProcessing : onUpload} disabled={!files.length || uploading} type="button">{uploading ? 'Uploading…' : uploaded ? 'View processing' : uploadStatus === 'error' ? 'Retry upload' : 'Upload files'}</Button></div>
    </Card>
    <Card className="rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 dark:border-[#38372f] dark:bg-[#1a1a17]/90">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">{selected?.name ?? 'Select a file'}</h2><p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">Sample preview · not returned by the upload API</p></div><Badge className="rounded-full bg-[#eef2ff] text-[#1018a2] dark:bg-[#202844] dark:text-[#dfe6ff]">{selected?.extension ?? 'FILE'} selected</Badge></div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">{getPreviewMetrics(selected?.extension ?? '').map(([value, label], index) => <div key={label} className={cn('rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]', (index === 2 || index === 3) && 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', index === 4 && 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200')}><strong className="block text-xl">{value}</strong><span className="text-xs opacity-75">{label}</span></div>)}</div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#d8d0c2] dark:border-[#38372f]"><Table><TableHeader><TableRow><TableHead>customer_id</TableHead><TableHead>customer_name</TableHead><TableHead>email</TableHead><TableHead>segment</TableHead><TableHead>revenue</TableHead></TableRow></TableHeader><TableBody>{previewRows.map((row) => <TableRow key={row[0]}>{row.map((cell) => <TableCell key={cell}>{cell}</TableCell>)}</TableRow>)}</TableBody></Table></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong>Detected schema</strong><span className="mt-1 block text-sm text-[#6d685e] dark:text-[#aaa397]">Identifier: customer_id · Money: revenue · Timestamp: renewal_date · PII: email</span></div><div className="rounded-2xl bg-[#f4efe5] p-4 dark:bg-[#292923]"><strong>Upload preflight</strong><span className="mt-1 block text-sm text-[#6d685e] dark:text-[#aaa397]">No parser errors · 2 missing email fields · approval required before searchable activation.</span></div></div>
    </Card>
  </div>
}
