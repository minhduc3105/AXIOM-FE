import type { EditableSpecification, Investigation, MockResult, ProcessEvent } from '../model/types'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/shared/lib/utils'
import { PipelineRail } from './PipelineRail'

type ReviewCardProps =
  | {
    stage: 'pending'
    investigation: Investigation
  }
  | {
    stage: 'intent'
    investigation: Investigation
    draft: EditableSpecification
    error: string | null
    onSpecificationChange: (specification: EditableSpecification) => void
    onReset: () => void
    onRun: () => void
  }
  | {
    stage: 'process'
    investigation: Investigation
    events: ProcessEvent[]
    error: string | null
    onRetry: () => void
  }
  | {
    stage: 'result'
    investigation: Investigation
    result: MockResult
    onEvidence: () => void
  }

export function ReviewCard(props: ReviewCardProps) {
  if (props.stage === 'pending') return <PendingCard investigation={props.investigation} />
  if (props.stage === 'intent') return <IntentCard {...props} />
  if (props.stage === 'process') return <ProcessCard {...props} />
  return <FinalAnswerCard {...props} />
}

const reviewCardClass = 'w-full rounded-[28px] border border-[#d8d0c2] bg-[#fffdf8]/92 p-0 shadow-[0_18px_54px_rgba(24,24,18,0.10)] dark:border-[#38372f] dark:bg-[#1a1a17]/92'
const cardCopyClass = 'text-sm leading-relaxed text-[#6d685e] dark:text-[#aaa397]'

function ResponseHeading({ title, badge }: { title: string; badge: string }) {
  return (
    <header className="flex min-h-24 items-center justify-between gap-4 border-b border-[#d8d0c2] bg-gradient-to-r from-[#f4efe5] to-[#fffdf8] p-6 dark:border-[#38372f] dark:from-[#20201c] dark:to-[#1a1a17] max-sm:flex-col max-sm:items-start">
      <div className="flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#2456e8] text-xl font-black text-white dark:bg-[#7895ff] dark:text-[#0e142c]" aria-hidden="true">A</span>
        <div><span className="text-xs font-bold tracking-[0.16em] text-[#2456e8] dark:text-[#7895ff]">AXIOM</span><h2 className="text-2xl font-semibold leading-tight">{title}</h2></div>
      </div>
      <Badge className="rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-3 py-1 text-[#1018a2] dark:border-[#7895ff]/40 dark:bg-[#202844] dark:text-[#dfe6ff]">{badge}</Badge>
    </header>
  )
}

function PendingCard({ investigation }: { investigation: Investigation }) {
  return (
    <Card className={reviewCardClass} aria-live="polite">
      <CardHeader className="gap-5 p-0">
        <ResponseHeading title="Understanding your request" badge="Analyzing" />
        <p className={cn(cardCopyClass, 'px-6')}>AXIOM is identifying an editable intent and scope for “{investigation.question}”.</p>
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-4">
        <PipelineRail current="intent" />
        <div className="grid gap-3"><Skeleton className="h-3 rounded-full" /><Skeleton className="h-3 w-4/5 rounded-full" /><Skeleton className="h-3 w-3/5 rounded-full" /></div>
      </CardContent>
    </Card>
  )
}

function IntentCard({
  investigation,
  draft,
  error,
  onSpecificationChange,
  onReset,
  onRun,
}: Extract<ReviewCardProps, { stage: 'intent' }>) {
  const valid = Boolean(draft.intent.trim() && draft.scope.trim())

  return (
    <Card className={reviewCardClass}>
      <CardHeader className="gap-5 p-0">
        <ResponseHeading title="Intent & Spec" badge={`${investigation.confidence}% confidence`} />
        <p className={cn(cardCopyClass, 'px-6')}>Review what AXIOM understood. Intent and scope remain editable until you approve the workflow.</p>
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-4">
        <PipelineRail current="intent" />
        <form id="intent-specification-form" className="space-y-5 rounded-3xl border border-[#d8d0c2] bg-[#fffaf0] p-5 dark:border-[#38372f] dark:bg-[#20201c]" onSubmit={(event) => { event.preventDefault(); onRun() }}>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={!draft.intent.trim()}>
              <FieldLabel htmlFor="intent-field">Intent</FieldLabel>
            <Input
              id="intent-field"
              value={draft.intent}
              onChange={(event) => onSpecificationChange({ ...draft, intent: event.target.value })}
              aria-label="Intent"
              aria-invalid={!draft.intent.trim()}
              required
            />
              <FieldDescription>Machine-readable action for this investigation.</FieldDescription>
            </Field>
            <Field data-invalid={!draft.scope.trim()}>
              <FieldLabel htmlFor="scope-field">Scope</FieldLabel>
            <Textarea
              id="scope-field"
              value={draft.scope}
              onChange={(event) => onSpecificationChange({ ...draft, scope: event.target.value })}
              aria-label="Scope"
              aria-invalid={!draft.scope.trim()}
              rows={2}
              required
            />
              <FieldDescription>Data and business boundary AXIOM may use.</FieldDescription>
            </Field>
          </FieldGroup>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#1a1a17]"><span className="text-xs text-[#6d685e] dark:text-[#aaa397]">Policy</span><strong className="mt-1 block">{investigation.policy}</strong></div>
            <div className="rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#1a1a17]"><span className="text-xs text-[#6d685e] dark:text-[#aaa397]">Output</span><strong className="mt-1 block">{investigation.output}</strong></div>
          </div>

          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </form>
      </CardContent>
      <CardFooter className="flex justify-end gap-3 border-t border-[#d8d0c2] bg-[#f4efe5]/70 p-5 dark:border-[#38372f] dark:bg-[#20201c]/70 max-sm:flex-col-reverse">
        <Button variant="outline" type="button" onClick={onReset}>Reset changes</Button>
        <Button type="submit" form="intent-specification-form" disabled={!valid}>Approve &amp; run</Button>
      </CardFooter>
    </Card>
  )
}

