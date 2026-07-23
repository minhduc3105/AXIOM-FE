export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'flex w-32 items-center gap-2.5 text-sm font-bold tracking-normal text-[#1018a2] dark:text-[#7895ff]' : 'flex items-center gap-2.5 text-[22px] font-bold tracking-normal text-[#1018a2] dark:text-[#7895ff]'}>
      <span className={compact ? 'block size-6 shrink-0 rounded-lg bg-[#5661f6]' : 'block size-8 shrink-0 rounded-[10px] bg-[#5661f6]'} aria-hidden="true" />
      <span>AXIOM</span>
    </div>
  )
}
