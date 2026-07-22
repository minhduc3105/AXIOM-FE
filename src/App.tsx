import { useCallback, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './features/chat/ChatPage'
import { useChatWorkflow } from './features/chat/model/useChatWorkflow'
import { IngestionPage } from './features/ingestion/IngestionPage'
import './styles.css'

export default function App() {
  const [surface, setSurface] = useState<'chat' | 'ingestion'>('chat')
  const chat = useChatWorkflow()

  const newChat = useCallback(() => {
    chat.newChat()
    setSurface('chat')
  }, [chat.newChat])

  const openIngestion = useCallback(() => {
    setSurface('ingestion')
  }, [])

  return <div className="app-shell">{surface === 'chat' ? <><Sidebar active={chat.stage} onNewChat={newChat} onIngestion={openIngestion} /><ChatPage stage={chat.stage} detailStage={chat.detailStage} investigation={chat.investigation} history={chat.history} loading={chat.loading} error={chat.error} onSubmit={chat.submitQuestion} onApprove={chat.approve} onInspect={chat.openDetail} onCloseInspector={chat.closeDetail} /></> : <IngestionPage onBack={() => setSurface('chat')} />}</div>
}
