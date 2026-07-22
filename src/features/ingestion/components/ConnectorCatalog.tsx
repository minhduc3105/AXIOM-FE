import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { connectorCategories, connectors } from '../data/connectors'

type ConnectorCatalogProps = {
  selected: string
  onSelect: (name: string) => void
}

export function ConnectorCatalog({ selected, onSelect }: ConnectorCatalogProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All connectors')
  const filtered = useMemo(() => connectors.filter((connector) => {
    const matchesCategory = category === 'All connectors' || connector.category === category || (category === 'JDBC / ODBC' && connector.type.includes('connector'))
    return matchesCategory && connector.name.toLowerCase().includes(query.toLowerCase())
  }), [category, query])

  return <div className="catalog-layout"><aside className="filter-panel"><h2>Browse connectors</h2><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /><span className="eyebrow blue">CATEGORY</span>{connectorCategories.map((item) => <button className={`filter-option ${category === item ? 'selected' : ''}`} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}<small>20 connectors available</small></aside><section className="catalog-panel"><div className="catalog-heading"><div><h2>All connectors</h2><p>Select a connector to continue with its connection details.</p></div><span className="count-pill">20 connectors available</span></div><div className="connector-grid">{filtered.map((connector) => <button className={`connector-card ${connector.name === selected ? 'selected' : ''}`} style={{ '--connector-color': connector.color } as CSSProperties} key={connector.name} onClick={() => onSelect(connector.name)} type="button"><span className="connector-badge">{connector.mark}</span><div><strong>{connector.name}</strong><small>{connector.type}</small></div><small>{connector.name === selected ? 'Selected · Continue' : 'Click to configure'}</small></button>)}</div>{filtered.length === 0 && <p className="empty-state">No connectors match this search.</p>}</section><div className="catalog-helper"><strong>Need a custom source?</strong><span>Use JDBC / ODBC to connect a compatible database.</span><button type="button">Continue →</button></div></div>
}
