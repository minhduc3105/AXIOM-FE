import type { PipelineStep, DetailStage } from '../features/chat/model/types'

const defaults = ['1. Intent & Spec', '2. Plan & Code', '3. Execute', '4. Result']

export function PipelineRail({ activeIndex, labels = defaults, onSelect }: { activeIndex: number; labels?: string[]; onSelect?: (stage: DetailStage) => void }) {
  const stageByIndex: DetailStage[] = ['intent', 'planner', 'execute', 'result']
  return (
    <div className="pipeline-rail">
      {labels.map((label, index) => {
        const state: PipelineStep['state'] = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'waiting'
        return (
          <button className={`pipeline-step ${state} ${onSelect ? 'is-clickable' : ''}`} key={label} onClick={() => onSelect?.(stageByIndex[index])} type="button">
            <span>{label}</span>
            <small>{state === 'done' ? 'Done' : state === 'active' ? 'Active' : 'Waiting'}</small>
          </button>
        )
      })}
    </div>
  )
}
