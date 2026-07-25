import { useState } from "react";
import type {
  EditableSpecification,
  Investigation,
  MockResult,
  ProcessEvent,
} from "../model/types";
import {
  BrainCircuitIcon,
  CheckIcon,
  Clock3Icon,
  LoaderCircleIcon,
  PencilLineIcon,
  TerminalSquareIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { MarkdownContent } from "./MarkdownContent";

type ReviewCardProps =
  | {
      stage: "pending";
      investigation: Investigation;
    }
  | {
      stage: "intent";
      investigation: Investigation;
      draft: EditableSpecification;
      error: string | null;
      loading: boolean;
      onSpecificationChange: (specification: EditableSpecification) => void;
      onSpecificationRevise: (feedback: string) => void;
      onReset: () => void;
      onRun: () => void;
    }
  | {
      stage: "process";
      investigation: Investigation;
      events: ProcessEvent[];
      error: string | null;
      onRetry: () => void;
    }
  | {
      stage: "result";
      investigation: Investigation;
      events: ProcessEvent[];
      result: MockResult;
    };

export function ReviewCard(props: ReviewCardProps) {
  if (props.stage === "pending")
    return <PendingCard investigation={props.investigation} />;
  if (props.stage === "intent") return <IntentCard {...props} />;
  if (props.stage === "process") return <ProcessCard {...props} />;
  return <CompletedResponseCard {...props} />;
}

const reviewCardClass = "w-full border-0 bg-transparent p-0 shadow-none ring-0";
const visibleSkeletonClass =
  "h-3.5 rounded-full bg-[#d8d0c2]/85 shadow-[inset_0_0_0_1px_rgba(25,25,21,0.035)] dark:bg-[#38372f]/90";

function AxiomIdentity({
  markClassName = "size-11",
  titleClassName = "text-2xl",
  wrapperClassName = "",
}: {
  markClassName?: string;
  titleClassName?: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", wrapperClassName)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-2xl border border-[#d8d0c2]/80 bg-[#fffdf8]/80 p-1.5 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/80",
          markClassName,
        )}
        aria-hidden="true"
      >
        <img
          src="/assets/logo.png"
          alt=""
          className="size-full object-contain"
        />
      </span>
      <strong className={cn("font-semibold leading-tight", titleClassName)}>
        AXIOM
      </strong>
    </div>
  );
}

function ResponseHeading({ title, badge }: { title: string; badge?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 pb-3 pt-5 max-sm:flex-col max-sm:items-start">
      <AxiomIdentity />
    </header>
  );
}

function PendingCard({ investigation }: { investigation: Investigation }) {
  return (
    <Card className={reviewCardClass} aria-live="polite">
      <CardHeader className="gap-5 p-0">
        <ResponseHeading title="AXIOM" badge="Analyzing" />
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6 pt-1">
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className={cn(visibleSkeletonClass, "w-full")} />
          <Skeleton className={cn(visibleSkeletonClass, "w-4/5")} />
          <Skeleton className={cn(visibleSkeletonClass, "w-3/5")} />
        </div>
      </CardContent>
    </Card>
  );
}

