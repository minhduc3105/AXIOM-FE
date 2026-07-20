import { FormEvent, useState } from 'react'
import { Icon } from './Icon'

export function DecisionPanel({ mode, onApprove, onSecondary, onDetail }: { mode: 'spec' | 'plan' | 'result'; onApprove: () => void; onSecondary?: () => void; onDetail?: () => void }) {
  const [comment, setComment] = useState('')
  const submitComment = (event: FormEvent) => {
    event.preventDefault()
    setComment('')
  }
  const copy = mode === 'spec' ? 'Do you agree with the intent and the specifications?' : mode === 'plan' ? 'Do you approve running this plan in the sandbox?' : 'View detailed evidence or export artifact?'
  const helper = mode === 'spec' ? 'If you do not agree, please enter a comment below so AXIOM can update the response before proceeding.' : mode === 'plan' ? 'If you do not approve, please provide feedback below so that AXIOM can update the response before we proceed.' : 'If you disagree, leave a comment below for AXIOM to update the response before continuing.'
  return <section className="decision-panel"><strong>{copy}</strong><p>{helper}</p><div className="decision-row">
    <button className="primary-button" onClick={mode === 'result' ? onDetail : onApprove}>{mode === 'spec' ? 'Approve' : mode === 'plan' ? 'Continue to execute' : 'View detail'}</button>
    {mode === 'plan' && <button className="secondary-button" onClick={onSecondary}>Not yet</button>}
    {mode === 'result' && <button className="secondary-button">Export report</button>}
    <form className="inline-comment" onSubmit={submitComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={mode === 'result' ? 'Ask about evidence or missing data...' : 'Comment to update intent & spec...'} /><button type="submit" aria-label="Send comment"><Icon name="send" size={24} /></button></form>
  </div></section>
}
