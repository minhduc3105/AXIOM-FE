import { useState } from "react";
import type {
  EditableSpecification,
  Investigation,
  MockResult,
  ProcessEvent,
} from "../model/types";
import { PencilLineIcon, WandSparklesIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { AxiomIdentity, visibleSkeletonClass } from "./AxiomIdentity";
import { MarkdownContent } from "./MarkdownContent";
import {
  getProcessPresentation,
  ProcessWorkspace,
  type ProcessStepSelectionHandler,
} from "./ProcessStepPanel";

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
      activeProcessEventKey?: string | null;
      processEventKeyPrefix?: string;
      error: string | null;
      onProcessEventSelect?: ProcessStepSelectionHandler;
      onRetry: () => void;
    }
  | {
      stage: "result";
      investigation: Investigation;
      events: ProcessEvent[];
      activeProcessEventKey?: string | null;
      processEventKeyPrefix?: string;
      onProcessEventSelect?: ProcessStepSelectionHandler;
      result: MockResult;
    };

export function ReviewCard(props: ReviewCardProps) {
  if (props.stage === "pending") {
    return <PendingCard investigation={props.investigation} />;
  }
  if (props.stage === "intent") return <IntentCard {...props} />;
  if (props.stage === "process") return <ProcessCard {...props} />;
  return <CompletedResponseCard {...props} />;
}

const reviewCardClass = "w-full border-0 bg-transparent p-0 shadow-none ring-0";

function ResponseHeading() {
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
        <ResponseHeading />
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
  const [editingSpec, setEditingSpec] = useState(false);
  const valid = Boolean(draft.intent.trim() && draft.specMarkdown.trim());
  const canRevise = Boolean(revisionPrompt.trim()) && !loading;

  function handlePromptRevision() {
    const feedback = revisionPrompt.trim();
    if (!feedback) return;
    onSpecificationRevise(feedback);
    setRevisionPrompt("");
    setPromptOpen(false);
  }

  function handleReset() {
    onReset();
    setEditingSpec(false);
  }

  return (
    <Card className={reviewCardClass}>
      <CardHeader className="gap-5 p-0">
        <ResponseHeading />
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
            <Field data-invalid={!draft.specMarkdown.trim()}>
              <FieldLabel htmlFor="specification-markdown-field">
                Specification
              </FieldLabel>
              {editingSpec ? (
                <Textarea
                  id="specification-markdown-field"
                  value={draft.specMarkdown}
                  disabled={loading}
                  onChange={(event) =>
                    onSpecificationChange({
                      ...draft,
                      specMarkdown: event.target.value,
                    })
                  }
                  aria-label="Specification markdown"
                  aria-invalid={!draft.specMarkdown.trim()}
                  className="min-h-80 font-mono text-sm leading-relaxed"
                  required
                />
              ) : (
                <ScrollArea
                  id="specification-markdown-field"
                  className="h-[min(48dvh,520px)] rounded-2xl border border-[#d8d0c2] bg-[#fffdf8] dark:border-[#38372f] dark:bg-[#1a1a17]"
                >
                  <div className="p-5">
                    <MarkdownContent markdown={draft.specMarkdown} compact />
                  </div>
                </ScrollArea>
              )}
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap justify-end gap-3">
            {editingSpec && (
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={handleReset}
              >
                Reset
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              aria-controls="specification-markdown-field"
              aria-expanded={editingSpec}
              disabled={loading}
              onClick={() => setEditingSpec((editing) => !editing)}
            >
              <PencilLineIcon data-icon="inline-start" />
              {editingSpec ? "Preview" : "Edit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-controls="revision-prompt-panel"
              aria-expanded={promptOpen}
              disabled={loading}
              onClick={() => setPromptOpen((open) => !open)}
            >
              <WandSparklesIcon data-icon="inline-start" />
              {promptOpen ? "Close" : "Request changes"}
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
  events,
  activeProcessEventKey,
  processEventKeyPrefix,
  error,
  onProcessEventSelect,
  onRetry,
}: Extract<ReviewCardProps, { stage: "process" }>) {
  const presentation = getProcessPresentation(events);

  return (
    <Card className={reviewCardClass} aria-live="polite">
      <CardContent className="space-y-4 p-6 pt-4">
        <ProcessWorkspace
          ariaLabel="Processing transcript"
          presentation={presentation}
          activeProcessEventKey={activeProcessEventKey}
          processEventKeyPrefix={processEventKeyPrefix}
          onProcessEventSelect={onProcessEventSelect}
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
            <AlertAction className="top-1/2 flex -translate-y-1/2 items-center">
              <Button size="xs" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function CompletedResponseCard({
  events,
  activeProcessEventKey,
  processEventKeyPrefix,
  onProcessEventSelect,
  result,
}: Extract<ReviewCardProps, { stage: "result" }>) {
  const presentation = getProcessPresentation(events);

  return (
    <Card className={reviewCardClass} aria-live="polite">
      <CardContent className="flex flex-col gap-5 px-6 pb-6 pt-4">
        {presentation.transcriptEvents.length > 0 ? (
          <ProcessWorkspace
            ariaLabel="Completed process transcript"
            presentation={presentation}
            activeProcessEventKey={activeProcessEventKey}
            processEventKeyPrefix={processEventKeyPrefix}
            onProcessEventSelect={onProcessEventSelect}
          />
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
