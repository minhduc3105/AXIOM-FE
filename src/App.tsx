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

  return <div className="app-shell">{surface === 'chat' ? <><Sidebar active={chat.stage} onNewChat={newChat} onIngestion={openIngestion} /><ChatPage stage={chat.stage} evidenceOpen={chat.evidenceOpen} investigation={chat.investigation} draft={chat.draft} processEvents={chat.processEvents} result={chat.result} history={chat.history} error={chat.error} onSubmit={chat.submitQuestion} onSpecificationChange={chat.updateSpecification} onResetSpecification={chat.resetSpecification} onApproveAndRun={chat.approveAndRun} onRetryProcess={chat.retryProcess} onOpenEvidence={chat.openEvidence} onCloseEvidence={chat.closeEvidence} /></> : <IngestionPage onBack={() => setSurface('chat')} />}</div>
}
