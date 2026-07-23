import type { WorkflowStage } from '../features/chat/model/types'

const steps: Array<{ id: WorkflowStage; label: string; detail: string }> = [
  { id: 'intent', label: 'Intent & Spec', detail: 'Review' },
  { id: 'process', label: 'Process', detail: 'Run workflow' },
  { id: 'result', label: 'Final Answer', detail: 'Evidence-backed' },
]

export function PipelineRail({ current }: { current: WorkflowStage }) {
  const currentIndex = steps.findIndex((step) => step.id === current)

  return (
    <ol className="pipeline-rail" aria-label="Investigation progress">
      {steps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'waiting'
        return (
          <li className={`pipeline-step ${state}`} key={step.id} aria-current={state === 'active' ? 'step' : undefined}>
            <span className="pipeline-number">{state === 'done' ? '✓' : index + 1}</span>
            <span className="pipeline-copy"><strong>{step.label}</strong><small>{state === 'done' ? 'Complete' : state === 'active' ? step.detail : 'Next'}</small></span>
          </li>
        )
      })}
    </ol>
  )
}
