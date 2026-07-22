import { useCallback, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatPage } from './features/chat/ChatPage'
import { useChatWorkflow } from './features/chat/model/useChatWorkflow'
import { IngestionPage } from './features/ingestion/IngestionPage'
import type { IngestionStage } from './features/ingestion/model/types'
import './styles.css'

export default function App() {
  const [surface, setSurface] = useState<'chat' | 'ingestion'>('chat')
  const [ingestionStage, setIngestionStage] = useState<IngestionStage>('choose')
  const chat = useChatWorkflow()

  const newChat = useCallback(() => {
    chat.newChat()
    setSurface('chat')
  }, [chat.newChat])

  const openIngestion = useCallback(() => {
    setSurface('ingestion')
    setIngestionStage('choose')
  }, [])

  return <div className="app-shell">{surface === 'chat' ? <><Sidebar active={chat.stage} onNewChat={newChat} onIngestion={openIngestion} /><ChatPage stage={chat.stage} detailStage={chat.detailStage} investigation={chat.investigation} history={chat.history} loading={chat.loading} error={chat.error} onSubmit={chat.submitQuestion} onApprove={chat.approve} onInspect={chat.openDetail} onCloseInspector={chat.closeDetail} /></> : <IngestionPage stage={ingestionStage} onBack={() => setSurface('chat')} onStageChange={setIngestionStage} />}</div>
}
