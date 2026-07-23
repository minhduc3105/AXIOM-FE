export function UserMessage({ question }: { question: string }) {
  return (
    <div className="user-message-row">
      <div className="user-message">
        <span className="message-label">You</span>
        <p>{question}</p>
      </div>
      <span className="user-message-avatar" aria-hidden="true">Y</span>
    </div>
  )
}
