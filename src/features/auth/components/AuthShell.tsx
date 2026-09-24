import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  title?: string;
  titleId?: string;
  subtitle?: string;
};

function AxiomBrand() {
  return (
    <div className="flex items-center gap-3" aria-label="AXIOM">
      <span className="relative block size-9 shrink-0" aria-hidden="true">
        <span className="absolute bottom-1 left-1.5 h-7 w-2.5 rotate-[31deg] rounded-full bg-[#4266e8]" />
        <span className="absolute bottom-1 left-[19px] h-7 w-2.5 -rotate-[31deg] rounded-full bg-[#b6c5fb]" />
        <span className="absolute left-[10px] top-4 h-2 w-5 rotate-[23deg] rounded-full bg-[#5e7bf0]" />
      </span>
      <span className="text-[18px] font-semibold tracking-[0.22em]">AXIOM</span>
    </div>
  );
}

function AuthWaves() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[42%] overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -bottom-36 -left-[12%] h-[78%] w-[92%] rotate-[23deg] rounded-[45%] bg-[#e8eeff]/90" />
      <div className="absolute -bottom-48 left-[8%] h-[82%] w-[94%] rotate-[25deg] rounded-[45%] bg-[#dce6ff]/80" />
      <div className="absolute -bottom-64 left-[34%] h-[92%] w-[88%] rotate-[27deg] rounded-[45%] bg-[#f0f4ff]/95" />
    </div>
  );
}

export function AuthShell({
  children,
  title,
  titleId,
  subtitle,
}: AuthShellProps) {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#f2f6fc] text-foreground md:grid md:place-items-center md:p-6">
      <section className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-6xl overflow-hidden bg-[#f8fbff] md:min-h-[min(720px,calc(100dvh-48px))] md:rounded-[22px] md:border md:border-white/80 md:shadow-[0_22px_70px_-36px_rgba(64,91,130,0.32)]">
        <AuthWaves />

        <div className="relative z-10 grid min-h-[100dvh] w-full md:min-h-0 md:grid-cols-[minmax(0,1fr)_minmax(390px,0.92fr)]">
          <div className="hidden min-w-0 flex-col px-12 py-12 lg:px-14 md:flex">
            <AxiomBrand />

            <div className="mt-auto max-w-[460px] pb-12">
              <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#13213d] lg:text-5xl">
                Your data.
                <br />
                Smarter insights.
              </h2>
              <p className="mt-5 max-w-[340px] text-base leading-7 text-[#6f7f9b]">
                Turn your organizational data into trusted, actionable
                intelligence - with AI, in your control.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center px-5 py-8 sm:px-8 md:px-10 md:py-12">
            <div className="w-full max-w-[430px] rounded-2xl px-1 py-2 md:border md:border-white/90 md:bg-white/90 md:px-8 md:py-9 md:shadow-[0_18px_48px_-30px_rgba(46,72,111,0.34)]">
              <AxiomBrand />

              {title ? (
                <h1
                  id={titleId}
                  className="mt-10 text-3xl font-semibold tracking-[-0.04em] text-[#13213d] sm:text-4xl"
                >
                  {title}
                </h1>
              ) : null}

              {subtitle ? (
                <p className="mt-3 max-w-[320px] text-sm leading-6 text-[#71809b]">
                  {subtitle}
                </p>
              ) : null}

              <div className={title ? "mt-8" : "mt-10"}>{children}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
