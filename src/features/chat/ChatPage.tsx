import { useEffect, useMemo, useRef } from 'react'
import { ChatComposer } from '../../components/ChatComposer'
import { EvidencePanel } from '../../components/EvidencePanel'
import { ReviewCard } from '../../components/ReviewCard'
import { UserMessage } from '../../components/UserMessage'
import type { ChatStage, ChatTurn, EditableSpecification, Investigation, MockResult, ProcessEvent } from './model/types'

type ChatPageProps = {
  stage: ChatStage
  evidenceOpen: boolean
  investigation: Investigation | null
  draft: EditableSpecification | null
  processEvents: ProcessEvent[]
  result: MockResult | null
  history: ChatTurn[]
  error: string | null
  onSubmit: (value: string) => void
  onSpecificationChange: (specification: EditableSpecification) => void
  onResetSpecification: () => void
  onApproveAndRun: () => void
  onRetryProcess: () => void
  onOpenEvidence: () => void
  onCloseEvidence: () => void
}

export function ChatPage({
  stage,
  evidenceOpen,
  investigation,
  draft,
  processEvents,
  result,
  history,
  error,
  onSubmit,
  onSpecificationChange,
  onResetSpecification,
  onApproveAndRun,
  onRetryProcess,
  onOpenEvidence,
  onCloseEvidence,
}: ChatPageProps) {
  const chatMainRef = useRef<HTMLElement>(null)
  const processSignature = useMemo(() => processEvents.map((event) => event.status).join('-'), [processEvents])

  useEffect(() => {
    if (stage === 'welcome') return
    const frame = window.requestAnimationFrame(() => {
      const chatMain = chatMainRef.current
      if (chatMain && typeof chatMain.scrollTo === 'function') {
        chatMain.scrollTo({ top: chatMain.scrollHeight, behavior: 'smooth' })
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [history.length, processSignature, stage])

  if (stage === 'welcome') {
    return (
      <main className="chat-main welcome-main">
        <div className="welcome-landing">
          <span className="welcome-kicker">Evidence-first AI workspace</span>
          <h1>What would you like to investigate?</h1>
          <p>Review intent, observe the workflow, and receive an answer backed by traceable evidence.</p>
          <ChatComposer onSubmit={onSubmit} />
        </div>
      </main>
    )
  }
  if (!investigation) return null

  return (
    <main ref={chatMainRef} className={`chat-main ${evidenceOpen ? 'evidence-open' : ''}`}>
      <div className="chat-flow">
        {history.map((turn, index) => <HistoryTurn key={`${turn.investigation.question}-${index}`} turn={turn} />)}

        <section className="chat-turn active-turn">
          <UserMessage question={investigation.question} />

          {stage === 'pending' && <ReviewCard stage="pending" investigation={investigation} />}
          {stage === 'intent' && draft && (
            <ReviewCard
              stage="intent"
              investigation={investigation}
              draft={draft}
              error={error}
              onSpecificationChange={onSpecificationChange}
              onReset={onResetSpecification}
              onRun={onApproveAndRun}
            />
          )}
          {stage === 'process' && (
            <ReviewCard
              stage="process"
              investigation={investigation}
              events={processEvents}
              error={error}
              onRetry={onRetryProcess}
            />
          )}
          {stage === 'result' && result && (
            <ReviewCard stage="result" investigation={investigation} result={result} onEvidence={onOpenEvidence} />
          )}

          {stage === 'result' && <ChatComposer onSubmit={onSubmit} placeholder="Ask a follow-up or start another investigation…" />}
          {stage === 'pending' && error && <p className="error-note" role="alert">{error}</p>}
        </section>
      </div>

      {evidenceOpen && result && <EvidencePanel result={result} onClose={onCloseEvidence} />}
    </main>
  )
}

function HistoryTurn({ turn }: { turn: ChatTurn }) {
  return (
    <section className="chat-turn chat-turn-history">
      <UserMessage question={turn.investigation.question} />
      <article className="history-result">
        <span className="response-label">AXIOM · FINAL ANSWER</span>
        <h3>{turn.result.title}</h3>
        <p>{turn.result.summary}</p>
      </article>
    </section>
  )
}
