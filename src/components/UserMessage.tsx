export function UserMessage({ question }: { question: string }) {
  return <div className="user-message"><span className="message-label">YOU</span><p>{question}</p></div>
}
