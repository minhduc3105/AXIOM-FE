import type { ReactNode } from 'react'

type AuthShellProps = {
  children: ReactNode
  title?: string
  titleId?: string
}

function AxiomBrand() {
  return (
    <div className="flex items-center gap-3" aria-label="AXIOM">
      <span className="grid size-11 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
        <img
          src="/assets/logo.png"
          alt=""
          className="size-8 rounded-md object-contain"
        />
      </span>
      <span className="text-base font-semibold tracking-[0.16em]">AXIOM</span>
    </div>
  )
}

export function AuthShell({ children, title, titleId }: AuthShellProps) {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-muted text-foreground md:grid md:place-items-center md:p-6 xl:p-10">
      <section className="relative mx-auto grid min-h-[100dvh] w-full max-w-6xl overflow-hidden bg-card md:min-h-[min(600px,calc(100dvh-48px))] md:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] md:rounded-[28px] md:border md:border-border md:shadow-[0_20px_50px_rgba(15,23,42,0.06)] xl:min-h-[min(620px,calc(100dvh-80px))]">
        <div className="relative flex min-w-0 flex-col px-5 py-7 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-14 lg:py-12">
          <AxiomBrand />

          {title ? (
            <div className="mt-16 md:mt-24 lg:mt-28">
              <h1
                id={titleId}
                className="text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl"
              >
                {title}
              </h1>
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary via-primary/55 to-transparent md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-px md:bg-gradient-to-b md:from-transparent md:via-primary/50 md:to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-8 md:px-10 md:py-12 lg:px-14 xl:px-16">
          <div className="w-full max-w-[460px] self-center">
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}
