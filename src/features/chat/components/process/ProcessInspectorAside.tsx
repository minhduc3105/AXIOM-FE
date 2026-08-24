import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/lib/utils";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  FolderOpenIcon,
  InfoIcon,
  TerminalSquareIcon,
  XIcon,
} from "lucide-react";
import {
  isToolProcessEvent,
  processStatusIcon,
  type ProcessInspectorItem,
  type ProcessStepSelectionHandler,
} from "./processEvents";
import { formatJson, hasDisplayValue, isRecord } from "./processValueUtils";
import {
  downloadWorkspaceFilesPackage,
  extractWorkspaceFiles,
  workspaceFilesPackageFilename,
  WorkspaceFileList,
} from "./workspaceFiles";

export function ProcessInspectorAside({
  items,
  conversationId,
  activeProcessEventKey,
  onProcessEventSelect,
  onClose,
}: {
  items: ProcessInspectorItem[];
  conversationId?: string | null;
  activeProcessEventKey?: string | null;
  onProcessEventSelect?: ProcessStepSelectionHandler;
  onClose?: () => void;
}) {
  const visibleItems = items.filter(
    (item) => item.event.status !== "waiting" && isToolProcessEvent(item.event),
  );
  const files = extractWorkspaceFiles(visibleItems.map((item) => item.event));
  const packageId = conversationId?.trim() || sessionIdFromItems(visibleItems);
  const packageFilename = workspaceFilesPackageFilename(packageId);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(activeProcessEventKey ? [activeProcessEventKey] : []),
  );
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "files">("analysis");
  const stepElements = useRef(new Map<string, HTMLLIElement>());
  const analysisScrollArea = useRef<HTMLDivElement | null>(null);
  const localSelectionKey = useRef<string | null>(null);

  useEffect(() => {
    if (!activeProcessEventKey) return;
    const shouldSkipScroll =
      localSelectionKey.current === activeProcessEventKey;
    localSelectionKey.current = null;
    setActiveTab("analysis");
    setExpandedKeys((current) => new Set(current).add(activeProcessEventKey));
    if (shouldSkipScroll) return;
    window.requestAnimationFrame(() =>
      scrollStepIntoInspector(activeProcessEventKey),
    );
  }, [activeProcessEventKey]);

  function scrollStepIntoInspector(key: string) {
    const row = stepElements.current.get(key);
    const viewport = analysisScrollArea.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!row || !viewport || typeof viewport.scrollTo !== "function") return;

    const viewportRect = viewport.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    viewport.scrollTo({
      top:
        viewport.scrollTop +
        rowRect.top -
        viewportRect.top -
        (viewport.clientHeight - rowRect.height) / 2,
      behavior: "smooth",
    });
  }

  function setStepElement(key: string, element: HTMLLIElement | null) {
    if (element) {
      stepElements.current.set(key, element);
      return;
    }
    stepElements.current.delete(key);
  }

  function handleStepToggle(item: ProcessInspectorItem) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(item.key)) {
        next.delete(item.key);
      } else {
        next.add(item.key);
      }
      return next;
    });
    localSelectionKey.current = item.key;
    onProcessEventSelect?.(item.event, item.key);
  }

  async function handleDownloadPackage() {
    if (files.length === 0 || downloading) return;
    setDownloading(true);
    try {
      await downloadWorkspaceFilesPackage(files, packageId);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-hidden bg-card">
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value === "files" ? "files" : "analysis")
        }
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <TabsList className="h-8 rounded-xl bg-[#ece7dd] p-1 dark:bg-[#292923]">
            <TabsTrigger value="analysis" className="px-2">
              <TerminalSquareIcon data-icon="inline-start" />
              Analysis Details
            </TabsTrigger>
            <TabsTrigger value="files" className="px-2">
              <FolderOpenIcon data-icon="inline-start" />
              Files
            </TabsTrigger>
          </TabsList>
          <div className="flex shrink-0 items-center gap-1">
            {activeTab === "files" && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Download all files as ${packageFilename}`}
                disabled={files.length === 0 || downloading}
                onClick={() => void handleDownloadPackage()}
              >
                <DownloadIcon />
              </Button>
            )}
            {onClose && (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Close Logs & Files"
                onClick={onClose}
              >
                <XIcon />
              </Button>
            )}
          </div>
        </div>
        <Separator />

        <TabsContent value="analysis" className="m-0 min-h-0">
          <ScrollArea ref={analysisScrollArea} className="h-full min-h-0 pr-2">
            <ol className="grid gap-2 p-3" aria-label="Analysis details">
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <ProcessInspectorStepRow
                    item={item}
                    selected={item.key === activeProcessEventKey}
                    expanded={expandedKeys.has(item.key)}
                    onToggle={() => handleStepToggle(item)}
                    rowRef={(element) => setStepElement(item.key, element)}
                    key={item.key}
                  />
                ))
              ) : (
                <li>
                  <EmptyInspectorDetail label="No analysis steps captured yet." />
                </li>
              )}
            </ol>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="m-0 min-h-0">
          <ScrollArea className="h-full min-h-0 pr-2">
            <div className="p-3">
              {files.length > 0 ? (
                <WorkspaceFileList files={files} compact />
              ) : (
                <EmptyInspectorDetail label="No sandbox files captured yet." />
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProcessInspectorStepRow({
  item,
  selected,
  expanded,
  onToggle,
  rowRef,
}: {
  item: ProcessInspectorItem;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  rowRef: (element: HTMLLIElement | null) => void;
}) {
  const Icon = processStatusIcon(item.event.status);

  return (
    <li ref={rowRef}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "group flex min-h-10 w-full items-center gap-2 rounded-t-xl border px-3 py-2 text-left transition-colors",
          selected || expanded
            ? "border-[#2456e8]/30 bg-white dark:border-[#7895ff]/30 dark:bg-[#20201c]"
            : "border-[#d8d0c2]/70 bg-white/60 hover:border-[#d8d0c2] hover:bg-white dark:border-[#38372f]/70 dark:bg-[#20201c]/50 dark:hover:bg-[#20201c]",
          !expanded && "rounded-b-xl",
        )}
        aria-current={selected ? "step" : undefined}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded-full border",
            item.event.status === "done"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-300"
              : item.event.status === "failed"
                ? "border-red-500 text-red-600 dark:text-red-300"
                : "border-[#c7bca9] text-[#6d685e] dark:border-[#4a4438] dark:text-[#aaa397]",
          )}
          aria-hidden="true"
        >
          <Icon
            className={cn(
              "size-2.5",
              item.event.status === "running" && "animate-spin",
            )}
          />
        </span>
        <strong className="min-w-0 flex-1 truncate text-sm font-medium text-[#191915] dark:text-[#eee8dc]">
          {item.event.label}
        </strong>
        <span className="flex shrink-0 items-center gap-1 text-xs text-[#9b9488] dark:text-[#aaa397]">
          {expanded ? "Hide" : "Show"}
          {expanded ? (
            <ChevronDownIcon className="size-3.5" />
          ) : (
            <ChevronRightIcon className="size-3.5" />
          )}
        </span>
      </Button>
      {expanded && (
        <div className="grid gap-3 rounded-b-xl border border-t-0 border-[#2456e8]/30 bg-white px-3 pb-3 pt-2 dark:border-[#7895ff]/30 dark:bg-[#20201c]">
          <RuntimeInlineSection
            label="Arguments:"
            value={argumentPreviewText(item.event.inputs)}
          />
          <RuntimeInlineSection
            label="Result:"
            value={resultPreviewText(item.event.outputs)}
          />
        </div>
      )}
    </li>
  );
}

function RuntimeInlineSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <section className="grid min-w-0 gap-1.5">
      <h4 className="text-xs font-medium text-[#6d685e] dark:text-[#aaa397]">
        {label}
      </h4>
      <pre className="max-h-[220px] min-h-[96px] min-w-0 overflow-auto rounded-lg bg-[#f4f4f2] p-3 text-xs leading-5 text-[#191915] dark:bg-[#11110f] dark:text-[#eee8dc]">
        <code>{value || "No data captured."}</code>
      </pre>
    </section>
  );
}

function argumentPreviewText(value: unknown) {
  if (!hasDisplayValue(value)) return "";
  return typeof value === "string" ? value : formatJson(value);
}

function resultPreviewText(value: unknown): string {
  if (!hasDisplayValue(value)) return "";
  const streamValue = streamPreviewText(value);
  if (streamValue) return streamValue;
  if (!isRecord(value)) return argumentPreviewText(value);

  if (hasDisplayValue(value.result)) return resultPreviewText(value.result);
  if (hasDisplayValue(value.output)) return resultPreviewText(value.output);
  return formatJson(value);
}

function streamPreviewText(value: unknown): string {
  if (!isRecord(value)) return "";
  for (const key of ["stderr", "stdout"] as const) {
    if (hasDisplayValue(value[key])) return argumentPreviewText(value[key]);
  }
  return "";
}

function sessionIdFromItems(items: ProcessInspectorItem[]) {
  for (const item of items) {
    const sessionId = firstSessionId(
      item.event.inputs,
      item.event.outputs,
      item.event.details,
    );
    if (sessionId) return sessionId;
  }
  return "session";
}

function firstSessionId(...values: unknown[]): string {
  for (const value of values) {
    const sessionId = sessionIdFromValue(value);
    if (sessionId) return sessionId;
  }
  return "";
}

function sessionIdFromValue(value: unknown): string {
  if (!isRecord(value)) return "";
  const direct = value.session_id ?? value.sessionId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  for (const item of Object.values(value)) {
    const nested = sessionIdFromValue(item);
    if (nested) return nested;
  }
  return "";
}

function EmptyInspectorDetail({ label }: { label: string }) {
  return (
    <Alert className="min-h-[180px] items-center justify-center border-dashed text-center">
      <InfoIcon />
      <AlertDescription>{label}</AlertDescription>
    </Alert>
  );
}
