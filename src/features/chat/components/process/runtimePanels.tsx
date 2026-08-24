import { useEffect, useRef, useState } from "react";
import type { ProcessEvent } from "../../model/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { Code2Icon, InfoIcon } from "lucide-react";
import { isToolProcessEvent } from "./processEvents";
import {
  artifactName,
  formatDetailLabel,
  formatJson,
  hasDisplayValue,
  isRecord,
  stringFromUnknown,
} from "./processValueUtils";

export function RuntimeInputPanel({ event }: { event: ProcessEvent }) {
  const code = event.code;

  if (code?.content && isExecutionCodeEvent(event)) {
    return (
      <div className="h-full min-h-0 w-full">
        <TerminalBlock value={code.content} fill />
      </div>
    );
  }

  return (
    <RuntimeValuePanel
      value={removeSourceCodeInput(event.inputs)}
      emptyLabel="No structured input captured for this step."
    />
  );
}

export function RuntimeOutputPanel({ event }: { event: ProcessEvent }) {
  const code = event.code;
  const executionOutput = runtimeStreamOutput(event.outputs);

  if (code?.content && !isExecutionCodeEvent(event)) {
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

  if (isExecutionCodeEvent(event)) {
    if (!executionOutput) {
      return (
        <EmptyRuntimeDetail label="No stdout or stderr captured for this step." />
      );
    }

    return (
      <LabeledTerminalBlock
        label={executionOutput.label}
        value={executionOutput.value}
        fill
      />
    );
  }

  if (isToolProcessEvent(event) && !isExecutionCodeEvent(event)) {
    return (
      <ToolOutputPanel
        value={event.outputs}
        emptyLabel="No structured output captured for this step."
      />
    );
  }

  return (
    <RuntimeValuePanel
      value={event.outputs}
      emptyLabel="No structured output captured for this step."
    />
  );
}

function ToolOutputPanel({
  value,
  emptyLabel,
}: {
  value: unknown;
  emptyLabel: string;
}) {
  if (!hasDisplayValue(value)) return <EmptyRuntimeDetail label={emptyLabel} />;

  const streamOutput = runtimeStreamOutput(value);
  if (streamOutput) {
    return (
      <LabeledTerminalBlock
        label={streamOutput.label}
        value={streamOutput.value}
        fill
      />
    );
  }

  const normalized = normalizeToolOutput(value);
  const sections = toolOutputSections(normalized.result);
  const message =
    stringFromUnknown(normalized.resultRecord?.message) ||
    stringFromUnknown(normalized.resultRecord?.error) ||
    stringFromUnknown(normalized.record?.message) ||
    stringFromUnknown(normalized.record?.error);

  return (
    <ScrollArea className="h-full min-h-0 w-full min-w-0 pr-3">
      <div className="grid min-w-0 gap-3">
        {message && (
          <div className="rounded-xl border border-[#d8d0c2]/80 bg-white/75 p-3 dark:border-[#38372f]/80 dark:bg-[#20201c]/75">
            <div className="mb-1.5 text-[11px] font-semibold uppercase text-[#6d685e] dark:text-[#aaa397]">
              Message
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {message}
            </p>
          </div>
        )}

        {sections.length > 0 ? (
          <div className="grid gap-3">
            {sections.map((section) => (
              <ToolOutputSection section={section} key={section.key} />
            ))}
          </div>
        ) : (
          <StructuredValue value={normalized.result} />
        )}

        <details className="rounded-xl border border-[#d8d0c2]/80 bg-white/55 p-3 dark:border-[#38372f]/80 dark:bg-[#20201c]/55">
          <summary className="cursor-pointer text-xs font-semibold uppercase text-[#6d685e] dark:text-[#aaa397]">
            Raw JSON
          </summary>
          <div className="mt-3">
            <TerminalBlock value={formatJson(value)} />
          </div>
        </details>
      </div>
    </ScrollArea>
  );
}

type NormalizedToolOutput = {
  record: Record<string, unknown> | null;
  result: unknown;
  resultRecord: Record<string, unknown> | null;
  method: string;
  provider: string;
  status: string;
};

type ToolOutputSectionData = {
  key: string;
  title: string;
  value: unknown;
};

const preferredToolSectionKeys = [
  "document",
  "content_summary",
  "processing_run",
  "matches",
  "contents",
  "chunks",
  "stdout",
  "stderr",
];

function normalizeToolOutput(value: unknown): NormalizedToolOutput {
  const record = isRecord(value) ? value : null;
  const wrappedResult =
    record && "result" in record && hasDisplayValue(record.result)
      ? record.result
      : value;
  const wrappedResultRecord = isRecord(wrappedResult) ? wrappedResult : null;
  const actualResult =
    wrappedResultRecord &&
    "result" in wrappedResultRecord &&
    hasDisplayValue(wrappedResultRecord.result)
      ? wrappedResultRecord.result
      : wrappedResult;
  const resultRecord = isRecord(actualResult) ? actualResult : null;

  return {
    record,
    result: actualResult,
    resultRecord,
    method:
      stringFromUnknown(wrappedResultRecord?.method) ||
      stringFromUnknown(resultRecord?.method) ||
      stringFromUnknown(record?.method),
    provider:
      stringFromUnknown(record?.provider) ||
      stringFromUnknown(wrappedResultRecord?.provider) ||
      stringFromUnknown(resultRecord?.provider),
    status:
      stringFromUnknown(record?.status) ||
      stringFromUnknown(wrappedResultRecord?.status) ||
      stringFromUnknown(resultRecord?.status),
  };
}

function toolOutputSections(value: unknown): ToolOutputSectionData[] {
  if (!isRecord(value)) return [];
  const entries = Object.entries(value).filter(([, item]) =>
    hasDisplayValue(item),
  );
  const emitted = new Set<string>();
  const sections: ToolOutputSectionData[] = [];

  for (const key of preferredToolSectionKeys) {
    if (hasDisplayValue(value[key])) {
      sections.push({ key, title: formatDetailLabel(key), value: value[key] });
      emitted.add(key);
    }
  }

  const facts = Object.fromEntries(
    entries.filter(
      ([key, item]) =>
        !emitted.has(key) &&
        !["error", "message", "method", "provider", "status"].includes(key) &&
        isCompactRuntimeValue(item),
    ),
  );
  if (Object.keys(facts).length > 0) {
    sections.unshift({ key: "__facts", title: "Summary", value: facts });
  }

  for (const [key, item] of entries) {
    if (
      emitted.has(key) ||
      key in facts ||
      ["error", "message", "method", "provider", "status"].includes(key)
    )
      continue;
    sections.push({ key, title: formatDetailLabel(key), value: item });
  }

  return sections;
}

function OutputFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#d8d0c2]/80 bg-white/75 p-3 dark:border-[#38372f]/80 dark:bg-[#20201c]/75">
      <div className="mb-1.5 text-[11px] font-semibold uppercase text-[#6d685e] dark:text-[#aaa397]">
        {label}
      </div>
      <div className="truncate text-sm font-medium text-[#191915] dark:text-[#eee8dc]">
        {value}
      </div>
    </div>
  );
}

