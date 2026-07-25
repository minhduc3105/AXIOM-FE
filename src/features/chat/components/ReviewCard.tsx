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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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

const reviewCardClass =
  "w-full rounded-[28px] border border-[#d8d0c2] bg-[#fffdf8]/92 p-0 shadow-[0_18px_54px_rgba(24,24,18,0.10)] dark:border-[#38372f] dark:bg-[#1a1a17]/92";
const cardCopyClass =
  "text-sm leading-relaxed text-[#6d685e] dark:text-[#aaa397]";

function ResponseHeading({ title, badge }: { title: string; badge?: string }) {
  return (
    <header className="flex min-h-24 items-center justify-between gap-4 border-b border-[#d8d0c2] bg-gradient-to-r from-[#f4efe5] to-[#fffdf8] p-6 dark:border-[#38372f] dark:from-[#20201c] dark:to-[#1a1a17] max-sm:flex-col max-sm:items-start">
      <div className="flex items-center gap-4">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#2456e8] text-xl font-black text-white dark:bg-[#7895ff] dark:text-[#0e142c]"
          aria-hidden="true"
        >
          A
        </span>
        <div>
          <h2 className="text-2xl font-semibold leading-tight">{title}</h2>
        </div>
      </div>
      {badge && (
        <Badge className="rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-3 py-1 text-[#1018a2] dark:border-[#7895ff]/40 dark:bg-[#202844] dark:text-[#dfe6ff]">
          {badge}
        </Badge>
      )}
    </header>
  );
}

function PendingCard({ investigation }: { investigation: Investigation }) {
  return (
    <Card className={reviewCardClass} aria-live="polite">
      <CardHeader className="gap-5 p-0">
        <ResponseHeading title="Understanding your request" badge="Analyzing" />
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-4">
        <div className="grid gap-3">
          <Skeleton className="h-3 rounded-full" />
          <Skeleton className="h-3 w-4/5 rounded-full" />
          <Skeleton className="h-3 w-3/5 rounded-full" />
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
        <ResponseHeading title="Intent & Spec" badge="Review" />
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-4">
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

          <div className="flex justify-end">
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
                    Revise spec
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
      <CardFooter className="flex justify-end gap-3 border-t border-[#d8d0c2] bg-[#f4efe5]/70 p-5 dark:border-[#38372f] dark:bg-[#20201c]/70 max-sm:flex-col-reverse">
        <Button
          variant="outline"
          type="button"
          onClick={onReset}
          disabled={loading}
        >
          Reset
        </Button>
        <Button
          type="submit"
          form="intent-specification-form"
          disabled={!valid || loading}
        >
          {loading ? "Updating..." : "Approve"}
        </Button>
      </CardFooter>
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
        <Progress value={progress} aria-label="Workflow progress" />
        <div className="rounded-[24px] border border-[#d8d0c2] bg-[#fffaf0]/70 p-3 dark:border-[#38372f] dark:bg-[#20201c]/72">
          <ol className="grid gap-1.5" aria-label="Processing transcript">
            {transcriptEvents.map((event, index) => (
              <ProcessTranscriptStep
                event={event}
                index={index}
                key={event.id}
              />
            ))}
          </ol>
        </div>
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
          "min-h-8 px-2 text-[#475569] dark:text-[#aaa397]",
          !visible && "opacity-45",
        )}
        role={event.status === "running" ? "status" : undefined}
      >
        <MarkerIcon className="text-[#6d685e] dark:text-[#aaa397]">
          <BrainCircuitIcon />
        </MarkerIcon>
        <MarkerContent>Thinking</MarkerContent>
      </Marker>
      <Marker
        render={<li />}
        className={cn(
          event.status,
          "min-h-10 items-start rounded-xl px-2 py-2 transition-colors duration-200",
          visible
            ? "text-[#191915] dark:text-[#eee8dc]"
            : "text-[#6d685e]/65 dark:text-[#aaa397]/55",
          event.status === "running" &&
            "bg-[#eef2ff] text-[#1018a2] dark:bg-[#202844] dark:text-[#dfe6ff]",
        )}
      >
        <MarkerIcon className="mt-0.5 text-[#6d685e] dark:text-[#aaa397]">
          <TerminalSquareIcon />
        </MarkerIcon>
        <MarkerContent>
          <div className="flex min-w-0 flex-wrap items-baseline gap-2">
            <strong className="font-medium">{event.label}</strong>
            <span className="text-xs leading-relaxed text-[#6d685e] dark:text-[#aaa397]">
              {event.detail}
            </span>
          </div>
        </MarkerContent>
        <span className="inline-flex items-center gap-1 text-xs text-[#6d685e] dark:text-[#aaa397]">
          <Icon
            className={cn(
              "size-3.5",
              event.status === "running" && "animate-spin",
            )}
            aria-hidden="true"
          />
          {event.status === "done"
            ? "Done"
            : event.status === "running"
              ? "Running"
              : "Waiting"}
        </span>
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
      <CardContent className="space-y-8 p-6">
        <section className="space-y-4" aria-label="Process">
          <div className="rounded-[24px] border border-[#d8d0c2] bg-[#fffaf0]/70 p-3 dark:border-[#38372f] dark:bg-[#20201c]/72">
            <ol
              className="grid gap-1.5"
              aria-label="Completed process transcript"
            >
              {transcriptEvents.map((event, index) => (
                <ProcessTranscriptStep
                  event={event}
                  index={index}
                  key={event.id}
                />
              ))}
            </ol>
          </div>
        </section>

        <section className="dark:border-[#38372f]" aria-label="Final answer">
          <MarkdownContent markdown={result.markdown} />
        </section>
      </CardContent>
    </Card>
  );
}
