import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Code2Icon,
  TerminalSquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import type { ProcessEvent } from "../../model/types";
import {
  processStatusIcon,
  type ProcessPresentation,
  type ProcessStepSelectionHandler,
} from "./processEvents";

export function ProcessWorkspace({
  ariaLabel,
  presentation,
  activeProcessEventKey,
  processEventKeyPrefix = "process",
  onProcessEventSelect,
}: {
  ariaLabel: string;
  presentation: ProcessPresentation;
  activeProcessEventKey?: string | null;
  processEventKeyPrefix?: string;
  onProcessEventSelect?: ProcessStepSelectionHandler;
}) {
  const { transcriptEvents } = presentation;
  const [expanded, setExpanded] = useState(false);
  const hasScrollableTranscript = transcriptEvents.length > 5;

  if (transcriptEvents.length === 0) return null;

  return (
    <section className="border-y border-border/70" aria-label={ariaLabel}>
      <Button
        type="button"
        variant="ghost"
        className="flex min-h-10 w-full items-center gap-3 rounded-none px-1 text-left"
        aria-expanded={expanded}
        aria-controls={`${processEventKeyPrefix}-process-steps`}
        onClick={() => setExpanded((current) => !current)}
      >
        <strong className="min-w-0 flex-1 truncate text-sm font-medium">
          Analysis Details
        </strong>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {expanded ? "Hide" : "Show"}
          {expanded ? (
            <ChevronDownIcon className="size-3.5" />
          ) : (
            <ChevronRightIcon className="size-3.5" />
          )}
        </span>
      </Button>

      {expanded && (
        <ScrollArea
          id={`${processEventKeyPrefix}-process-steps`}
          className={cn(
            "border-t border-border/70",
            hasScrollableTranscript
              ? "h-[min(420px,calc(100dvh-360px))] min-h-[240px]"
              : "max-h-[420px]",
          )}
        >
          <ol className="divide-y divide-border/70" aria-label={ariaLabel}>
            {transcriptEvents.map((event) => {
              const eventKey = `${processEventKeyPrefix}:${event.id}`;
              return (
                <ProcessStepButton
                  event={event}
                  selected={eventKey === activeProcessEventKey}
                  onSelect={() => onProcessEventSelect?.(event, eventKey)}
                  key={eventKey}
                />
              );
            })}
          </ol>
        </ScrollArea>
      )}
    </section>
  );
}

function ProcessStepButton({
  event,
  selected,
  onSelect,
}: {
  event: ProcessEvent;
  selected: boolean;
  onSelect: () => void;
}) {
  const StatusIcon = processStatusIcon(event.status);
  const TypeIcon = isCodeStep(event) ? Code2Icon : TerminalSquareIcon;

  return (
    <li>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-none px-2 text-left",
          selected && "bg-muted",
        )}
        aria-label={event.label}
        aria-current={selected ? "step" : undefined}
        onClick={onSelect}
      >
        <TypeIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <strong className="min-w-0 flex-1 truncate text-sm font-medium">
          {event.label}
        </strong>
        <StatusIcon
          className={cn(
            "size-3.5 shrink-0",
            event.status === "running" && "animate-spin motion-reduce:animate-none",
          )}
          aria-hidden="true"
        />
      </Button>
    </li>
  );
}

function isCodeStep(event: ProcessEvent) {
  return Boolean(event.code?.content) || /python|code|execute/i.test(event.label);
}
