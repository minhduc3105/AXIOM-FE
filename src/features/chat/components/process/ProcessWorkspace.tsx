import { useState } from "react";
import type { ProcessEvent } from "../../model/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Code2Icon,
  TerminalSquareIcon,
} from "lucide-react";
import { AxiomIdentity, visibleSkeletonClass } from "../AxiomIdentity";
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

  if (transcriptEvents.length === 0) {
    return (
      <section className="grid gap-4" aria-label={ariaLabel}>
        <AxiomIdentity markClassName="size-10" titleClassName="text-xl" />
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className={cn(visibleSkeletonClass, "w-full")} />
          <Skeleton className={cn(visibleSkeletonClass, "w-5/6")} />
          <Skeleton className={cn(visibleSkeletonClass, "w-2/3")} />
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4" aria-label={ariaLabel}>
      <AxiomIdentity markClassName="size-10" titleClassName="text-xl" />
      <div
        className="rounded-[18px] border border-[#d8d0c2]/80 bg-white/70 p-3 dark:border-[#38372f]/80 dark:bg-[#20201c]/70"
        aria-label={ariaLabel}
      >
        <Button
          type="button"
          variant="ghost"
          className="group flex min-h-9 w-full items-center gap-3 rounded-xl px-1 text-left"
          aria-expanded={expanded}
          aria-controls={`${processEventKeyPrefix}-process-steps`}
          onClick={() => setExpanded((current) => !current)}
        >
          <strong className="p-2 min-w-0 flex-1 truncate text-sm font-semibold text-[#191915] dark:text-[#eee8dc]">
            Analysis Details
          </strong>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#9b9488] dark:text-[#aaa397]">
            {expanded ? "Hide" : "Show"}
            {expanded ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </span>
        </Button>

        {expanded && (
          <div className="mt-7 pl-1">
            <ScrollArea
              id={`${processEventKeyPrefix}-process-steps`}
              className={cn(
                hasScrollableTranscript
                  ? "h-[min(420px,calc(100dvh-360px))] min-h-[240px]"
                  : "max-h-[420px]",
              )}
            >
              <ol className="grid gap-2 pr-1" aria-label={ariaLabel}>
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
          </div>
        )}
      </div>
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
        variant="outline"
        className={cn(
          "group flex min-h-[52px] w-full items-center gap-3 rounded-[18px] border px-3 py-2 text-left transition-colors",
          selected
            ? "border-[#c8d7ff] bg-white shadow-sm dark:border-[#52618a] dark:bg-[#20201c]"
            : "border-[#d8d0c2]/80 bg-white/80 shadow-sm hover:border-[#c8d7ff] dark:border-[#38372f]/80 dark:bg-[#1a1a17]/80 dark:hover:border-[#52618a]",
        )}
        aria-current={selected ? "step" : undefined}
        onClick={onSelect}
      >
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full border border-[#d8d0c2]/70 bg-white text-[#191915] dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#eee8dc]"
          aria-hidden="true"
        >
          <TypeIcon className="size-3.5" />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 leading-none">
          <strong className="truncate text-sm font-semibold leading-none text-[#191915] dark:text-[#eee8dc]">
            {event.label}
          </strong>
        </span>
        <span className="flex shrink-0 items-center gap-3 text-[#9b9488] dark:text-[#aaa397]">
          <span
            className={cn(
              "grid size-4 place-items-center rounded-full border",
              event.status === "failed"
                ? "border-red-500 text-red-600 dark:text-red-300"
                : "border-emerald-500 text-emerald-600 dark:text-emerald-300",
            )}
            aria-hidden="true"
          >
            <StatusIcon
              className={cn(
                "size-2.5",
                event.status === "running" && "animate-spin",
              )}
            />
          </span>
          <ChevronRightIcon className="size-3.5" />
        </span>
      </Button>
    </li>
  );
}

function isCodeStep(event: ProcessEvent) {
  return (
    Boolean(event.code?.content) || /python|code|execute/i.test(event.label)
  );
}
