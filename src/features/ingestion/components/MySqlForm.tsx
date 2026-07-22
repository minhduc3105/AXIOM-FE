import type { AsyncStatus, MySqlConnection } from '../model/types'

type MySqlFormProps = {
  connection: MySqlConnection
  status: AsyncStatus | 'verified' | 'saving' | 'saved'
  onChange: (field: keyof MySqlConnection, value: string | boolean) => void
  onTest: () => void
  onSave: () => void
  onBack: () => void
}

export function MySqlForm({ connection, status, onChange, onTest, onSave, onBack }: MySqlFormProps) {
  const tested = status === 'verified' || status === 'saving' || status === 'saved'
  const testing = status === 'loading'
  const saving = status === 'saving'
  const requiredReady = Boolean(connection.host.trim() && connection.port.trim() && connection.database.trim() && connection.username.trim() && connection.password.trim())

  return <div className="mysql-layout">
    <section className="form-panel">
      <div className="panel-heading"><h2>MySQL connection</h2><span className="count-pill">SQL database</span></div>
      <p>Enter the credentials AXIOM needs to read your source.</p>
      <div className="form-grid">
        <label className="wide">Host<input value={connection.host} onChange={(event) => onChange('host', event.target.value)} required /></label>
        <label>Port<input value={connection.port} onChange={(event) => onChange('port', event.target.value)} inputMode="numeric" required /></label>
        <label>Database<input value={connection.database} onChange={(event) => onChange('database', event.target.value)} required /></label>
        <label>Schema<input value={connection.schema} onChange={(event) => onChange('schema', event.target.value)} /></label>
        <label>Username<input value={connection.username} onChange={(event) => onChange('username', event.target.value)} required /></label>
        <label>Password<input type="password" value={connection.password} onChange={(event) => onChange('password', event.target.value)} required /></label>
        <label className="wide">SSL mode<select value={connection.sslMode} onChange={(event) => onChange('sslMode', event.target.value)}><option>Require</option><option>Prefer</option><option>Disable</option></select></label>
      </div>
      <label className="toggle-row"><input type="checkbox" checked={connection.encrypted} onChange={(event) => onChange('encrypted', event.target.checked)} /><span className={`toggle ${connection.encrypted ? 'enabled' : ''}`} /><span>Use encrypted connection<small>Recommended for production sources</small></span></label>
      <div className="form-actions"><button className="secondary-button" onClick={onBack} type="button">Back</button><button className="primary-button" onClick={onTest} disabled={testing || saving || !requiredReady} type="button">{testing ? 'Testing…' : tested ? 'Test again' : 'Test connection'}</button></div>
    </section>
    <section className="preview-panel">
      <div className="panel-heading"><h2>Connection preview</h2><span className={`count-pill ${tested ? 'success-pill' : ''}`}>{tested ? 'Verified' : 'Ready to test'}</span></div>
      <div className="selected-source"><span className="connector-badge">MY</span><div><h3>MySQL</h3><p>Relational database · live connection</p><small>{tested ? 'Connection verified' : 'Selected from connector catalog'}</small></div></div>
      <h3>What we need</h3>
      <ul className="requirements">{['Host and port', 'Database and schema', 'Read-only credentials', 'Encrypted connection'].map((item) => <li className={tested ? 'complete' : ''} key={item}><i />{item}</li>)}</ul>
      <div className="connection-note">Fields adapt to each connector; MySQL uses host, port, database, schema, username, password and SSL mode.</div>
      <button className="primary-button full-width" onClick={onSave} disabled={status !== 'verified'} type="button">{saving ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save connection and continue to pipeline'}</button>
    </section>
  </div>
}
