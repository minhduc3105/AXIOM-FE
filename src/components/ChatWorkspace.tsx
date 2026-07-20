import type { ChatStage, DetailStage, Investigation } from '../types'
import { ChatComposer } from './ChatComposer'
import { DecisionPanel } from './DecisionPanel'
import { DetailInspector } from './DetailInspector'
import { ReviewCard } from './ReviewCard'
import { UserMessage } from './UserMessage'

export function ChatWorkspace({ stage, detailStage, investigation, loading, onSubmit, onApprove, onSecondary, onInspect, onCloseInspector }: { stage: ChatStage; detailStage: DetailStage | null; investigation: Investigation | null; loading: boolean; onSubmit: (value: string) => void; onApprove: () => void; onSecondary: () => void; onInspect: (stage: DetailStage) => void; onCloseInspector: () => void }) {
  if (stage === 'welcome') return <main className="chat-main welcome-main"><div className="welcome-landing"><h1>What would you like to investigate?</h1><ChatComposer onSubmit={onSubmit} /></div></main>
  if (!investigation) return null
  return <main className={`chat-main ${detailStage ? 'detail-open' : ''}`}>
    <div className="chat-flow">
      <UserMessage question={investigation.question} />
      {stage === 'pending' && <article className="pending-card"><strong>AXIOM is preparing the pipeline...</strong><p>Question received. Intent Router is reading the request and will create the first reviewable response block next.</p><div className="pipeline-rail"><div className="pipeline-step active"><span>1. Intent &amp; Spec</span><small>Active</small></div><div className="pipeline-step"><span>2. Plan &amp; Code</span><small>Waiting</small></div><div className="pipeline-step"><span>3. Execute</span><small>Waiting</small></div><div className="pipeline-step"><span>4. Result</span><small>Waiting</small></div></div></article>}
      {stage !== 'pending' && <ReviewCard investigation={investigation} stage={stage} onReview={() => onInspect(stage)} onSelectStage={onInspect} />}
      {stage === 'intent' && <DecisionPanel mode="spec" onApprove={onApprove} />}
      {stage === 'planner' && <DecisionPanel mode="plan" onApprove={onApprove} onSecondary={onSecondary} />}
      {stage === 'result' && <DecisionPanel mode="result" onApprove={onApprove} onDetail={() => onInspect('result')} />}
      <ChatComposer onSubmit={onSubmit} disabled={loading} />
      {loading && <span className="loading-note">AXIOM is simulating the next pipeline step…</span>}
    </div>
    {detailStage && <DetailInspector stage={detailStage} onClose={onCloseInspector} />}
  </main>
}