function ProcessCard({
  investigation,
  events,
  error,
  onRetry,
}: Extract<ReviewCardProps, { stage: 'process' }>) {
  const completed = events.filter((event) => event.status === 'done').length
  const running = events.some((event) => event.status === 'running')
  const progress = Math.round(((completed + (running ? 0.5 : 0)) / events.length) * 100)

  return (
    <Card className={reviewCardClass} aria-live="polite">
      <CardHeader className="gap-5 p-0">
        <ResponseHeading title="Processing workflow" badge={error ? 'Paused' : `${progress}%`} />
        <p className={cn(cardCopyClass, 'px-6')}><strong className="text-[#191915] dark:text-[#eee8dc]">{investigation.intent}</strong> is running against <strong className="text-[#191915] dark:text-[#eee8dc]">{investigation.scope}</strong>. This panel stays in place while information moves through the workflow.</p>
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-4">
        <PipelineRail current="process" />
        <div className="rounded-3xl border border-[#d8d0c2] bg-[#fffaf0] p-5 dark:border-[#38372f] dark:bg-[#20201c]">
          <div className="mb-3 flex justify-between text-sm"><span className="text-[#6d685e] dark:text-[#aaa397]">Workflow progress</span><strong>{progress}%</strong></div>
          <Progress value={progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} />
        </div>
        <ol className="grid gap-3">
          {events.map((event, index) => (
            <li className={cn('grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#1a1a17] max-sm:grid-cols-[40px_minmax(0,1fr)]', event.status === 'running' && 'border-[#2456e8]/40 bg-[#eef2ff] dark:bg-[#202844]')} key={event.id}>
              <span className={cn('grid size-10 place-items-center rounded-full bg-[#ece6da] text-sm font-bold text-[#6d685e] dark:bg-[#303029] dark:text-[#aaa397]', event.status === 'done' && 'bg-[#2456e8] text-white', event.status === 'running' && 'bg-[#7895ff] text-[#0e142c]')} aria-hidden="true">{event.status === 'done' ? '✓' : index + 1}</span>
              <div><strong>{event.label}</strong><p className="text-sm leading-relaxed text-[#6d685e] dark:text-[#aaa397]">{event.detail}</p></div>
              <small className="text-xs text-[#6d685e] dark:text-[#aaa397] max-sm:col-start-2">{event.status === 'done' ? 'Done' : event.status === 'running' ? 'Running…' : 'Waiting'}</small>
            </li>
          ))}
        </ol>
        {error && <Alert><AlertDescription>{error}</AlertDescription><AlertAction><Button variant="outline" type="button" onClick={onRetry}>Retry process</Button></AlertAction></Alert>}
      </CardContent>
    </Card>
  )
}

function FinalAnswerCard({
  result,
  onEvidence,
}: Extract<ReviewCardProps, { stage: 'result' }>) {
  return (
    <Card className={reviewCardClass}>
      <CardHeader className="p-0"><ResponseHeading title="Final Answer" badge="Complete" /></CardHeader>
      <CardContent className="space-y-5 p-6">
        <PipelineRail current="result" />
        <section className="rounded-[28px] border border-[#d8d0c2] bg-[#fffaf0] p-6 dark:border-[#38372f] dark:bg-[#20201c]">
          <span className="text-xs font-semibold tracking-[0.18em] text-[#2456e8] dark:text-[#7895ff]">Reviewed answer</span>
          <h3 className="mt-3 text-[clamp(1.8rem,3vw,3.4rem)] font-semibold leading-none tracking-normal">{result.title}</h3>
          <p className="mt-4 text-base leading-relaxed text-[#6d685e] dark:text-[#aaa397]">{result.summary}</p>
        </section>
        <div className="grid gap-3 md:grid-cols-3">
          {result.metrics.map((metric) => <div className="rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#1a1a17]" key={metric.label}><span className="text-xs text-[#6d685e] dark:text-[#aaa397]">{metric.label}</span><strong className="mt-1 block text-2xl">{metric.value}</strong></div>)}
        </div>
        <section className="rounded-3xl border border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]">
          <div className="flex justify-between gap-4"><strong>Items requiring attention</strong><span className="text-sm text-[#6d685e] dark:text-[#aaa397]">{result.flags.length} flags</span></div>
          <ul className="mt-3 grid gap-2 text-sm text-[#6d685e] dark:text-[#aaa397]">{result.flags.map((flag) => <li className="rounded-xl bg-[#f4efe5] px-3 py-2 dark:bg-[#292923]" key={flag}>{flag}</li>)}</ul>
        </section>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4 border-t border-[#d8d0c2] bg-[#f4efe5]/70 p-5 dark:border-[#38372f] dark:bg-[#20201c]/70 max-sm:flex-col max-sm:items-start">
        <Button type="button" onClick={onEvidence}>View evidence ({result.evidence.length})</Button>
        <span className="text-sm text-[#6d685e] dark:text-[#aaa397]">All material claims are cited and ready for review.</span>
      </CardFooter>
    </Card>
  )
}
