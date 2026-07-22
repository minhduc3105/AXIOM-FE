import type { ChangeEvent } from 'react'
import type { IngestionStatus } from '../model/types'

type UploadWorkspaceProps = {
  files: File[]
  status: IngestionStatus
  onFiles: (files: FileList) => void
  onStart: () => Promise<void>
  onBack: () => void
}

export function UploadWorkspace({ files, status, onFiles, onStart, onBack }: UploadWorkspaceProps) {
  const inputId = 'axiom-upload-more'
  const complete = status === 'complete'
  return <div className="upload-layout"><section className="upload-panel"><div className="panel-heading"><div><span className="eyebrow blue">STEP 3 · PIPELINE</span><h2>{complete ? 'Ingestion complete' : 'Upload files'}</h2></div><span className="count-pill">{complete ? 'Indexed' : files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Waiting for files'}</span></div><p>{complete ? 'AXIOM has profiled and indexed the selected files. The source is ready to use in chatbot investigations.' : 'Review the files before AXIOM profiles and indexes them. Files remain scoped to this ingestion workspace.'}</p><label className="drop-zone" htmlFor={inputId}><span className="drop-zone-icon">{complete ? '✓' : '↑'}</span><strong>{complete ? 'Add more files or start another batch' : files.length ? 'Add more files' : 'Drop files here'}</strong><small>CSV, JSON, PDF, Markdown, or Parquet</small><input id={inputId} className="visually-hidden" type="file" multiple accept=".csv,.json,.pdf,.md,.markdown,.parquet" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && onFiles(event.target.files)} /></label><div className="upload-actions"><button className="secondary-button" onClick={onBack} type="button">Back</button><button className="primary-button" disabled={!files.length || status === 'running' || complete} onClick={() => void onStart()} type="button">{status === 'running' ? 'Indexing…' : complete ? 'Indexed' : 'Start ingestion'}</button></div></section><section className="upload-summary"><h2>Ingestion checklist</h2><ul className="requirements"><li className={files.length ? 'complete' : ''}><i />Files selected</li><li className={complete ? 'complete' : ''}><i />Schema preview</li><li className={complete ? 'complete' : ''}><i />Governed fields</li><li className={complete ? 'complete' : ''}><i />Profile and index</li></ul><div className="connection-note">AXIOM will validate file type, size, schema, and governed fields before indexing.</div></section></div>
}
