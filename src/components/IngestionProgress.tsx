import type { ProgressStage } from '../features/ingestion/model/types'

const steps: Array<{ id: ProgressStage; label: string }> = [
  { id: 'source', label: '1. Source' },
  { id: 'transfer', label: '2. Upload / Connect' },
  { id: 'pipeline', label: '3. Pipeline' },
  { id: 'profile', label: '4. Profile' },
  { id: 'meaning', label: '5. Meaning' },
  { id: 'index', label: '6. Index' },
]

type IngestionProgressProps = {
  active: ProgressStage
  furthest: number
  onNavigate: (stage: ProgressStage) => void
}

export function IngestionProgress({ active, furthest, onNavigate }: IngestionProgressProps) {
  const activeIndex = steps.findIndex((step) => step.id === active)

  return <nav className="ingestion-progress" aria-label="Ingestion progress">
    {steps.map((step, index) => {
      const state = index === activeIndex ? 'active' : index <= furthest ? 'complete' : index === activeIndex + 1 ? 'next' : 'queued'
      return <button
        type="button"
        key={step.id}
        className={`ingestion-step ${state}`}
        disabled={index > furthest}
        onClick={() => onNavigate(step.id)}
        aria-current={state === 'active' ? 'step' : undefined}
      >
        <strong>{step.label}</strong>
        <span>{state === 'active' ? 'Active' : state === 'complete' ? 'Complete' : state === 'next' ? 'Next' : 'Queued'}</span>
      </button>
    })}
  </nav>
}
