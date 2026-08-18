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
    <main className="min-h-[100dvh] overflow-x-hidden bg-background px-4 py-4 text-foreground sm:px-6 sm:py-6 md:grid md:place-items-center md:py-8">
      <section className="mx-auto w-full max-w-[440px] overflow-hidden rounded-lg border border-border bg-card shadow-sm md:grid md:max-w-5xl md:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <aside className="hidden min-w-0 flex-col justify-center border-r border-border bg-muted/50 p-8 md:flex lg:p-10">
          <div className="mx-auto grid w-full max-w-md gap-8">
            <AxiomBrand />
            <div className="grid gap-4">
              <p className="text-lg font-semibold tracking-tight">
                Work within your organization&apos;s intelligence workspace.
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Your account and active organization determine the data, tools, and workspaces you can access.
              </p>
              <div className="flex items-center gap-2 border-t border-border pt-4 text-xs font-medium text-muted-foreground">
                <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" />
                <span>Organization-scoped access</span>
              </div>
            </div>
          </div>
        </aside>
        <div className="min-w-0 p-6 sm:p-8">
          <div className="mb-6 md:hidden">
            <AxiomBrand compact />
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}
