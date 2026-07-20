import { FormEvent, useState } from 'react'
import { Icon } from './Icon'

export function ChatComposer({ onSubmit, placeholder = 'Ask AXIOM to review, analyze, or generate...', disabled = false }: { onSubmit: (message: string) => void; placeholder?: string; disabled?: boolean }) {
  const [value, setValue] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim() && !disabled) {
      onSubmit(value.trim())
      setValue('')
    }
  }
  return (
    <form className="chat-composer" onSubmit={submit}>
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} disabled={disabled} aria-label="Ask AXIOM" />
      <button className="send-button" type="submit" aria-label="Send" disabled={disabled}><Icon name="send" size={24} /></button>
    </form>
  )
}
