import { useState } from "react";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FilePenLineIcon,
  FolderIcon,
  SearchIcon,
  TerminalSquareIcon,
  WrenchIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { cn } from "@/shared/lib/utils";
import type { ProcessEvent } from "../../model/types";
import {
  type ProcessPresentation,
  type ProcessStepSelectionHandler,
} from "./processEvents";
import { formatJson, hasDisplayValue } from "./processValueUtils";

export function ProcessWorkspace({
  presentation,
  activeProcessEventKey,
  processEventKeyPrefix = "process",
  onProcessEventSelect,
}: {
  presentation: ProcessPresentation;
  activeProcessEventKey?: string | null;
  processEventKeyPrefix?: string;
  onProcessEventSelect?: ProcessStepSelectionHandler;
}) {
  const { transcriptEvents } = presentation;
  const [expanded, setExpanded] = useState(false);

  if (transcriptEvents.length === 0) return null;

  const actionId = `${processEventKeyPrefix}-action-steps`;
  return (
    <section
      aria-label="Actions"
      className="w-full min-w-0"
      data-inline-action-timeline
    >
      <Marker
        className="cursor-pointer py-1 transition-colors hover:text-foreground"
        render={
          <button
            type="button"
            className="border-0 bg-transparent p-0"
            aria-controls={actionId}
            aria-expanded={expanded}
            onClick={(event) => {
              setExpanded((current) => !current);
              event.currentTarget.blur();
            }}
          />
        }
      >
        <MarkerIcon>
          <TerminalSquareIcon className="text-current" />
        </MarkerIcon>
        <MarkerContent className="flex min-w-0 items-center gap-1.5">
          <span className="flex min-w-0 items-center text-left text-sm">
            <strong className="min-w-0 truncate font-normal">
              {actionSummary(transcriptEvents)}
            </strong>
            <span
              className={cn(
                "ml-1 shrink-0 transition-opacity",
                expanded
                  ? "opacity-100"
                  : "opacity-0 group-hover/marker:opacity-100",
              )}
            >
              {expanded ? (
                <ChevronDownIcon className="size-3.5" />
              ) : (
                <ChevronRightIcon className="size-3.5" />
              )}
            </span>
          </span>
        </MarkerContent>
      </Marker>

      {expanded && (
        <ol id={actionId} aria-label="Action steps" className="grid gap-1">
          {transcriptEvents.map((event) => {
            const eventKey = `${processEventKeyPrefix}:${event.id}`;
            return (
              <InlineActionStep
                event={event}
                eventKey={eventKey}
                selected={eventKey === activeProcessEventKey}
                onSelect={() => onProcessEventSelect?.(event, eventKey)}
                key={eventKey}
              />
            );
          })}
        </ol>
      )}
    </section>
  );
}

function InlineActionStep({
  event,
  eventKey,
  selected,
  onSelect,
}: {
  event: ProcessEvent;
  eventKey: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `${eventKey.replace(/[^a-zA-Z0-9_-]/g, "-")}-details`;

  function toggle() {
    setExpanded((current) => !current);
    onSelect();
  }

  return (
    <li>
      <Marker
        variant="default"
        className={cn(
          "cursor-pointer py-1 transition-colors hover:text-foreground",
          event.status === "failed" && "text-destructive",
        )}
        render={
          <button
            type="button"
            className="border-0 bg-transparent p-0"
            aria-current={selected ? "step" : undefined}
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={toggle}
          />
        }
      >
        <MarkerIcon>
          <ActionIcon
            event={event}
            className={cn(
              "size-4",
              event.status === "running" &&
                "motion-safe:animate-pulse motion-reduce:animate-none",
            )}
          />
        </MarkerIcon>
        <MarkerContent className="flex min-w-0 flex-1">
          <span className="flex min-w-0 items-center text-left text-sm">
            <span className="min-w-0 truncate font-normal">{event.label}</span>
            <span
              className={cn(
                "ml-1 shrink-0 transition-opacity",
                expanded
                  ? "opacity-100"
                  : "opacity-0 group-hover/marker:opacity-100",
              )}
            >
              {expanded ? (
                <ChevronDownIcon className="size-3.5" />
              ) : (
                <ChevronRightIcon className="size-3.5" />
              )}
            </span>
          </span>
        </MarkerContent>
      </Marker>

      {expanded && <InlineActionDetails event={event} id={detailsId} />}
    </li>
  );
}

function InlineActionDetails({
  event,
  id,
}: {
  event: ProcessEvent;
  id: string;
}) {
  return (
    <div
      id={id}
      className="ml-4 grid gap-2 border-b border-border/70 px-1 pb-3 pt-1 text-xs text-muted-foreground"
    >
      {hasDisplayValue(event.inputs) && (
        <InlineActionValue label="Input" value={event.inputs} />
      )}
      {hasDisplayValue(event.outputs) && (
        <InlineActionValue label="Output" value={event.outputs} />
      )}
      {!event.detail &&
        !hasDisplayValue(event.inputs) &&
        !hasDisplayValue(event.outputs) && (
          <p className="leading-5">No details captured for this step.</p>
        )}
    </div>
  );
}

function InlineActionValue({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="font-medium text-muted-foreground">{label}</span>
      <pre className="max-h-40 min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2 leading-5 text-foreground">
        {typeof value === "string" ? value : formatJson(value)}
      </pre>
    </div>
  );
}

function actionSummary(events: ProcessEvent[]) {
  const labels = events.map((event) => event.label.toLowerCase());
  const summary: string[] = ["Loaded a tool"];

  if (labels.some((label) => /read|open|load/.test(label))) {
    summary.push("read files");
  }
  if (labels.some((label) => /list|glob|directory/.test(label))) {
    summary.push("listed files");
  }
  if (labels.some((label) => /search|find|query/.test(label))) {
    summary.push("searched files");
  }
  if (labels.some((label) => /execute|run|shell|python|command/.test(label))) {
    summary.push("ran commands");
  }
  if (labels.some((label) => /write|edit|create|delete|remove/.test(label))) {
    summary.push("edited files");
  }

  return summary.join(", ");
}

function ActionIcon({
  event,
  className,
}: {
  event: ProcessEvent;
  className?: string;
}) {
  const Icon = actionIcon(event);
  return <Icon className={className} />;
}

function actionIcon(event: ProcessEvent): LucideIcon {
  const label = event.label.toLowerCase();
  if (/search|find|query/.test(label)) return SearchIcon;
  if (/list|glob|directory/.test(label)) return FolderIcon;
  if (/read|open|load/.test(label)) return BookOpenIcon;
  if (/write|edit|create|delete|remove/.test(label)) return FilePenLineIcon;
  if (/execute|run|shell|python|command/.test(label)) return TerminalSquareIcon;
  return WrenchIcon;
}