function IntentCard({
  investigation,
  draft,
  error,
  loading,
  onSpecificationChange,
  onSpecificationRevise,
  onReset,
  onRun,
}: Extract<ReviewCardProps, { stage: "intent" }>) {
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const valid = Boolean(draft.intent.trim() && draft.scope.trim());
  const canRevise = Boolean(revisionPrompt.trim()) && !loading;
  const specDetails = [
    { label: "Policy", value: investigation.policy },
    { label: "Output", value: investigation.output },
  ].filter((item) => item.value.trim());

  function handlePromptRevision() {
    const feedback = revisionPrompt.trim();
    if (!feedback) return;
    onSpecificationRevise(feedback);
    setRevisionPrompt("");
    setPromptOpen(false);
  }

  return (
    <Card className={reviewCardClass}>
      <CardHeader className="gap-5 p-0">
        <ResponseHeading title="AXIOM" badge="Review" />
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6 pt-0">
        <form
          id="intent-specification-form"
          className="flex flex-col gap-5 rounded-3xl border border-[#d8d0c2] bg-[#fffaf0] p-5 dark:border-[#38372f] dark:bg-[#20201c]"
          onSubmit={(event) => {
            event.preventDefault();
            onRun();
          }}
        >
          <FieldGroup>
            <Field data-invalid={!draft.scope.trim()}>
              <FieldLabel htmlFor="scope-field">Scope</FieldLabel>
              <Textarea
                id="scope-field"
                value={draft.scope}
                disabled={loading}
                onChange={(event) =>
                  onSpecificationChange({ ...draft, scope: event.target.value })
                }
                aria-label="Scope"
                aria-invalid={!draft.scope.trim()}
                rows={2}
                required
              />
            </Field>
          </FieldGroup>

          {specDetails.length > 0 && (
            <div className="flex flex-col gap-3">
              {specDetails.map((item) => (
                <div
                  className="rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#1a1a17]"
                  key={item.label}
                >
                  <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                    {item.label}
                  </span>
                  <strong className="mt-1 block">{item.value}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              aria-controls="revision-prompt-panel"
              aria-expanded={promptOpen}
              disabled={loading}
              onClick={() => setPromptOpen((open) => !open)}
            >
              <PencilLineIcon data-icon="inline-start" />
              {promptOpen ? "Close" : "Edit"}
            </Button>
            <Button type="submit" disabled={!valid || loading}>
              {loading ? "Updating..." : "Approve"}
            </Button>
          </div>

          {promptOpen && (
            <div id="revision-prompt-panel" className="flex flex-col gap-5">
              <FieldSeparator>Prompt revision</FieldSeparator>

              <Field>
                <FieldLabel htmlFor="revision-prompt-field">
                  Revision prompt
                </FieldLabel>
                <Textarea
                  id="revision-prompt-field"
                  value={revisionPrompt}
                  disabled={loading}
                  onChange={(event) => setRevisionPrompt(event.target.value)}
                  placeholder="Example: focus on churn risk for enterprise customers and keep the output as a concise executive summary."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canRevise}
                    onClick={handlePromptRevision}
                  >
                    <WandSparklesIcon data-icon="inline-start" />
                    Revise
                  </Button>
                </div>
              </Field>
            </div>
          )}

          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function ProcessCard({
  investigation,
  events,
  error,
  onRetry,
}: Extract<ReviewCardProps, { stage: "process" }>) {
  const { completed, complete, progress, transcriptEvents } =
    getProcessPresentation(events);

  return (
    <Card className={reviewCardClass} aria-live="polite">
      <CardContent className="space-y-4 p-6 pt-4">
        <ProcessTranscriptList
          ariaLabel="Processing transcript"
          events={transcriptEvents}
        />
        {error && (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button variant="outline" type="button" onClick={onRetry}>
                Retry process
              </Button>
            </AlertAction>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function getProcessPresentation(events: ProcessEvent[]) {
  const total = Math.max(events.length, 1);
  const completed = events.filter((event) => event.status === "done").length;
  const running = events.some((event) => event.status === "running");
  const complete = events.length > 0 && completed === events.length;
  const progress = Math.round(
    ((completed + (running ? 0.5 : 0)) / total) * 100,
  );
  const visibleEvents = events.filter((event) => event.status !== "waiting");
  const transcriptEvents =
    visibleEvents.length > 0 ? visibleEvents : events.slice(0, 1);

  return { completed, complete, progress, transcriptEvents };
}

function ProcessTranscriptList({
  ariaLabel,
  events,
}: {
  ariaLabel: string;
  events: ProcessEvent[];
}) {
  return (
    <section className="grid gap-3" aria-label={ariaLabel}>
      <AxiomIdentity markClassName="size-10" titleClassName="text-xl" />
      <ol className="grid gap-1.5" aria-label={ariaLabel}>
        {events.map((event, index) => (
          <ProcessTranscriptStep event={event} index={index} key={event.id} />
        ))}
      </ol>
    </section>
  );
}

function ProcessTranscriptStep({
  event,
  index,
}: {
  event: ProcessEvent;
  index: number;
}) {
  const visible = event.status !== "waiting" || index === 0;
  const Icon =
    event.status === "done"
      ? CheckIcon
      : event.status === "running"
        ? LoaderCircleIcon
        : Clock3Icon;

  return (
    <>
      <Marker
        render={<li />}
        className={cn(
          event.status,
          "min-h-10 items-start rounded-xl px-2 py-2 transition-colors duration-200",
          visible
            ? "text-[#191915] dark:text-[#eee8dc]"
            : "text-[#6d685e]/65 dark:text-[#aaa397]/55",
        )}
      >
        <MarkerIcon className="mt-0.5 text-[#6d685e] dark:text-[#aaa397]">
          <TerminalSquareIcon />
        </MarkerIcon>
        <MarkerContent>
          <div className="flex min-w-0 flex-wrap items-baseline gap-2">
            <strong className="font-medium">{event.label}</strong>
          </div>
        </MarkerContent>
      </Marker>
    </>
  );
}

function CompletedResponseCard({
  events,
  result,
}: Extract<ReviewCardProps, { stage: "result" }>) {
  const { completed, progress, transcriptEvents } =
    getProcessPresentation(events);

  return (
    <Card className={reviewCardClass} aria-live="polite">
      <CardContent className="flex flex-col gap-2">
        {transcriptEvents.length > 0 ? (
          <section className="space-y-4" aria-label="Process">
            <ProcessTranscriptList
              ariaLabel="Completed process transcript"
              events={transcriptEvents}
            />
          </section>
        ) : (
          <AxiomIdentity />
        )}

        <section className="dark:border-[#38372f]" aria-label="Final answer">
          <MarkdownContent markdown={result.markdown} />
        </section>
      </CardContent>
    </Card>
  );
}
