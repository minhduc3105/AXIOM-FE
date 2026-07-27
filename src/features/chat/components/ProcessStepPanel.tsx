import { useState } from "react";
import type { ProcessEvent } from "../model/types";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  Clock3Icon,
  Code2Icon,
  InfoIcon,
  LoaderCircleIcon,
  TerminalSquareIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/lib/utils";
import { AxiomIdentity, visibleSkeletonClass } from "./AxiomIdentity";

export type ProcessStepSelectionHandler = (
  event: ProcessEvent,
  key: string,
) => void;

type ProcessPresentation = ReturnType<typeof getProcessPresentation>;

export function getProcessPresentation(events: ProcessEvent[]) {
  const visibleEvents = events.filter((event) => event.status !== "waiting");
  const transcriptEvents =
    visibleEvents.length > 0 ? visibleEvents : events.slice(0, 1);

  return { transcriptEvents };
}

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
          "group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
          selected
            ? "border-[#191915]/20 bg-white shadow-sm dark:border-[#eee8dc]/15 dark:bg-[#20201c]"
            : "border-transparent hover:border-[#d8d0c2]/80 hover:bg-white/70 dark:hover:border-[#38372f]/80 dark:hover:bg-[#20201c]/70",
        )}
        aria-current={selected ? "step" : undefined}
        onClick={onSelect}
      >
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border",
            event.status === "done"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300"
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
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#6d685e] dark:text-[#aaa397]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <strong className="truncate text-sm font-medium text-[#191915] dark:text-[#eee8dc]">
              {event.label}
            </strong>
          </span>
        </span>
      </button>
    </li>
  );
}

