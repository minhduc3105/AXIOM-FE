export type Connector = {
  name: string
  type: string
  mark: string
  category: string
  color: string
  available: boolean
  mode: 'live' | 'demo' | 'coming-soon'
}

export const connectors: Connector[] = [
  { name: 'Amazon S3', type: 'Object storage connector', mark: 'S3', category: 'Object storage', color: '#2456e8', available: true, mode: 'live' },
  { name: 'Snowflake', type: 'Warehouse connector', mark: 'SF', category: 'Warehouses', color: '#51a1ff', available: true, mode: 'live' },
  { name: 'MySQL', type: 'SQL connector', mark: 'MY', category: 'SQL databases', color: '#5661f6', available: true, mode: 'demo' },
  { name: 'PostgreSQL', type: 'SQL connector', mark: 'PG', category: 'SQL databases', color: '#51a1ff', available: false, mode: 'coming-soon' },
  { name: 'ClickHouse', type: 'Warehouse connector', mark: 'CH', category: 'Warehouses', color: '#8b81ff', available: false, mode: 'coming-soon' },
  { name: 'Spark', type: 'Warehouse connector', mark: 'SP', category: 'Warehouses', color: '#1018a2', available: false, mode: 'coming-soon' },
  { name: 'DuckDB', type: 'Analytics connector', mark: 'DU', category: 'Warehouses', color: '#51a1ff', available: false, mode: 'coming-soon' },
  { name: 'MongoDB', type: 'NoSQL connector', mark: 'MG', category: 'NoSQL & cache', color: '#5661f6', available: false, mode: 'coming-soon' },
  { name: 'Redis', type: 'NoSQL connector', mark: 'RD', category: 'NoSQL & cache', color: '#1018a2', available: false, mode: 'coming-soon' },
  { name: 'MSSQL', type: 'SQL connector', mark: 'MS', category: 'SQL databases', color: '#8b81ff', available: false, mode: 'coming-soon' },
  { name: 'Oracle', type: 'SQL connector', mark: 'OR', category: 'SQL databases', color: '#51a1ff', available: false, mode: 'coming-soon' },
]

export const connectorCategories = ['All connectors', 'Object storage', 'SQL databases', 'Warehouses', 'NoSQL & cache', 'JDBC / ODBC']
