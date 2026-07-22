import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { connectorCategories, connectors } from '../data/connectors'

type ConnectorCatalogProps = {
  selected: string
  onSelect: (name: string) => void
  onBack: () => void
}

export function ConnectorCatalog({ selected, onSelect, onBack }: ConnectorCatalogProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All connectors')
  const filtered = useMemo(() => connectors.filter((connector) => {
    const matchesCategory = category === 'All connectors' || connector.category === category || (category === 'JDBC / ODBC' && connector.type.includes('connector'))
    return matchesCategory && connector.name.toLowerCase().includes(query.toLowerCase())
  }), [category, query])

  return <div className="catalog-layout">
    <aside className="filter-panel">
      <div className="panel-heading"><h2>Browse connectors</h2><button className="text-button" onClick={onBack} type="button">Back</button></div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" aria-label="Search connectors" />
      <span className="eyebrow blue">CATEGORY</span>
      {connectorCategories.map((item) => <button className={`filter-option ${category === item ? 'selected' : ''}`} key={item} onClick={() => setCategory(item)} type="button">{item}</button>)}
      <small>{connectors.length} connectors in catalog</small>
    </aside>
    <section className="catalog-panel">
      <div className="catalog-heading"><div><h2>All connectors</h2><p>MySQL is available in this mock. More connector workflows are coming soon.</p></div><span className="count-pill">1 available now</span></div>
      <div className="connector-grid">
        {filtered.map((connector) => <button
          className={`connector-card ${connector.name === selected ? 'selected' : ''} ${!connector.available ? 'unavailable' : ''}`}
          style={{ '--connector-color': connector.color } as CSSProperties}
          key={connector.name}
          onClick={() => connector.available && onSelect(connector.name)}
          aria-disabled={!connector.available}
          type="button"
        >
          <span className="connector-badge">{connector.mark}</span>
          <div><strong>{connector.name}</strong><small>{connector.type}</small></div>
          <small>{connector.available ? connector.name === selected ? 'Selected · Configure' : 'Click to configure' : 'Coming soon'}</small>
        </button>)}
      </div>
      {filtered.length === 0 && <p className="empty-state">No connectors match this search.</p>}
    </section>
    <div className="catalog-helper"><strong>Need a custom source?</strong><span>JDBC / ODBC support will be added in a future connector release.</span><span className="coming-label">MySQL available now</span></div>
  </div>
}
