import { useCallback, useState } from 'react'
import { createInvestigation, approveSpecification, runSandbox } from './api/smokeApi'
import { ChatWorkspace } from './components/ChatWorkspace'
import { IngestionWorkspace } from './components/IngestionWorkspace'
import { Sidebar } from './components/Sidebar'
import type { ChatStage, DetailStage, IngestionStage, Investigation } from './types'
import './styles.css'

export default function App() {
  const [surface, setSurface] = useState<'chat' | 'ingestion'>('chat')
  const [stage, setStage] = useState<ChatStage>('welcome')
  const [detailStage, setDetailStage] = useState<DetailStage | null>(null)
  const [ingestionStage, setIngestionStage] = useState<IngestionStage>('choose')
  const [investigation, setInvestigation] = useState<Investigation | null>(null)
  const [loading, setLoading] = useState(false)

  const submitQuestion = async (question: string) => {
    setInvestigation({ question, confidence: 94, intent: 'generate_revenue_report', scope: 'Q3 revenue, payments', policy: 'strict read-only sandbox' })
    setStage('pending')
    setDetailStage(null)
    setLoading(true)
    try {
      const result = await createInvestigation(question)
      setInvestigation(result)
      setStage('intent')
    } finally {
      setLoading(false)
    }
  }

  const approve = async () => {
    if (loading) return
    setLoading(true)
    setDetailStage(null)
    try {
      if (stage === 'intent') {
        await approveSpecification()
        setStage('planner')
      } else if (stage === 'planner') {
        setStage('execute')
        await runSandbox()
        setStage('result')
      } else if (stage === 'result') {
        setDetailStage('result')
      }
    } finally {
      setLoading(false)
    }
  }

  const newChat = () => { setStage('welcome'); setDetailStage(null); setInvestigation(null); setSurface('chat') }

  const openIngestion = useCallback(() => {
    setSurface('ingestion')
    setIngestionStage('choose')
  }, [])

  return <div className="app-shell">{surface === 'chat' ? <><Sidebar active={stage} onNewChat={newChat} onIngestion={openIngestion} /><ChatWorkspace stage={stage} detailStage={detailStage} investigation={investigation} loading={loading} onSubmit={submitQuestion} onApprove={approve} onSecondary={() => setStage('planner')} onInspect={setDetailStage} onCloseInspector={() => setDetailStage(null)} /></> : <IngestionWorkspace stage={ingestionStage} onBack={() => setSurface('chat')} onStageChange={setIngestionStage} />}</div>
}
