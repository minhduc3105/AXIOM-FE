import { useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, QuoteIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const outcomes = [
  {
    quote: 'The final answer stayed concise, but every revenue claim remained one click from its source row.',
    name: 'Mara Chen',
    role: 'Finance operations',
    initials: 'MC',
    image: 'https://picsum.photos/seed/axiom-reviewer-one/160/160',
  },
  {
    quote: 'We corrected scope before execution, then reused the approved evidence set for the next review.',
    name: 'Jon Bell',
    role: 'Data governance',
    initials: 'JB',
    image: 'https://picsum.photos/seed/axiom-reviewer-two/160/160',
  },
  {
    quote: 'The workflow trace made the result reviewable by people who never touched the original connector.',
    name: 'Anika Rao',
    role: 'Research systems',
    initials: 'AR',
    image: 'https://picsum.photos/seed/axiom-reviewer-three/160/160',
  },
]

export function OutcomeCarousel() {
  const [active, setActive] = useState(0)
  const outcome = outcomes[active]
  const move = (direction: number) => setActive((current) => (current + direction + outcomes.length) % outcomes.length)

  return (
    <section className="grid min-h-[330px] items-center gap-8 rounded-[32px] border border-[#d8d0c2] bg-[#fffdf8]/88 p-8 shadow-[0_24px_70px_rgba(24,24,18,0.09)] md:grid-cols-[260px_minmax(0,1fr)_auto] md:p-14 dark:border-[#38372f] dark:bg-[#1a1a17]/88" aria-label="Reviewed outcomes">
      <div className="grid gap-5 text-[#6d685e] dark:text-[#aaa397]">
        <AvatarGroup>
          {outcomes.map((item, index) => (
            <Avatar className="size-[68px] border-4 border-[#fffdf8] grayscale transition data-[active=true]:-translate-y-2 data-[active=true]:grayscale-0 dark:border-[#1a1a17]" size="lg" data-active={index === active} key={item.name}>
              <AvatarImage src={item.image} alt="" />
              <AvatarFallback>{item.initials}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
        <span>{String(active + 1).padStart(2, '0')} / {String(outcomes.length).padStart(2, '0')}</span>
      </div>
      <div>
        <QuoteIcon className="size-9 text-[#2456e8] dark:text-[#7895ff]" aria-hidden="true" />
        <blockquote className="my-5 max-w-4xl text-[clamp(1.7rem,3vw,3.4rem)] leading-none tracking-normal">{outcome.quote}</blockquote>
        <div className="grid gap-1"><strong>{outcome.name}</strong><span className="text-[#6d685e] dark:text-[#aaa397]">{outcome.role}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
        <Button variant="outline" size="icon" aria-label="Previous reviewed outcome" onClick={() => move(-1)}><ArrowLeftIcon /></Button>
        <Button variant="outline" size="icon" aria-label="Next reviewed outcome" onClick={() => move(1)}><ArrowRightIcon /></Button>
      </div>
    </section>
  )
}
