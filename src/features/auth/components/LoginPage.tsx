import { useState, type FormEvent } from 'react'
import { LockKeyholeIcon, LogInIcon, ShieldCheckIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/model/AuthProvider'

const defaultEmail = 'admin@axiom.local'
const defaultPassword = 'password'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState(defaultPassword)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'AXIOM Auth is unavailable.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-[#f4efe5] text-[#191915] dark:bg-[#11110f] dark:text-[#eee8dc]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_78%_8%,rgba(36,86,232,0.18),transparent_32%),radial-gradient(circle_at_12%_74%,rgba(120,75,18,0.14),transparent_34%),linear-gradient(135deg,#f4efe5,#fffaf0)] dark:bg-[radial-gradient(circle_at_76%_10%,rgba(120,149,255,0.16),transparent_34%),linear-gradient(135deg,#11110f,#1a1a17)]" aria-hidden="true" />
      <section className="mx-auto grid min-h-screen w-full max-w-6xl place-items-center px-5 py-10">
        <div className="grid w-full max-w-[1000px] grid-cols-[minmax(0,1fr)_minmax(380px,440px)] overflow-hidden rounded-lg border border-[#d8d0c2] bg-[#fffdf8]/88 shadow-[0_24px_80px_rgba(60,48,25,0.12)] backdrop-blur-2xl dark:border-[#38372f] dark:bg-[#171714]/90 max-md:max-w-[500px] max-md:grid-cols-1">
          <div className="min-h-[470px] border-r border-[#d8d0c2] p-8 dark:border-[#38372f] max-md:hidden">
            <div className="flex items-center gap-3"><img src="/assets/logo.png" alt="" className="size-12 object-contain" /><div><div className="text-[15px] font-bold tracking-[0.08em]">AXIOM</div><div className="text-xs uppercase tracking-[0.18em] text-[#8a8377] dark:text-[#eee8dc]/55">Intelligence Console</div></div></div>
            <div className="mt-16 max-w-[420px]"><div className="mb-4 inline-flex h-8 items-center gap-2 rounded-full border border-[#d8d0c2] bg-[#f4efe5] px-3 text-xs font-semibold text-[#2456e8] dark:border-[#38372f] dark:bg-white/6 dark:text-[#9aafff]"><ShieldCheckIcon className="size-4" /> Organization-scoped access</div><h1 className="text-3xl font-semibold text-[#191915] dark:text-[#f7f0e4]">Sign in to your intelligence workspace.</h1><p className="mt-4 text-sm leading-6 text-[#625d53] dark:text-[#eee8dc]/70">Organizations are created and managed from your signed-in account. Your active organization controls the data and workspace scope.</p></div>
          </div>
          <form className="grid gap-5 p-7 sm:p-8" onSubmit={handleSubmit}>
            <div><div className="mb-4 grid size-11 place-items-center rounded-xl bg-[#2456e8] text-white shadow-[0_14px_30px_rgba(36,86,232,0.22)] dark:bg-[#7895ff] dark:text-[#0e142c]"><LockKeyholeIcon className="size-5" /></div><h2 className="text-xl font-semibold">Sign in to AXIOM</h2><p className="mt-1 text-sm text-[#6d685e] dark:text-[#eee8dc]/65">Use your account to access its organizations.</p></div>
            {error && <Alert className="border-[#e4b5b5] bg-[#fff6f6] text-[#9d2f2f] dark:border-[#7a3838] dark:bg-[#2a1515]" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid gap-2"><Label htmlFor="axiom-login-email">Email</Label><Input id="axiom-login-email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-10 border-[#d8d0c2] bg-white dark:border-[#38372f] dark:bg-[#11110f]" /></div>
            <div className="grid gap-2"><Label htmlFor="axiom-login-password">Password</Label><Input id="axiom-login-password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required type="password" className="h-10 border-[#d8d0c2] bg-white dark:border-[#38372f] dark:bg-[#11110f]" /></div>
            <Button className="h-10 rounded-lg bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]" disabled={submitting} type="submit"><LogInIcon data-icon="inline-start" />{submitting ? 'Signing in...' : 'Sign in'}</Button>
            <div className="rounded-lg border border-[#d8d0c2] bg-[#f8f4eb] p-3 text-xs leading-5 text-[#6d685e] dark:border-[#38372f] dark:bg-white/6 dark:text-[#eee8dc]/62">Default local account: <strong>{defaultEmail}</strong></div>
          </form>
        </div>
      </section>
    </main>
  )
}