function ToolOutputSection({ section }: { section: ToolOutputSectionData }) {
  const value = section.value;
  const arrayValue = Array.isArray(value) ? value : null;

  return (
    <section className="min-w-0 rounded-xl border border-[#d8d0c2]/80 bg-white/75 p-3 dark:border-[#38372f]/80 dark:bg-[#20201c]/75">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <h4 className="truncate text-[11px] font-semibold uppercase text-[#6d685e] dark:text-[#aaa397]">
          {section.title}
        </h4>
        {arrayValue && (
          <Badge variant="outline" className="shrink-0">
            {arrayValue.length}
          </Badge>
        )}
      </div>
      {arrayValue ? (
        <ToolArrayPreview value={arrayValue} />
      ) : isRecord(value) ? (
        <ToolRecordPreview value={value} />
      ) : typeof value === "string" && value.length > 260 ? (
        <TextPreview value={value} />
      ) : (
        <StructuredValue value={value} />
      )}
    </section>
  );
}

function ToolArrayPreview({ value }: { value: unknown[] }) {
  if (value.length === 0) {
    return (
      <span className="text-sm italic text-[#6d685e] dark:text-[#aaa397]">
        None
      </span>
    );
  }

  const visibleItems = value.slice(0, 5);
  return (
    <div className="grid min-w-0 gap-2">
      {visibleItems.map((item, index) => (
        <div
          className="min-w-0 rounded-lg border border-[#d8d0c2]/70 bg-[#fffdf8]/80 p-2.5 dark:border-[#38372f]/70 dark:bg-[#1a1a17]/80"
          key={index}
        >
          {isRecord(item) ? (
            <ToolRecordPreview value={item} compact />
          ) : (
            <StructuredValue value={item} />
          )}
        </div>
      ))}
      {value.length > visibleItems.length && (
        <div className="text-xs text-[#6d685e] dark:text-[#aaa397]">
          {value.length - visibleItems.length} more item
          {value.length - visibleItems.length === 1 ? "" : "s"} in raw JSON.
        </div>
      )}
    </div>
  );
}

