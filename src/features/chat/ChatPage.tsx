import { useEffect, useRef, useState } from 'react'
import type { ChatStage, ChatTurn, DetailStage, Investigation } from './model/types'
import { ChatComposer } from '../../components/ChatComposer'
import { DecisionPanel } from '../../components/DecisionPanel'
import { DetailInspector } from '../../components/DetailInspector'
import { ReviewCard } from '../../components/ReviewCard'
import { UserMessage } from '../../components/UserMessage'

type ChatPageProps = {
  stage: ChatStage
  detailStage: DetailStage | null
  investigation: Investigation | null
  history: ChatTurn[]
  loading: boolean
  error: string | null
  onSubmit: (value: string) => void
  onApprove: () => void
  onInspect: (stage: DetailStage) => void
  onCloseInspector: () => void
}

export function ChatPage({ stage, detailStage, investigation, history, loading, error, onSubmit, onApprove, onInspect, onCloseInspector }: ChatPageProps) {
  const [isResultDecisionDismissed, setIsResultDecisionDismissed] = useState(false)
  const chatMainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (stage !== 'result') setIsResultDecisionDismissed(false)
  }, [stage])

  useEffect(() => {
    if (stage === 'welcome') return
    const frame = window.requestAnimationFrame(() => {
      chatMainRef.current?.scrollTo({ top: chatMainRef.current.scrollHeight, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [history.length, stage, loading])

  if (stage === 'welcome') return <main className="chat-main welcome-main"><div className="welcome-landing"><h1>What would you like to investigate?</h1><ChatComposer onSubmit={onSubmit} /></div></main>
  if (!investigation) return null

  const decisionMode = stage === 'intent' ? 'spec' : stage === 'planner' ? 'plan' : stage === 'result' && !isResultDecisionDismissed ? 'result' : null
  const openResultDetail = () => {
    setIsResultDecisionDismissed(true)
    onInspect('result')
  }
  const exportResult = () => {
    setIsResultDecisionDismissed(true)
  }

  return <main ref={chatMainRef} className={`chat-main ${detailStage ? 'detail-open' : ''}`}>
    <div className="chat-flow">
      {history.map((turn, index) => <ChatTurnView key={`${turn.investigation.question}-${index}`} turn={turn} onInspect={onInspect} />)}
      <section className="chat-turn active-turn">
        <UserMessage question={investigation.question} />
        {stage === 'pending' && <article className="pending-card"><strong>AXIOM is preparing the pipeline...</strong><p>Question received. Intent Router is reading the request and will create the first reviewable response block next.</p><div className="pipeline-rail"><div className="pipeline-step active"><span>1. Intent &amp; Spec</span><small>Active</small></div><div className="pipeline-step"><span>2. Plan &amp; Code</span><small>Waiting</small></div><div className="pipeline-step"><span>3. Execute</span><small>Waiting</small></div><div className="pipeline-step"><span>4. Result</span><small>Waiting</small></div></div></article>}
        {stage !== 'pending' && <ReviewCard investigation={investigation} stage={stage} onReview={() => onInspect(stage)} onSelectStage={onInspect} />}
        {decisionMode ? <DecisionPanel mode={decisionMode} onApprove={onApprove} onDetail={openResultDetail} onExport={exportResult} /> : <ChatComposer onSubmit={onSubmit} disabled={loading} />}
        {loading && <span className="loading-note">AXIOM is simulating the next pipeline step...</span>}
        {error && <span className="error-note" role="alert">{error}</span>}
      </section>
    </div>
    {detailStage && <DetailInspector stage={detailStage} onClose={onCloseInspector} />}
  </main>
}

function ChatTurnView({ turn, onInspect }: { turn: ChatTurn; onInspect: (stage: DetailStage) => void }) {
  return <section className="chat-turn chat-turn-history">
    <UserMessage question={turn.investigation.question} />
    <ReviewCard investigation={turn.investigation} stage={turn.stage} onReview={() => onInspect(turn.stage)} onSelectStage={onInspect} />
  </section>
}
