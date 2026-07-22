type MySqlFormProps = {
  host: string
  setHost: (value: string) => void
  tested: boolean
  testing: boolean
  saving: boolean
  onTest: () => void
  saved: boolean
  onSave: () => void
  onBack: () => void
}

export function MySqlForm({ host, setHost, tested, testing, saving, onTest, saved, onSave, onBack }: MySqlFormProps) {
  return <div className="mysql-layout"><section className="form-panel"><div className="panel-heading"><h2>MySQL connection</h2><span className="count-pill">SQL database</span></div><p>Enter the credentials AXIOM needs to read your source.</p><div className="form-grid"><label className="wide">Host<input value={host} onChange={(event) => setHost(event.target.value)} required /></label><label>Port<input defaultValue="3306" inputMode="numeric" /></label><label>Database<input defaultValue="analytics" /></label><label>Schema<input defaultValue="public" /></label><label>Username<input defaultValue="axiom_readonly" /></label><label>Password<input type="password" defaultValue="readonly" /></label><label className="wide">SSL mode<select defaultValue="Require"><option>Require</option><option>Prefer</option><option>Disable</option></select></label></div><label className="toggle-row"><input type="checkbox" defaultChecked /><span className="toggle" /> <span>Use encrypted connection<small>Recommended for production sources</small></span></label><div className="form-actions"><button className="secondary-button" onClick={onBack} type="button">Back</button><button className="primary-button" onClick={onTest} disabled={testing || !host.trim()} type="button">{testing ? 'Testing…' : tested ? 'Connection tested' : 'Test connection'}</button></div></section><section className="preview-panel"><div className="panel-heading"><h2>Connection preview</h2><span className="count-pill">{tested ? 'Verified' : 'Ready to test'}</span></div><div className="selected-source"><span className="connector-badge">MY</span><div><h3>MySQL</h3><p>Relational database · live connection</p><small>{tested ? 'Connection verified' : 'Selected from connector catalog'}</small></div></div><h3>What we need</h3><ul className="requirements">{['Host and port', 'Database and schema', 'Read-only credentials', 'Encrypted connection'].map((item) => <li className={tested ? 'complete' : ''} key={item}><i />{item}</li>)}</ul><div className="connection-note">Fields adapt to each connector; MySQL uses host, port, database, schema, username, password and SSL mode.</div><button className="primary-button full-width" onClick={onSave} disabled={!tested || saved || saving} type="button">{saving ? 'Saving…' : saved ? 'Saved — continue to upload' : 'Save connection and continue to upload'}</button></section></div>
}
