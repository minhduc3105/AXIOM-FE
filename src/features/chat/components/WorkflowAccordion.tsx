import { useState } from 'react'
import { ArrowUpRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/utils'

const modes = [
  { title: 'Intent', copy: 'Shape the request before execution and keep the approved scope visible.' },
  { title: 'Evidence', copy: 'Inspect the source, locator, and claim behind every material conclusion.' },
  { title: 'Trace', copy: 'Follow each workflow step from retrieval through validation without guessing.' },
  { title: 'Index', copy: 'Promote reviewed sources into a searchable evidence repository.' },
]

export function WorkflowAccordion() {
  const [active, setActive] = useState(0)

  return (
    <div className="flex min-h-[390px] overflow-hidden rounded-[30px] border border-[#d8d0c2] bg-[#191915] max-sm:grid max-sm:min-h-0 dark:border-[#38372f]" aria-label="Workflow modes">
      {modes.map((mode, index) => {
        const expanded = index === active
        const panelId = `workflow-mode-${mode.title.toLowerCase()}`
        return (
          <article className={cn('relative min-w-0 flex-1 overflow-hidden border-r border-white/10 text-[#f4efe5] transition-[flex,background] duration-500 ease-out last:border-r-0 max-sm:min-h-[190px]', expanded && 'flex-[2.4]')} data-expanded={expanded} key={mode.title}>
            {expanded && <><img className="absolute inset-0 h-full w-full object-cover opacity-70 grayscale-[20%] contrast-125" src="https://picsum.photos/seed/axiom-workflow-mode/860/520" alt="" aria-hidden="true" /><div className="absolute inset-0 bg-black/25" aria-hidden="true" /></>}
            <Button
              variant="ghost"
              className="relative z-10 h-full min-h-[390px] w-full items-start justify-between rounded-none p-7 text-[#f4efe5] hover:bg-white/5 hover:text-white max-sm:min-h-[190px]"
              aria-label={`Show workflow mode ${mode.title}`}
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setActive(index)}
            >
              <span className="font-bold text-[#f4efe5]/65">0{index + 1}</span>
              <strong className={cn('self-end text-[clamp(1.6rem,2.6vw,3rem)] tracking-normal [writing-mode:vertical-rl] [rotate:180deg] max-sm:[writing-mode:initial] max-sm:[rotate:0deg]', expanded && '[writing-mode:initial] [rotate:0deg]')}>{mode.title}</strong>
              <ArrowUpRightIcon />
            </Button>
            <div id={panelId} className="absolute bottom-8 left-7 right-7 z-20 max-w-md text-base leading-relaxed text-[#f4efe5]/80" hidden={!expanded}>
              <p>{mode.copy}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
