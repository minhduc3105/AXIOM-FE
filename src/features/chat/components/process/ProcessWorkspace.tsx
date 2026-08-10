import { useState } from "react";
import type { ProcessEvent } from "../../model/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { AxiomIdentity, visibleSkeletonClass } from "../AxiomIdentity";
import {
  processStatusIcon,
  type ProcessPresentation,
  type ProcessStepSelectionHandler,
} from "./processEvents";
import { extractWorkspaceFiles, WorkspaceFileList } from "./workspaceFiles";

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
  const [expanded, setExpanded] = useState(true);
  const hasScrollableTranscript = transcriptEvents.length > 5;
  const workspaceFiles = extractWorkspaceFiles(transcriptEvents);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AxiomIdentity markClassName="size-10" titleClassName="text-xl" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={expanded}
          aria-controls={`${processEventKeyPrefix}-process-steps`}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <ChevronUpIcon data-icon="inline-start" />
          ) : (
            <ChevronDownIcon data-icon="inline-start" />
          )}
          {expanded ? "Collapse" : "Expand"}
        </Button>
      </div>

      {expanded && (
        <div
          className="overflow-hidden rounded-2xl border border-[#d8d0c2]/80 bg-[#fffdf8]/60 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/55"
          id={`${processEventKeyPrefix}-process-steps`}
        >
          <ScrollArea
            className={cn(
              "transition-[height] duration-200",
              hasScrollableTranscript
                ? "h-[min(420px,calc(100dvh-360px))] min-h-[240px]"
                : "max-h-[420px]",
            )}
          >
            <ol className="grid gap-1.5 p-2 pr-3" aria-label={ariaLabel}>
              {transcriptEvents.map((event, index) => {
                const eventKey = `${processEventKeyPrefix}:${event.id}`;
                return (
                  <ProcessStepButton
                    event={event}
                    index={index}
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
    </section>
  );
}

function ProcessStepButton({
  event,
  index,
  selected,
  onSelect,
}: {
  event: ProcessEvent;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = processStatusIcon(event.status);

  return (
    <li>
      <button
        type="button"
        className={cn(
          "group flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200",
          selected
            ? "border-[#191915]/20 bg-white shadow-sm dark:border-[#eee8dc]/15 dark:bg-[#20201c]"
            : "border-transparent hover:border-[#d8d0c2]/80 hover:bg-white/70 dark:hover:border-[#38372f]/80 dark:hover:bg-[#20201c]/70",
        )}
        aria-current={selected ? "step" : undefined}
        onClick={onSelect}
      >
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg border",
            event.status === "done"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300"
              : event.status === "failed"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300"
                : event.status === "running"
                  ? "border-[#c7bca9] bg-[#fffaf0] text-[#5f4e2f] dark:border-[#4a4438] dark:bg-[#2b2820] dark:text-[#d8c7a6]"
                  : "border-[#d8d0c2] bg-[#f4efe5] text-[#6d685e] dark:border-[#38372f] dark:bg-[#22221e] dark:text-[#aaa397]",
          )}
          aria-hidden="true"
        >
          <Icon
            className={cn(
              "size-3.5",
              event.status === "running" && "animate-spin",
            )}
          />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 leading-none">
          <span className="shrink-0 font-mono text-[11px] leading-none text-[#6d685e] dark:text-[#aaa397]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <strong className="truncate text-sm font-medium leading-none text-[#191915] dark:text-[#eee8dc]">
            {event.label}
          </strong>
        </span>
      </button>
    </li>
  );
}
