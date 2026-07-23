import { FormEvent, useState } from 'react'
import { SendIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/lib/utils'

export function ChatComposer({ onSubmit, placeholder = 'Ask AXIOM to review, analyze, or generate...', disabled = false, className }: { onSubmit: (message: string) => void; placeholder?: string; disabled?: boolean; className?: string }) {
  const [value, setValue] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim() && !disabled) {
      onSubmit(value.trim())
      setValue('')
    }
  }
  return (
    <form className={cn('flex min-h-16 w-full items-center gap-3 rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/95 p-2 pl-5 shadow-[0_24px_70px_rgba(24,24,18,0.13)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/95', className)} onSubmit={submit}>
      <Input className="h-12 flex-1 border-0 bg-transparent px-0 text-base text-[#191915] shadow-none placeholder:text-[#8a8275] focus-visible:ring-0 dark:text-[#eee8dc] dark:placeholder:text-[#aaa397]" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} disabled={disabled} aria-label="Ask AXIOM" />
      <Button className="size-12 shrink-0 rounded-full bg-[#2456e8] text-white shadow-[0_12px_28px_rgba(36,86,232,0.32)] hover:bg-[#1d48c7]" type="submit" aria-label="Send" disabled={disabled}><SendIcon className="size-5" /></Button>
    </form>
  )
}
