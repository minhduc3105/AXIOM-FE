import { ShieldCheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type AuthShellProps = {
  children: ReactNode
}

function AxiomBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/assets/logo.png"
        alt=""
        className={compact ? 'size-9 object-contain' : 'size-11 object-contain'}
      />
      <div>
        <div className="text-sm font-semibold tracking-[0.08em]">AXIOM</div>
        <div className="text-xs text-muted-foreground">Intelligence Console</div>
      </div>
    </div>
  )
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-background px-4 py-4 text-foreground sm:px-6 md:grid md:place-items-center md:py-8">
      <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-card shadow-sm md:grid md:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <aside className="hidden min-h-[30rem] flex-col border-r border-border bg-muted/50 p-8 md:flex">
          <AxiomBrand />
          <div className="my-auto max-w-sm">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" />
              Organization-scoped access
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
              Work within your organization&apos;s intelligence workspace.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Your account and active organization determine the data, tools, and workspaces you can access.
            </p>
          </div>
        </aside>
        <div className="min-w-0 p-6 sm:p-8">
          <div className="mb-8 md:hidden">
            <AxiomBrand compact />
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