function ToolRecordPreview({
  value,
  compact = false,
}: {
  value: Record<string, unknown>;
  compact?: boolean;
}) {
  const text =
    stringFromUnknown(value.text) ||
    stringFromUnknown(value.content) ||
    stringFromUnknown(value.summary) ||
    stringFromUnknown(value.markdown) ||
    stringFromUnknown(value.message);
  const entries = Object.entries(value).filter(
    ([key, item]) => hasDisplayValue(item) && item !== text && key !== "text",
  );
  const facts = entries.filter(([, item]) => isCompactRuntimeValue(item));
  const nested = entries.filter(([, item]) => !isCompactRuntimeValue(item));

  return (
    <div className="grid min-w-0 gap-2">
      {text && <TextPreview value={text} compact={compact} />}
      {facts.length > 0 && (
        <dl className="grid min-w-0 gap-2 sm:grid-cols-2">
          {facts.slice(0, compact ? 4 : 10).map(([key, item]) => (
            <div className="min-w-0" key={key}>
              <dt className="text-[11px] font-semibold uppercase text-[#6d685e] dark:text-[#aaa397]">
                {formatDetailLabel(key)}
              </dt>
              <dd className="mt-0.5 truncate text-sm text-[#191915] dark:text-[#eee8dc]">
                {compactRuntimeValue(item)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {nested.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1.5">
          {nested.map(([key, item]) => (
            <Badge variant="outline" className="max-w-full truncate" key={key}>
              {formatDetailLabel(key)}: {runtimeShapeLabel(item)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function TextPreview({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const limit = compact ? 320 : 900;
  const clipped = value.length > limit;
  return (
    <p className="max-w-full whitespace-pre-wrap break-words text-sm leading-6 text-[#191915] dark:text-[#eee8dc]">
      {clipped ? `${value.slice(0, limit).trimEnd()}...` : value}
    </p>
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

function isExecutionCodeEvent(event: ProcessEvent) {
  return Boolean(codeArtifactRef(event));
}

function codeArtifactRef(event: ProcessEvent) {
  const inputs = isRecord(event.inputs) ? event.inputs : null;
  const detailsInputs =
    isRecord(event.details) && isRecord(event.details.inputs)
      ? event.details.inputs
      : null;
  const value =
    stringFromUnknown(inputs?.code_artifact_ref) ||
    stringFromUnknown(inputs?.codeArtifactRef) ||
    stringFromUnknown(detailsInputs?.code_artifact_ref) ||
    stringFromUnknown(detailsInputs?.codeArtifactRef) ||
    event.artifactRefs?.find((ref) => /\/code\/.+\.py$/i.test(ref));
  return value || null;
}

function removeSourceCodeInput(value: unknown) {
  if (!isRecord(value) || !("source_code" in value || "sourceCode" in value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => key !== "source_code" && key !== "sourceCode",
    ),
  );
}

function runtimeStreamOutput(
  value: unknown,
): { label: "Stderr" | "Stdout"; value: string } | null {
  const record = isRecord(value) ? value : null;
  if (!record) return null;

  const stderr = firstNestedRuntimeValue(record, "stderr");
  if (hasDisplayValue(stderr)) {
    return { label: "Stderr", value: runtimeStreamValue(stderr) };
  }

  const stdout = firstNestedRuntimeValue(record, "stdout");
  if (hasDisplayValue(stdout)) {
    return { label: "Stdout", value: runtimeStreamValue(stdout) };
  }

  return null;
}

function firstNestedRuntimeValue(
  record: Record<string, unknown>,
  key: "stderr" | "stdout",
) {
  if (hasDisplayValue(record[key])) return record[key];
  const result = isRecord(record.result) ? record.result : null;
  if (result && hasDisplayValue(result[key])) return result[key];
  const output = isRecord(record.output) ? record.output : null;
  if (output && hasDisplayValue(output[key])) return output[key];
  return null;
}

function runtimeStreamValue(value: unknown) {
  return typeof value === "string" ? value : formatJson(value);
}

function LabeledTerminalBlock({
  label,
  value,
  fill = false,
}: {
  label: string;
  value: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-2",
        fill && "h-full min-h-0 grid-rows-[auto_minmax(0,1fr)]",
      )}
    >
      <div className="text-[11px] font-semibold uppercase text-[#6d685e] dark:text-[#aaa397]">
        {label}
      </div>
      <TerminalBlock value={value} fill={fill} />
    </div>
  );
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

function TerminalBlock({
  value,
  fill = false,
}: {
  value: string;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-[#26231d] bg-[#11110f] shadow-inner",
        fill ? "h-full min-h-0" : "max-h-[360px] min-h-[180px]",
      )}
    >
      <CodeViewport value={value} />
    </div>
  );
}

function CodeViewport({ value }: { value: string }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [maxScrollLeft, setMaxScrollLeft] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function measure() {
      if (!viewport) return;
      setMaxScrollLeft(
        Math.max(0, viewport.scrollWidth - viewport.clientWidth),
      );
      setScrollLeft(viewport.scrollLeft);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [value]);

  function handleScroll() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setScrollLeft(viewport.scrollLeft);
  }

  function handleHorizontalScroll(value: string) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextScrollLeft = Number(value);
    viewport.scrollLeft = nextScrollLeft;
    setScrollLeft(nextScrollLeft);
  }

  return (
    <div className="grid h-full min-w-0 grid-rows-[minmax(0,1fr)_auto]">
      <div
        ref={viewportRef}
        className="min-w-0 overflow-auto"
        onScroll={handleScroll}
      >
        <div className="inline-block min-w-max">
          <pre className="p-4 text-xs leading-5 text-[#eee8dc]">
            <code>{value}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export function firstProcessTab(event: ProcessEvent) {
  if (hasDisplayValue(event.inputs)) return "input";
  if (hasDisplayValue(event.outputs) || event.code?.content) return "output";
  return "input";
}
function isCompactRuntimeValue(value: unknown) {
  if (value === null || value === undefined) return true;
  if (["boolean", "number"].includes(typeof value)) return true;
  return (
    typeof value === "string" && value.length <= 180 && !value.includes("\n")
  );
}

function compactRuntimeValue(value: unknown) {
  if (value === null || value === undefined || value === "")
    return "Not provided";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function runtimeShapeLabel(value: unknown) {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (isRecord(value)) {
    const size = Object.keys(value).length;
    return `${size} field${size === 1 ? "" : "s"}`;
  }
  if (typeof value === "string") return `${value.length} chars`;
  return typeof value;
}
