import { ChangeEvent, type CSSProperties, useMemo, useState } from 'react'
import { runIngestionPipeline, saveConnection, testMySqlConnection } from '../api/smokeApi'
import type { IngestionStage, IngestionStatus } from '../types'
import { AppHeader } from './AppHeader'
import { IngestionProgress } from './IngestionProgress'

type Connector = { name: string; type: string; mark: string; category: string; color: string }

const connectors: Connector[] = [
  { name: 'MySQL', type: 'SQL connector', mark: 'MY', category: 'SQL databases', color: '#5661f6' },
  { name: 'PostgreSQL', type: 'SQL connector', mark: 'PG', category: 'SQL databases', color: '#51a1ff' },
  { name: 'ClickHouse', type: 'Warehouse connector', mark: 'CH', category: 'Warehouses', color: '#8b81ff' },
  { name: 'Spark', type: 'Warehouse connector', mark: 'SP', category: 'Warehouses', color: '#1018a2' },
  { name: 'DuckDB', type: 'Analytics connector', mark: 'DU', category: 'Warehouses', color: '#51a1ff' },
  { name: 'MongoDB', type: 'NoSQL connector', mark: 'MG', category: 'NoSQL & cache', color: '#5661f6' },
  { name: 'Redis', type: 'NoSQL connector', mark: 'RD', category: 'NoSQL & cache', color: '#1018a2' },
  { name: 'MSSQL', type: 'SQL connector', mark: 'MS', category: 'SQL databases', color: '#8b81ff' },
  { name: 'Oracle', type: 'SQL connector', mark: 'OR', category: 'SQL databases', color: '#51a1ff' },
]

const categories = ['All connectors', 'SQL databases', 'Warehouses', 'NoSQL & cache', 'JDBC / ODBC']

export function IngestionWorkspace({ stage, onBack, onStageChange }: { stage: IngestionStage; onBack: () => void; onStageChange: (stage: IngestionStage) => void }) {
  const [selected, setSelected] = useState('MySQL')
  const [host, setHost] = useState('mysql.company.internal')
  const [tested, setTested] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus>('ready')

  const activeProgress = stage === 'choose' ? 0 : stage === 'upload' ? ingestionStatus === 'complete' ? 5 : 2 : 1
  const title = stage === 'choose'
    ? 'Choose how to bring data into AXIOM'
    : stage === 'catalog'
      ? 'Choose a data source to connect'
      : stage === 'mysql'
        ? 'Connect your MySQL data source'
        : 'Upload files to your connected source'

  const handleFiles = (nextFiles: FileList | File[]) => {
    const next = Array.from(nextFiles)
    if (next.length === 0) return
    setFiles((current) => [...current, ...next])
    setIngestionStatus('ready')
    onStageChange('upload')
  }

  const test = async () => {
    setTesting(true)
    try {
      const result = await testMySqlConnection(host)
      setTested(result.ok)
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    await saveConnection()
    setSaved(true)
    onStageChange('upload')
  }

  return <div className="ingestion-app"><AppHeader onBack={onBack} /><div className="ingestion-body"><div className="page-intro"><div><span className="eyebrow blue">DATA INGESTION</span><h1>{title}</h1></div><div className="repo-state"><small>Repo · axiom-ingest/workspace-q3</small><strong>{saved ? 'Connection saved' : stage === 'mysql' && tested ? 'Connection verified' : stage === 'choose' ? 'New ingestion source' : stage === 'upload' ? 'MySQL connection saved' : 'No source connected'}</strong><span className="status-pill">{saved ? 'Ready' : 'Draft'}</span></div></div><IngestionProgress active={activeProgress} />
    {stage === 'choose' && <ChooseSource onUpload={handleFiles} onConnect={() => onStageChange('catalog')} />}
    {stage === 'catalog' && <Catalog selected={selected} onSelect={(name) => { setSelected(name); if (name === 'MySQL') onStageChange('mysql') }} connectors={connectors} />}
    {stage === 'mysql' && <MySqlForm host={host} setHost={(value) => { setHost(value); setTested(false); setSaved(false) }} tested={tested} testing={testing} onTest={test} saved={saved} onSave={save} onBack={() => onStageChange('catalog')} />}
    {stage === 'upload' && <UploadWorkspace files={files} status={ingestionStatus} onFiles={handleFiles} onStart={async () => { setIngestionStatus('running'); await runIngestionPipeline(); setIngestionStatus('complete') }} onBack={() => onStageChange(saved ? 'mysql' : 'choose')} />}
  </div></div>
}

function ChooseSource({ onUpload, onConnect }: { onUpload: (files: FileList) => void; onConnect: () => void }) {
  const uploadInputId = 'axiom-upload-input'
  const cards = [
    { badge: 'UP', title: 'Upload files', copy: 'Bring CSV, JSON, PDF, Markdown, or Parquet files into the workspace.', items: ['Drag and drop multiple files', 'Preview schema and governed fields before indexing', 'Best for one-time or batch ingestion'], button: 'Choose files', type: 'upload' as const },
    { badge: 'DB', title: 'Connect a data source', copy: 'Connect a live database or warehouse and keep the source available for refreshes.', items: ['Browse 20+ database and warehouse connectors', 'Test credentials before saving the connection', 'Best for live, scheduled, or shared data'], button: 'Browse data sources', type: 'connect' as const },
  ]
  const selectCard = (type: 'upload' | 'connect') => type === 'connect' ? onConnect() : document.getElementById(uploadInputId)?.click()

  return <><input id={uploadInputId} className="visually-hidden" type="file" multiple accept=".csv,.json,.pdf,.md,.markdown,.parquet" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && onUpload(event.target.files)} /><div className="source-cards">{cards.map((card) => <article className={`source-card ${card.type === 'connect' ? 'source-card-connect' : ''}`} key={card.title}><span className="connector-badge">{card.badge}</span><h2>{card.title}</h2><p>{card.copy}</p><ul>{card.items.map((item) => <li key={item}>{item}</li>)}</ul><button className="primary-button" onClick={() => selectCard(card.type)}>{card.button}</button></article>)}</div><div className="ingestion-note"><span className="note-dot" /><div><strong>You can switch source types later</strong><small>AXIOM keeps upload and connection flows separate so permissions, refresh behavior, and lineage stay clear.</small></div><span className="next-label">Next: choose an option above</span></div></>
}

