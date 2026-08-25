export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'flex w-32 items-center gap-2.5 text-sm font-bold tracking-normal text-primary' : 'flex items-center gap-2.5 text-[22px] font-bold tracking-normal text-primary'}>
      <span className={compact ? 'block size-6 shrink-0 rounded-lg bg-primary' : 'block size-8 shrink-0 rounded-[10px] bg-primary'} aria-hidden="true" />
      <span>AXIOM</span>
    </div>
  )
}
