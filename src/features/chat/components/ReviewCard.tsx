import { useState } from "react";
import { PencilLineIcon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type {
  EditableSpecification,
  ChatTranscriptItem,
  Investigation,
  MockResult,
  ProcessEvent,
} from "../model/types";
import type { ChatError } from "../model/chatError";
import { AnswerActions } from "./AnswerActions";
import { MarkdownContent } from "./MarkdownContent";
import {
  getProcessPresentation,
  isToolProcessEvent,
  ProcessWorkspace,
  type ProcessStepSelectionHandler,
} from "./ProcessStepPanel";

type ReviewCardProps = {
  stage: "pending" | "intent" | "process" | "result";
  investigation: Investigation;
  draft?: EditableSpecification | null;
  events?: ProcessEvent[];
  transcript?: ChatTranscriptItem[];
  activeProcessEventKey?: string | null;
  processEventKeyPrefix?: string;
  error?: ChatError | null;
  loading: boolean;
  result?: MockResult | null;
  responseComplete: boolean;
  canRetry?: boolean;
  onProcessEventSelect?: ProcessStepSelectionHandler;
  onSpecificationChange?: (specification: EditableSpecification) => void;
  onSpecificationRevise?: (feedback: string) => void;
  onReset?: () => void;
  onRun?: () => void;
  onRetry?: () => void;
};

export function ReviewCard(props: ReviewCardProps) {
  const presentation = getProcessPresentation(props.events ?? []);
  const hasResult = Boolean(props.result?.markdown);
  const transcript = responseTranscript({
    transcript: props.transcript,
    events: props.events ?? [],
    markdown: props.result?.markdown,
  });
  const hasTranscript = transcript.length > 0;
  const errorStatus = props.error && (
    <div
      className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      role="alert"
    >
      <span>{props.error.message}</span>
      {props.canRetry && props.onRetry && (
        <Button type="button" size="xs" variant="ghost" onClick={props.onRetry}>
          Retry
        </Button>
      )}
    </div>
  );

  return (
    <section
      aria-busy={props.loading && !hasResult && !props.error}
      aria-live="polite"
      className="flex min-w-0 flex-col gap-4 px-1 py-1 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-180 motion-safe:ease-out motion-reduce:animate-none"
      data-chat-response
      data-response-state={props.error ? "error" : props.stage}
    >
      {props.stage === "intent" && props.draft ? (
        <IntentCard {...props} draft={props.draft} />
      ) : hasResult || hasTranscript ? (
        <>
          <section aria-label={hasResult ? "Final answer" : "Response"}>
            <TranscriptContent
              transcript={transcript}
              activeProcessEventKey={props.activeProcessEventKey}
              processEventKeyPrefix={props.processEventKeyPrefix}
              onProcessEventSelect={props.onProcessEventSelect}
            />
            {errorStatus}
            {hasResult && props.result && props.responseComplete && (
              <AnswerActions
                markdown={props.result.markdown}
                events={presentation.transcriptEvents}
                artifacts={props.result.artifacts}
              />
            )}
          </section>
        </>
      ) : !props.error ? (
        <ThinkingIndicator />
      ) : null}

      {!hasResult && errorStatus}
    </section>
  );
}

function TranscriptContent({
  transcript,
  activeProcessEventKey,
  processEventKeyPrefix = "process",
  onProcessEventSelect,
}: {
  transcript: ChatTranscriptItem[];
  activeProcessEventKey?: string | null;
  processEventKeyPrefix?: string;
  onProcessEventSelect?: ProcessStepSelectionHandler;
}) {
  const blocks = groupTranscript(transcript);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {blocks.map((block, index) => {
        if (block.kind === "response") {
          return <MarkdownContent markdown={block.markdown} key={block.id} />;
        }

        const presentation = getProcessPresentation(block.events);
        if (presentation.transcriptEvents.length === 0) return null;

        return (
          <ProcessWorkspace
            presentation={presentation}
            activeProcessEventKey={activeProcessEventKey}
            processEventKeyPrefix={processEventKeyPrefix}
            onProcessEventSelect={onProcessEventSelect}
            key={`${processEventKeyPrefix}-actions-${index}`}
          />
        );
      })}
    </div>
  );
}

type TranscriptBlock =
  | Extract<ChatTranscriptItem, { kind: "response" }>
  | {
      kind: "actions";
      id: string;
      events: ProcessEvent[];
    };

function groupTranscript(transcript: ChatTranscriptItem[]): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = [];

  for (const item of transcript) {
    if (item.kind === "response") {
      if (item.markdown.trim()) blocks.push(item);
      continue;
    }
    if (!isToolProcessEvent(item.event)) continue;

    const previous = blocks[blocks.length - 1];
    if (previous?.kind === "actions") {
      previous.events.push(item.event);
    } else {
      blocks.push({
        kind: "actions",
        id: `actions:${item.id}`,
        events: [item.event],
      });
    }
  }

  return blocks;
}

function responseTranscript({
  transcript,
  events,
  markdown,
}: {
  transcript?: ChatTranscriptItem[];
  events: ProcessEvent[];
  markdown?: string;
}): ChatTranscriptItem[] {
  const items = transcript?.length
    ? transcript
    : events.map((event) => ({
        kind: "action" as const,
        id: event.id,
        event,
      }));
  const responseText = items
    .filter(
      (item): item is Extract<ChatTranscriptItem, { kind: "response" }> =>
        item.kind === "response",
    )
    .map((item) => item.markdown)
    .join("");

  if (!markdown || responseText === markdown) return items;
  if (!responseText || markdown.startsWith(responseText)) {
    return [
      ...items,
      {
        kind: "response",
        id: `response:${items.length}`,
        markdown: markdown.slice(responseText.length),
      },
    ];
  }

  return items;
}

function IntentCard({
  draft,
  loading,
  onSpecificationChange,
  onSpecificationRevise,
  onReset,
  onRun,
}: ReviewCardProps & { draft: EditableSpecification }) {
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState(false);
  const valid = Boolean(draft.intent.trim() && draft.specMarkdown.trim());
  const canRevise = Boolean(revisionPrompt.trim()) && !loading;

  function handlePromptRevision() {
    const feedback = revisionPrompt.trim();
    if (!feedback) return;
    onSpecificationRevise?.(feedback);
    setRevisionPrompt("");
    setPromptOpen(false);
  }

  function handleReset() {
    onReset?.();
    setEditingSpec(false);
  }

  return (
    <form
      id="intent-specification-form"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-muted/20 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onRun?.();
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
                onSpecificationChange?.({
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
              className="h-[min(48dvh,520px)] rounded-xl border border-border bg-background"
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
    </form>
  );
}

function ThinkingIndicator() {
  return (
    <span className="py-1 text-sm text-muted-foreground motion-safe:animate-pulse motion-reduce:animate-none">
      Thinking
    </span>
  );
}
