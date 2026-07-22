export type Connector = {
  name: string
  type: string
  mark: string
  category: string
  color: string
  available: boolean
}

export const connectors: Connector[] = [
  { name: 'MySQL', type: 'SQL connector', mark: 'MY', category: 'SQL databases', color: '#5661f6', available: true },
  { name: 'PostgreSQL', type: 'SQL connector', mark: 'PG', category: 'SQL databases', color: '#51a1ff', available: false },
  { name: 'ClickHouse', type: 'Warehouse connector', mark: 'CH', category: 'Warehouses', color: '#8b81ff', available: false },
  { name: 'Spark', type: 'Warehouse connector', mark: 'SP', category: 'Warehouses', color: '#1018a2', available: false },
  { name: 'DuckDB', type: 'Analytics connector', mark: 'DU', category: 'Warehouses', color: '#51a1ff', available: false },
  { name: 'MongoDB', type: 'NoSQL connector', mark: 'MG', category: 'NoSQL & cache', color: '#5661f6', available: false },
  { name: 'Redis', type: 'NoSQL connector', mark: 'RD', category: 'NoSQL & cache', color: '#1018a2', available: false },
  { name: 'MSSQL', type: 'SQL connector', mark: 'MS', category: 'SQL databases', color: '#8b81ff', available: false },
  { name: 'Oracle', type: 'SQL connector', mark: 'OR', category: 'SQL databases', color: '#51a1ff', available: false },
]

export const connectorCategories = ['All connectors', 'SQL databases', 'Warehouses', 'NoSQL & cache', 'JDBC / ODBC']
