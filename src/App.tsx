import { useCallback, useState } from 'react'
import { AppShell } from './app/AppShell'
import { ThemeProvider } from './app/ThemeProvider'
import { ChatPage } from './features/chat/ChatPage'
import { useChatWorkflow } from './features/chat/model/useChatWorkflow'
import { IngestionPage } from './features/ingestion/IngestionPage'
import './styles/globals.css'

export default function App() {
  return <ThemeProvider><AppExperience /></ThemeProvider>
}

function AppExperience() {
  const [surface, setSurface] = useState<'chat' | 'ingestion'>('chat')
  const chat = useChatWorkflow()

  const newChat = useCallback(() => {
    chat.newChat()
    setSurface('chat')
  }, [chat.newChat])

  const openIngestion = useCallback(() => {
    setSurface('ingestion')
  }, [])

  return (
    <AppShell activeStage={chat.stage} surface={surface} onNewChat={newChat} onIngestion={openIngestion}>
      {surface === 'chat'
        ? <ChatPage stage={chat.stage} evidenceOpen={chat.evidenceOpen} investigation={chat.investigation} draft={chat.draft} processEvents={chat.processEvents} result={chat.result} history={chat.history} error={chat.error} onSubmit={chat.submitQuestion} onSpecificationChange={chat.updateSpecification} onResetSpecification={chat.resetSpecification} onApproveAndRun={chat.approveAndRun} onRetryProcess={chat.retryProcess} onOpenEvidence={chat.openEvidence} onCloseEvidence={chat.closeEvidence} onIngestion={openIngestion} />
        : <IngestionPage onBack={() => setSurface('chat')} />}
    </AppShell>
  )
}
