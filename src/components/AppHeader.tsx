import { Brand } from './Brand'

export function AppHeader({ onBack }: { onBack?: () => void }) {
  return <header className="app-header"><Brand compact /><nav><button className="nav-pill" onClick={onBack}>Chatbot</button><button className="nav-pill active" type="button">Ingestion</button></nav><div className="header-actions"><button onClick={onBack}>Back to chat</button><button type="button">Settings</button><span className="account-chip"><i /> AN</span></div></header>
}
