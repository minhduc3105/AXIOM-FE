import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/lib/utils";
import {
  ChevronRightIcon,
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
import { extractWorkspaceFiles, WorkspaceFileList } from "./workspaceFiles";

export function ProcessInspectorAside({
  items,
  activeProcessEventKey,
  onProcessEventSelect,
  onClose,
}: {
  items: ProcessInspectorItem[];
  activeProcessEventKey?: string | null;
  onProcessEventSelect?: ProcessStepSelectionHandler;
  onClose?: () => void;
}) {
  const visibleItems = items.filter(
    (item) => item.event.status !== "waiting" && isToolProcessEvent(item.event),
  );
  const files = extractWorkspaceFiles(visibleItems.map((item) => item.event));

  return (
    <div className="flex h-full min-h-[420px] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d8d0c2]/80 bg-[#fffdf8]/75 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/65">
      <Tabs defaultValue="analysis" className="min-h-0 flex-1 gap-0">
        <div className="flex items-center justify-between gap-2 border-b border-[#d8d0c2]/80 px-3 py-2 dark:border-[#38372f]/80">
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

        <TabsContent value="analysis" className="m-0 min-h-0">
          <ScrollArea className="h-full min-h-0 pr-2">
            <ol className="grid gap-2 p-3" aria-label="Analysis details">
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <ProcessInspectorStepRow
                    item={item}
                    selected={item.key === activeProcessEventKey}
                    onSelect={() =>
                      onProcessEventSelect?.(item.event, item.key)
                    }
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
  onSelect,
}: {
  item: ProcessInspectorItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = processStatusIcon(item.event.status);

  return (
    <li>
      <button
        type="button"
        className={cn(
          "group flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
          selected
            ? "border-[#2456e8]/30 bg-white dark:border-[#7895ff]/30 dark:bg-[#20201c]"
            : "border-[#d8d0c2]/70 bg-white/60 hover:border-[#d8d0c2] hover:bg-white dark:border-[#38372f]/70 dark:bg-[#20201c]/50 dark:hover:bg-[#20201c]",
        )}
        aria-current={selected ? "step" : undefined}
        onClick={onSelect}
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
          Show
          <ChevronRightIcon className="size-3.5" />
        </span>
      </button>
    </li>
  );
}
function EmptyInspectorDetail({ label }: { label: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center gap-2 rounded-xl border border-dashed border-[#d8d0c2] px-4 py-6 text-sm text-[#6d685e] dark:border-[#38372f] dark:text-[#aaa397]">
      <InfoIcon className="size-4" />
      <span>{label}</span>
    </div>
  );
}