function Catalog({ selected, onSelect, connectors }: { selected: string; onSelect: (name: string) => void; connectors: Connector[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All connectors')
  const filtered = useMemo(() => connectors.filter((connector) => (category === 'All connectors' || connector.category === category || (category === 'JDBC / ODBC' && connector.type.includes('connector'))) && connector.name.toLowerCase().includes(query.toLowerCase())), [category, query, connectors])

  return <div className="catalog-layout"><aside className="filter-panel"><h2>Browse connectors</h2><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /><span className="eyebrow blue">CATEGORY</span>{categories.map((item) => <button className={`filter-option ${category === item ? 'selected' : ''}`} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}<small>20 connectors available</small></aside><section className="catalog-panel"><div className="catalog-heading"><div><h2>All connectors</h2><p>Select a connector to continue with its connection details.</p></div><span className="count-pill">20 connectors available</span></div><div className="connector-grid">{filtered.map((connector) => <button className={`connector-card ${connector.name === selected ? 'selected' : ''}`} style={{ '--connector-color': connector.color } as CSSProperties} key={connector.name} onClick={() => onSelect(connector.name)} type="button"><span className="connector-badge">{connector.mark}</span><div><strong>{connector.name}</strong><small>{connector.type}</small></div><small>{connector.name === selected ? 'Selected · Continue' : 'Click to configure'}</small></button>)}</div>{filtered.length === 0 && <p className="empty-state">No connectors match this search.</p>}</section><div className="catalog-helper"><strong>Need a custom source?</strong><span>Use JDBC / ODBC to connect a compatible database.</span><button type="button">Continue →</button></div></div>
}

function MySqlForm({ host, setHost, tested, testing, onTest, saved, onSave, onBack }: { host: string; setHost: (value: string) => void; tested: boolean; testing: boolean; onTest: () => void; saved: boolean; onSave: () => void; onBack: () => void }) {
  return <div className="mysql-layout"><section className="form-panel"><div className="panel-heading"><h2>MySQL connection</h2><span className="count-pill">SQL database</span></div><p>Enter the credentials AXIOM needs to read your source.</p><div className="form-grid"><label className="wide">Host<input value={host} onChange={(event) => setHost(event.target.value)} required /></label><label>Port<input defaultValue="3306" inputMode="numeric" /></label><label>Database<input defaultValue="analytics" /></label><label>Schema<input defaultValue="public" /></label><label>Username<input defaultValue="axiom_readonly" /></label><label>Password<input type="password" defaultValue="readonly" /></label><label className="wide">SSL mode<select defaultValue="Require"><option>Require</option><option>Prefer</option><option>Disable</option></select></label></div><label className="toggle-row"><input type="checkbox" defaultChecked /><span className="toggle" /> <span>Use encrypted connection<small>Recommended for production sources</small></span></label><div className="form-actions"><button className="secondary-button" onClick={onBack} type="button">Back</button><button className="primary-button" onClick={onTest} disabled={testing || !host.trim()} type="button">{testing ? 'Testing…' : tested ? 'Connection tested' : 'Test connection'}</button></div></section><section className="preview-panel"><div className="panel-heading"><h2>Connection preview</h2><span className="count-pill">{tested ? 'Verified' : 'Ready to test'}</span></div><div className="selected-source"><span className="connector-badge">MY</span><div><h3>MySQL</h3><p>Relational database · live connection</p><small>{tested ? 'Connection verified' : 'Selected from connector catalog'}</small></div></div><h3>What we need</h3><ul className="requirements">{['Host and port', 'Database and schema', 'Read-only credentials', 'Encrypted connection'].map((item) => <li className={tested ? 'complete' : ''} key={item}><i />{item}</li>)}</ul><div className="connection-note">Fields adapt to each connector; MySQL uses host, port, database, schema, username, password and SSL mode.</div><button className="primary-button full-width" onClick={onSave} disabled={!tested || saved} type="button">{saved ? 'Saved — continue to upload' : 'Save connection and continue to upload'}</button></section></div>
}

function UploadWorkspace({ files, status, onFiles, onStart, onBack }: { files: File[]; status: IngestionStatus; onFiles: (files: FileList) => void; onStart: () => Promise<void>; onBack: () => void }) {
  const inputId = 'axiom-upload-more'
  const complete = status === 'complete'
  return <div className="upload-layout"><section className="upload-panel"><div className="panel-heading"><div><span className="eyebrow blue">STEP 3 · PIPELINE</span><h2>{complete ? 'Ingestion complete' : 'Upload files'}</h2></div><span className="count-pill">{complete ? 'Indexed' : files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Waiting for files'}</span></div><p>{complete ? 'AXIOM has profiled and indexed the selected files. The source is ready to use in chatbot investigations.' : 'Review the files before AXIOM profiles and indexes them. Files remain scoped to this ingestion workspace.'}</p><label className="drop-zone" htmlFor={inputId}><span className="drop-zone-icon">{complete ? '✓' : '↑'}</span><strong>{complete ? 'Add more files or start another batch' : files.length ? 'Add more files' : 'Drop files here'}</strong><small>CSV, JSON, PDF, Markdown, or Parquet</small><input id={inputId} className="visually-hidden" type="file" multiple accept=".csv,.json,.pdf,.md,.markdown,.parquet" onChange={(event) => event.target.files && onFiles(event.target.files)} /></label><div className="upload-actions"><button className="secondary-button" onClick={onBack} type="button">Back</button><button className="primary-button" disabled={!files.length || status === 'running' || complete} onClick={() => void onStart()} type="button">{status === 'running' ? 'Indexing…' : complete ? 'Indexed' : 'Start ingestion'}</button></div></section><section className="upload-summary"><h2>Ingestion checklist</h2><ul className="requirements"><li className={files.length ? 'complete' : ''}><i />Files selected</li><li className={complete ? 'complete' : ''}><i />Schema preview</li><li className={complete ? 'complete' : ''}><i />Governed fields</li><li className={complete ? 'complete' : ''}><i />Profile and index</li></ul><div className="connection-note">AXIOM will validate file type, size, schema, and governed fields before indexing.</div></section></div>
}
