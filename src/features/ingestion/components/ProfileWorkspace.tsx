import { useState } from 'react'
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

  return <div className="profile-workspace">
    <div className="summary-metrics">{[[String(rows.length), sourceLabel], ['1,824', 'Records / chunks'], ['48', 'Detected fields'], ['7', 'Governed fields'], ['2.1%', 'Missing values'], ['98%', 'Parse quality']].map(([value, label], index) => <div className={index === 3 || index === 4 ? 'warning-metric' : index === 5 ? 'success-metric' : ''} key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <div className="profile-layout">
      <aside className="workspace-panel file-coverage">
        <h2>{source.kind === 'mysql' ? 'Table coverage' : 'File coverage'}</h2>
        {rows.map((row, index) => <button
          className={`coverage-row ${index === selectedIndex ? 'selected' : ''}`}
          key={row[0]}
          type="button"
          onClick={() => setSelectedIndex(index)}
          aria-pressed={index === selectedIndex}
          aria-label={`View profile for ${row[0]}`}
        >
          <span>{source.kind === 'mysql' ? 'SQL' : row[0].split('.').pop()?.toUpperCase()}</span>
          <div><strong>{row[0].replace(/_/g, ' ').replace(/\.(csv|json|md|pdf)$/, '')}</strong><small>{row[1]} · {index === selectedIndex ? 'selected' : 'profiled'}</small></div>
        </button>)}
      </aside>
      <section className="workspace-panel quality-panel">
        <div className="panel-heading"><h2>Cross-source quality matrix</h2><span className="success-chip">Profile generated</span></div>
        <div className="preview-table-wrap"><table className="data-table quality-table"><thead><tr><th>Source</th><th>Units</th><th>Key fields</th><th>Risk</th><th>Next action</th></tr></thead><tbody>{rows.map((row, rowIndex) => <tr className={rowIndex === selectedIndex ? 'selected' : ''} key={row[0]} onClick={() => setSelectedIndex(rowIndex)}>{row.map((cell, cellIndex) => <td key={cell}>{cellIndex === 0 ? <button className="table-source-button" type="button" onClick={() => setSelectedIndex(rowIndex)}>{cell}</button> : cell}</td>)}</tr>)}</tbody></table></div>
        {selectedRow && <div className="selected-profile-summary" aria-live="polite"><div><small>Selected source</small><strong>{selectedRow[0]}</strong></div><div><small>Units</small><strong>{selectedRow[1]}</strong></div><div><small>Detected risk</small><strong>{selectedRow[3]}</strong></div><div><small>Next action</small><strong>{selectedRow[4]}</strong></div></div>}
        <div className="cluster-grid"><div><strong>Identity cluster</strong><span>customer_id, event_id, account identifiers</span></div><div><strong>Money cluster</strong><span>revenue, amount, currency, contract value</span></div><div><strong>Time cluster</strong><span>renewal_date, timestamp, retention window</span></div></div>
        <div className="workspace-actions"><button className="secondary-button" type="button" onClick={onBack}>Back to pipeline</button><button className="primary-button" type="button" onClick={onContinue}>Continue to meaning</button></div>
      </section>
    </div>
  </div>
}
