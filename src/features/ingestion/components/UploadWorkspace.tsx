import { useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import type { IngestionFile } from '../model/types'

type UploadWorkspaceProps = {
  files: IngestionFile[]
  selectedFileId: string | null
  onFiles: (files: FileList | File[]) => void
  onSelectFile: (id: string) => void
  onStart: () => void
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

export function UploadWorkspace({ files, selectedFileId, onFiles, onSelectFile, onStart, onBack }: UploadWorkspaceProps) {
  const [dragging, setDragging] = useState(false)
  const inputId = 'axiom-upload-more'
  const selected = files.find((file) => file.id === selectedFileId) ?? files[0]
  const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0)
  const totalSize = totalBytes < 1024 * 1024 ? `${(totalBytes / 1024).toFixed(1)} KB` : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
  const typeCount = new Set(files.map((file) => file.extension)).size

  const dropFiles = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files)
  }

  return <div className="upload-preview-layout">
    <section className="upload-queue-panel">
      <h2>Upload queue</h2>
      <label className={`compact-drop-zone ${dragging ? 'dragging' : ''}`} htmlFor={inputId} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={dropFiles}>
        <strong>Drop or browse multiple files</strong>
        <span>CSV, JSON, TXT/MD, PDF, and Parquet are supported.</span>
        <input id={inputId} className="visually-hidden" type="file" multiple accept=".csv,.json,.pdf,.txt,.md,.markdown,.parquet" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && onFiles(event.target.files)} />
      </label>
      <div className="queue-metrics">
        <div><strong>{files.length}</strong><span>Files</span></div>
        <div><strong>{typeCount}</strong><span>Types</span></div>
        <div><strong>{totalSize}</strong><span>Size</span></div>
        <div><strong>2</strong><span>PII</span></div>
      </div>
      <div className="file-queue">
        {files.map((file) => <button type="button" className={`file-row ${file.id === selected?.id ? 'selected' : ''}`} key={file.id} onClick={() => onSelectFile(file.id)}>
          <span className="file-type">{file.extension}</span>
          <span><strong>{file.name}</strong><small>{file.sizeLabel} · ready</small></span>
          <em>{file.id === selected?.id ? 'Selected' : 'Queued'}</em>
        </button>)}
      </div>
      <div className="upload-actions"><button className="secondary-button" onClick={onBack} type="button">Back</button><button className="primary-button" onClick={onStart} disabled={!files.length} type="button">Start ingestion</button></div>
    </section>
    <section className="file-preview-panel">
      <div className="panel-heading"><h2>{selected?.name ?? 'Select a file'}</h2><span className="status-pill active-pill">{selected?.extension ?? 'FILE'} selected</span></div>
      <div className="preview-metrics">{getPreviewMetrics(selected?.extension ?? '').map(([value, label], index) => <div key={label} className={index === 2 || index === 3 ? 'warning-metric' : index === 4 ? 'success-metric' : ''}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <div className="preview-table-wrap"><table className="data-table"><thead><tr><th>customer_id</th><th>customer_name</th><th>email</th><th>segment</th><th>revenue</th></tr></thead><tbody>{previewRows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>
      <div className="preview-notes"><div><strong>Detected schema</strong><span>Identifier: customer_id · Money: revenue · Timestamp: renewal_date · PII: email</span></div><div><strong>Upload preflight</strong><span>No parser errors · 2 missing email fields · approval required before searchable activation.</span></div></div>
    </section>
  </div>
}
