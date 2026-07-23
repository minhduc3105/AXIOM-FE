import type { ProgressStage } from '../model/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/utils'

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

  return <nav className="my-5 grid grid-cols-2 gap-2 rounded-3xl border border-[#d8d0c2] bg-[#fffdf8]/80 p-2 shadow-[0_16px_44px_rgba(24,24,18,0.06)] md:grid-cols-3 xl:grid-cols-6 dark:border-[#38372f] dark:bg-[#1a1a17]/80" aria-label="Ingestion progress">
    {steps.map((step, index) => {
      const state = index === activeIndex ? 'active' : index <= furthest ? 'complete' : index === activeIndex + 1 ? 'next' : 'queued'
      return <Button
        type="button"
        key={step.id}
        className={cn('h-16 min-w-0 flex-col items-start rounded-2xl border border-[#d8d0c2] bg-[#f4efe5] px-4 py-3 text-left text-[#25241f] hover:bg-[#e9e2d5] disabled:cursor-not-allowed disabled:opacity-55 dark:border-[#38372f] dark:bg-[#292923] dark:text-[#eee8dc] dark:hover:bg-[#303029]', state === 'active' && 'border-[#2456e8] bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:border-[#7895ff] dark:bg-[#7895ff] dark:text-[#0e142c]', state === 'complete' && 'border-[#2456e8]/30 bg-[#eef2ff] text-[#1018a2] dark:border-[#7895ff]/30 dark:bg-[#202844] dark:text-[#dfe6ff]')}
        disabled={index > furthest}
        onClick={() => onNavigate(step.id)}
        aria-current={state === 'active' ? 'step' : undefined}
      >
        <strong className="truncate text-sm">{step.label}</strong>
        <span className="text-xs opacity-75">{state === 'active' ? 'Active' : state === 'complete' ? 'Complete' : state === 'next' ? 'Next' : 'Queued'}</span>
      </Button>
    })}
  </nav>
}
