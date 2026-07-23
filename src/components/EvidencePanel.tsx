import type { MockResult } from '../features/chat/model/types'

export function EvidencePanel({ result, onClose }: { result: MockResult; onClose: () => void }) {
  return (
    <>
      <button className="evidence-backdrop" type="button" onClick={onClose} aria-label="Close evidence panel" />
      <aside className="evidence-panel" aria-label="Evidence">
        <header className="evidence-panel-heading">
          <div>
            <span className="eyebrow blue">VERIFIED SOURCES</span>
            <h2>Evidence</h2>
            <p>Every material claim in the final answer is linked to a source.</p>
          </div>
          <button className="evidence-close" onClick={onClose} type="button" aria-label="Close evidence">×</button>
        </header>

        <div className="evidence-coverage">
          <span>Evidence coverage</span>
          <strong>{result.evidence.length}/{result.evidence.length} cited</strong>
        </div>

        <div className="evidence-list">
          {result.evidence.map((item) => (
            <article className={`evidence-item ${item.tone}`} key={item.id}>
              <div className="evidence-item-head">
                <span className={`evidence-tag ${item.tone}`}>{item.id}</span>
                <span className="evidence-status">{item.tone === 'success' ? 'Verified' : 'Review'}</span>
              </div>
              <strong>{item.claim}</strong>
              <p>{item.source} <span>· {item.locator}</span></p>
            </article>
          ))}
        </div>

        <section className="evidence-artifacts">
          <span className="eyebrow">ARTIFACTS</span>
          <div>{result.artifacts.map((artifact) => <span key={artifact}>{artifact}</span>)}</div>
        </section>
      </aside>
    </>
  )
}
