import type { ChangeEvent } from 'react'

type ChooseSourceProps = {
  onUpload: (files: FileList) => void
  onConnect: () => void
}

const cards = [
  { badge: 'UP', title: 'Upload files', copy: 'Bring CSV, JSON, PDF, Markdown, or Parquet files into the workspace.', items: ['Drag and drop multiple files', 'Preview schema and governed fields before indexing', 'Best for one-time or batch ingestion'], button: 'Choose files', type: 'upload' as const },
  { badge: 'DB', title: 'Connect a data source', copy: 'Connect a live database or warehouse and keep the source available for refreshes.', items: ['Browse 20+ database and warehouse connectors', 'Test credentials before saving the connection', 'Best for live, scheduled, or shared data'], button: 'Browse data sources', type: 'connect' as const },
]

export function ChooseSource({ onUpload, onConnect }: ChooseSourceProps) {
  const uploadInputId = 'axiom-upload-input'
  const selectCard = (type: 'upload' | 'connect') => type === 'connect' ? onConnect() : document.getElementById(uploadInputId)?.click()

  return <>
    <input id={uploadInputId} className="visually-hidden" type="file" multiple accept=".csv,.json,.pdf,.md,.markdown,.parquet" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && onUpload(event.target.files)} />
    <div className="source-cards">{cards.map((card) => <article className={`source-card ${card.type === 'connect' ? 'source-card-connect' : ''}`} key={card.title}>
      <span className="connector-badge">{card.badge}</span><h2>{card.title}</h2><p>{card.copy}</p>
      <ul>{card.items.map((item) => <li key={item}>{item}</li>)}</ul>
      <button className="primary-button" onClick={() => selectCard(card.type)} type="button">{card.button}</button>
    </article>)}</div>
    <div className="ingestion-note"><span className="note-dot" /><div><strong>You can switch source types later</strong><small>AXIOM keeps upload and connection flows separate so permissions, refresh behavior, and lineage stay clear.</small></div><span className="next-label">Next: choose an option above</span></div>
  </>
}
