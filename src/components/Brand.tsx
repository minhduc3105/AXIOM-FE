export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand brand-compact' : 'brand'}>
      <span className="brand-mark" aria-hidden="true" />
      <span className="brand-wordmark">AXIOM</span>
    </div>
  )
}
