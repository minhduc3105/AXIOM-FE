export type Connector = {
  name: string
  type: string
  mark: string
  category: string
  color: string
}

export const connectors: Connector[] = [
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

export const connectorCategories = ['All connectors', 'SQL databases', 'Warehouses', 'NoSQL & cache', 'JDBC / ODBC']
