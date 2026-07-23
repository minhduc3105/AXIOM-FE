import type { WorkflowStage } from '../model/types'
import { cn } from '@/shared/lib/utils'

const steps: Array<{ id: WorkflowStage; label: string; detail: string }> = [
  { id: 'intent', label: 'Intent & Spec', detail: 'Review' },
  { id: 'process', label: 'Process', detail: 'Run workflow' },
  { id: 'result', label: 'Final Answer', detail: 'Evidence-backed' },
]

export function PipelineRail({ current }: { current: WorkflowStage }) {
  const currentIndex = steps.findIndex((step) => step.id === current)

  return (
    <ol className="grid list-none grid-cols-3 gap-3 p-0" aria-label="Investigation progress">
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'waiting'
        return (
          <li className={cn('flex min-h-16 items-center gap-3 rounded-2xl border border-[#d8d0c2] bg-[#f8fafc] p-3 text-[#475569] dark:border-[#38372f] dark:bg-[#292923] dark:text-[#aaa397]', state === 'active' && 'border-[#a5b4fc] bg-[#eef2ff] text-[#1018a2] dark:border-[#7895ff] dark:bg-[#202844] dark:text-[#dfe6ff]', state === 'done' && 'border-[#2456e8]/30 bg-[#2456e8] text-white')} key={step.id} aria-current={state === 'active' ? 'step' : undefined}>
            <span className={cn('grid size-8 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-[#2456e8] dark:bg-[#11110f]', state === 'waiting' && 'bg-[#ece6da] text-[#6d685e] dark:bg-[#303029] dark:text-[#aaa397]')}>{state === 'done' ? '✓' : index + 1}</span>
            <span className="grid min-w-0"><strong className="truncate text-sm">{step.label}</strong><small className="text-xs opacity-75">{state === 'done' ? 'Complete' : state === 'active' ? step.detail : 'Next'}</small></span>
          </li>
        )
      })}
    </ol>
  )
}
