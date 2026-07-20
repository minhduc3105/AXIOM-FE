import type { ChatStage } from '../types'
import { Icon } from './Icon'
import { Brand } from './Brand'

type SidebarProps = {
  active: ChatStage
  onNewChat: () => void
  onIngestion: () => void
}

const conversations = [
  'Create a reviewed Q3 revenue report, cite evidence, and flag missing customer data.',
  'Create html game environment for website',
  'Lorem Ipsum Project',
]

export function Sidebar({ active, onNewChat, onIngestion }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Brand />
        <button className="primary-button sidebar-new" onClick={onNewChat}>+ &nbsp; New chat</button>
      </div>

      <section className="conversation-panel">
        <span className="eyebrow">YOUR CONVERSATIONS</span>
        <div className="conversation-list">
          {conversations.map((conversation, index) => (
            <button className={`conversation-item ${index === 0 && active !== 'welcome' ? 'selected' : ''}`} key={conversation}>
              <Icon name="message" size={24} />
              <span>{conversation}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="sidebar-links">
        <button className="sidebar-link" onClick={onIngestion}><Icon name="import" size={32} /><span>Data Ingestion</span></button>
        <button className="sidebar-link"><span className="settings-icon"><Icon name="settings" size={28} /></span><span>Settings</span></button>
      </div>

      <div className="profile-row">
        <img className="avatar" src="https://www.figma.com/api/mcp/asset/456e95e3-44c6-4626-9d3e-f10a9b6c8e2e" alt="Andrew Neilson" />
        <span>Andrew Neilson</span>
        <button className="logout-button" aria-label="Log out"><Icon name="logout" size={34} /></button>
      </div>
    </aside>
  )
}