export function ProcessStepDetail({
  event,
  onCollapse,
  onClose,
}: {
  event: ProcessEvent | null;
  onCollapse?: () => void;
  onClose?: () => void;
}) {
  if (!event) {
    return (
      <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-[#d8d0c2] text-sm text-[#6d685e] dark:border-[#38372f] dark:text-[#aaa397]">
        No process step selected.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[420px] min-w-0 flex-col rounded-2xl border border-[#d8d0c2]/80 bg-[#fffdf8]/75 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/65">
      <div className="flex items-start justify-between gap-3 border-b border-[#d8d0c2]/80 px-4 py-3 dark:border-[#38372f]/80">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#d8d0c2] bg-white text-[#6d685e] dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#aaa397]">
            <TerminalSquareIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold leading-6 text-[#191915] dark:text-[#eee8dc]">
                {event.label}
              </h3>
              <Badge
                variant={event.status === "done" ? "secondary" : "outline"}
              >
                {processStatusLabel(event.status)}
              </Badge>
            </div>
            {event.detail && (
              <p className="mt-1 text-sm leading-6 text-[#6d685e] dark:text-[#aaa397]">
                {event.detail}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onCollapse && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Collapse process details"
              onClick={onCollapse}
            >
              <ChevronRightIcon />
            </Button>
          )}
          {onClose && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Close process details"
              onClick={onClose}
            >
              <XIcon />
            </Button>
          )}
        </div>
      </div>

      <Tabs
        key={event.id}
        defaultValue={firstProcessTab(event)}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d8d0c2]/60 px-4 py-2 dark:border-[#38372f]/70">
          <TabsList variant="line" className="h-8">
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
          </TabsList>
          <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
            {event.eventType && (
              <Badge variant="ghost" className="max-w-full truncate">
                {formatDetailLabel(event.eventType)}
              </Badge>
            )}
            {event.phase && (
              <Badge variant="outline" className="max-w-full truncate">
                {formatDetailLabel(event.phase)}
              </Badge>
            )}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            <TabsContent value="input" className="m-0">
              <RuntimeValuePanel
                value={event.inputs}
                emptyLabel="No structured input captured for this step."
              />
            </TabsContent>
            <TabsContent value="output" className="m-0">
              <RuntimeOutputPanel event={event} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function RuntimeOutputPanel({ event }: { event: ProcessEvent }) {
  const code = event.code;

  if (code?.content) {
    return (
      <div className="grid gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#6d685e] dark:text-[#aaa397]">
          <Code2Icon className="size-3.5" />
          <span>{code.name || "Generated code"}</span>
          {code.language && <span>{code.language}</span>}
        </div>
        <TerminalBlock value={code.content} />
        {hasDisplayValue(event.outputs) && (
          <StructuredValue value={event.outputs} />
        )}
      </div>
    );
  }

  return (
    <RuntimeValuePanel
      value={event.outputs}
      emptyLabel="No structured output captured for this step."
    />
  );
}

function RuntimeValuePanel({
  value,
  emptyLabel,
}: {
  value: unknown;
  emptyLabel: string;
}) {
  if (!hasDisplayValue(value)) return <EmptyRuntimeDetail label={emptyLabel} />;
  if (
    typeof value === "string" &&
    (value.length > 220 || value.includes("\n"))
  ) {
    return <TerminalBlock value={value} />;
  }
  return <StructuredValue value={value} />;
}

function EmptyRuntimeDetail({ label }: { label: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center gap-2 rounded-xl border border-dashed border-[#d8d0c2] px-4 py-6 text-sm text-[#6d685e] dark:border-[#38372f] dark:text-[#aaa397]">
      <InfoIcon className="size-4" />
      <span>{label}</span>
    </div>
  );
}

function StructuredValue({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (value === null || value === undefined) {
    return (
      <span className="text-sm italic text-[#6d685e] dark:text-[#aaa397]">
        Not provided
      </span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "secondary" : "outline"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "number") {
    return (
      <span className="font-mono text-sm font-semibold">
        {value.toLocaleString()}
      </span>
    );
  }

  if (typeof value === "string") {
    if (value.startsWith("artifact://")) {
      return (
        <div className="min-w-0 rounded-lg border border-[#d8d0c2] bg-white px-3 py-2 dark:border-[#38372f] dark:bg-[#20201c]">
          <div className="truncate text-sm font-medium">
            {artifactName(value)}
          </div>
          <div className="truncate font-mono text-[11px] text-[#6d685e] dark:text-[#aaa397]">
            {value}
          </div>
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-6 text-[#191915] dark:text-[#eee8dc]">
        {value}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="text-sm italic text-[#6d685e] dark:text-[#aaa397]">
          None
        </span>
      );
    }

    const primitiveOnly = value.every((item) =>
      ["string", "number", "boolean"].includes(typeof item),
    );
    if (primitiveOnly) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, index) => (
            <Badge
              variant="outline"
              className="max-w-full truncate"
              key={`${String(item)}-${index}`}
            >
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-2">
        {value.map((item, index) => (
          <div
            className="rounded-xl border border-[#d8d0c2]/80 bg-white/75 p-3 dark:border-[#38372f]/80 dark:bg-[#20201c]/75"
            key={index}
          >
            <StructuredValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (!isRecord(value)) {
    return <StructuredValue value={String(value)} depth={depth} />;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return (
      <span className="text-sm italic text-[#6d685e] dark:text-[#aaa397]">
        No details
      </span>
    );
  }
  if (depth > 2) return <TerminalBlock value={formatJson(value)} />;

  return (
    <div
      className={cn(
        "grid gap-2",
        depth === 0 && entries.length > 1 && "md:grid-cols-2",
      )}
    >
      {entries.map(([key, item]) => (
        <div
          className="min-w-0 rounded-xl border border-[#d8d0c2]/80 bg-white/75 p-3 dark:border-[#38372f]/80 dark:bg-[#20201c]/75"
          key={key}
        >
          <div className="mb-1.5 text-[11px] font-semibold uppercase text-[#6d685e] dark:text-[#aaa397]">
            {formatDetailLabel(key)}
          </div>
          <StructuredValue value={item} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function TerminalBlock({ value }: { value: string }) {
  return (
    <pre className="max-h-[360px] overflow-auto rounded-xl border border-[#26231d] bg-[#11110f] p-4 text-xs leading-5 text-[#eee8dc] shadow-inner">
      <code>{value}</code>
    </pre>
  );
}

function firstProcessTab(event: ProcessEvent) {
  if (hasDisplayValue(event.inputs)) return "input";
  if (hasDisplayValue(event.outputs) || event.code?.content) return "output";
  return "input";
}

function hasDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function processStatusIcon(status: ProcessEvent["status"]) {
  if (status === "done") return CheckIcon;
  if (status === "running") return LoaderCircleIcon;
  return Clock3Icon;
}

function processStatusLabel(status: ProcessEvent["status"]) {
  if (status === "done") return "Done";
  if (status === "running") return "Running";
  return "Waiting";
}

function formatDetailLabel(value: string) {
  return value
    .replace(/^pipeline\./, "")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function artifactName(ref: string) {
  const path = ref.replace(/^artifact:\/\//, "");
  return path.split("/").filter(Boolean).pop() || "Artifact";
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
