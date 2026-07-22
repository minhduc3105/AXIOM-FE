import type { AsyncStatus, IndexStatus, IngestionSource } from '../model/types'

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
  if (status === 'building') return <div className="workspace-panel stage-loading" role="status"><span className="loading-spinner" /><h2>Building searchable index</h2><p>Creating evidence chunks, source maps, governance filters, and retrieval metadata…</p></div>
  const sourceRows = source.kind === 'mysql'
    ? [['customers', 'SQL table', '1,248 rows', 'PII gate'], ['payment_events', 'SQL table', '421 rows', 'risk filters'], ['retention_rules', 'SQL table', '4 rows', 'sharing rules'], ['supplier_contracts', 'SQL table', '151 rows', 'review sample']]
    : source.files.map((file, index) => [file.name, file.extension === 'CSV' ? 'CSV table' : file.extension === 'JSON' ? 'JSON events' : file.extension === 'PDF' ? 'PDF/OCR' : 'Document', index === 0 ? '1,248 units' : 'Mock chunks', index === 0 ? 'PII gate' : 'review sample'])
  const sourceCount = sourceRows.length

  return <div className="index-layout">
    <aside className="workspace-panel activation-panel"><h2>Activation summary</h2>{[['Ready', 'Index status'], [`${sourceCount} source${sourceCount === 1 ? '' : 's'}`, 'Indexed assets'], ['1,824 chunks', 'Evidence map'], ['PII gated', 'Policy posture']].map(([value, label], index) => <div className={`activation-metric ${index === 0 ? 'success-metric' : index === 3 ? 'warning-metric' : ''}`} key={label}><strong>{value}</strong><span>{label}</span></div>)}<div className="info-card"><strong>Artifacts</strong><p>source-manifest.json · profile-report.json · semantic-map.json · search-index.json · ingestion-audit.log</p></div><button className="secondary-button" type="button" onClick={onBack}>Back to meaning</button></aside>
    <section className="workspace-panel indexed-assets"><div className="panel-heading"><h2>Search indexed asset</h2><span className="success-chip">{sourceCount}/{sourceCount} sources searchable</span></div><form className="index-search" onSubmit={(event) => { event.preventDefault(); onSearch() }}><input value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label="Search indexed evidence" /><button className="primary-button" type="submit" disabled={!query.trim() || searchStatus === 'loading'}>{searchStatus === 'loading' ? 'Searching…' : 'Search'}</button></form><div className="preview-table-wrap"><table className="data-table"><thead><tr><th>Asset</th><th>Type</th><th>Chunks</th><th>Governance</th><th>Status</th></tr></thead><tbody>{sourceRows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}<td>Ready</td></tr>)}</tbody></table></div>{completedQuery ? <div className="evidence-results" aria-live="polite"><small>Showing mock evidence for “{completedQuery}”</small>{evidence.map(([title, copy], index) => <article className={index === 0 ? 'selected' : ''} key={title}><strong>{title}</strong><span>{copy}</span></article>)}</div> : <div className="search-helper">Run the example search to validate indexed evidence and row-level source references.</div>}</section>
  </div>
}
