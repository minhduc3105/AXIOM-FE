import { Button } from '@/components/ui/button'
import { Brand } from './Brand'

export function AppHeader({ onBack }: { onBack?: () => void }) {
  return <header className="flex min-h-20 items-center gap-5 border-b border-border bg-background px-6 max-md:flex-wrap max-md:py-4"><Brand compact /><nav className="flex gap-2"><Button className="h-9 rounded-full border border-border bg-secondary px-4 text-secondary-foreground hover:bg-accent" onClick={onBack}>Chatbot</Button><Button className="h-9 rounded-full px-4" type="button">Data</Button></nav><div className="ml-auto flex items-center gap-2 max-md:ml-0"><Button className="h-9 rounded-xl border border-border bg-card px-4 text-foreground hover:bg-secondary" onClick={onBack}>Back to chat</Button><Button className="h-9 rounded-xl border border-border bg-card px-4 text-foreground hover:bg-secondary" type="button">Settings</Button><span className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-secondary px-3 text-sm text-secondary-foreground"><i className="block size-5 rounded-full bg-primary" /> AN</span></div></header>
}
