import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/lib/utils'
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
  const liveCount = connectors.filter((connector) => connector.mode === 'live').length
  const demoCount = connectors.filter((connector) => connector.mode === 'demo').length

  return <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
    <Card className="rounded-[28px] border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Browse connectors</h2><Button variant="ghost" onClick={onBack} type="button">Back</Button></div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" aria-label="Search connectors" />
      <span className="mt-5 block text-xs font-semibold tracking-[0.18em] text-primary">CATEGORY</span>
      <div className="mt-3 grid gap-2" role="group" aria-label="Connector categories">
        {connectorCategories.map((item) => <Button
          className={cn('justify-start rounded-2xl border border-transparent bg-transparent text-muted-foreground hover:bg-secondary', category === item && 'border-primary/25 bg-primary/10 text-primary')}
          key={item}
          onClick={() => setCategory(item)}
          type="button"
          aria-pressed={category === item}
        >{item}</Button>)}
      </div>
      <small className="mt-4 block text-muted-foreground">{connectors.length} connectors in catalog</small>
    </Card>
    <Card className="rounded-[28px] border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">All connectors</h2><p className="mt-2 text-sm text-muted-foreground">S3 and Snowflake create real import jobs. MySQL remains available as a UI demo.</p></div><Badge className="rounded-full border border-border bg-secondary px-3 py-1 text-muted-foreground">{liveCount} live · {demoCount} demo</Badge></div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((connector) => <Button
          variant="outline"
          className={cn(
            'grid min-h-32 grid-cols-[48px_minmax(0,1fr)] grid-rows-[auto_auto] content-center justify-start gap-x-4 gap-y-2 rounded-3xl border border-border bg-card p-4 text-left text-foreground hover:border-primary/35 hover:bg-secondary hover:text-foreground',
            connector.name === selected && 'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            !connector.available && 'opacity-60',
          )}
          key={connector.name}
          onClick={() => connector.available && onSelect(connector.name)}
          aria-disabled={!connector.available}
          type="button"
        >
          <span className="grid size-12 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{connector.mark}</span>
          <div className="grid min-w-0 gap-1"><strong className="truncate text-base">{connector.name}</strong><small className="truncate text-muted-foreground">{connector.type}</small></div>
          <small className="col-span-2 flex items-center justify-between gap-3 text-muted-foreground">
            <span>{connector.available ? connector.name === selected ? 'Selected · Configure' : 'Click to configure' : 'Coming soon'}</span>
            {connector.mode !== 'coming-soon' && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', connector.mode === 'live' ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning')}>{connector.mode}</span>}
          </small>
        </Button>)}
      </div>
      {filtered.length === 0 && <p className="mt-6 text-muted-foreground">No connectors match this search.</p>}
    </Card>
    <div className="rounded-3xl border border-border bg-secondary p-5 text-sm lg:col-span-2"><strong>Need a custom source?</strong><span className="ml-2 text-muted-foreground">JDBC / ODBC support will be added in a future connector release.</span><span className="ml-3 font-semibold text-primary">MySQL UI demo remains available</span></div>
  </div>
}
