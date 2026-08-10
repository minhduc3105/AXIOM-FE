import type { ProcessEvent } from "../../model/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/lib/utils";
import { ChevronRightIcon, TerminalSquareIcon, XIcon } from "lucide-react";
import { processStatusLabel } from "./processEvents";
import { firstProcessTab, RuntimeInputPanel, RuntimeOutputPanel } from "./runtimePanels";

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
    <div className="flex h-full min-h-[420px] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d8d0c2]/80 bg-[#fffdf8]/75 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/65">
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
                className={cn(
                  event.status === "failed" &&
                    "border-red-200 text-red-700 dark:border-red-900/70 dark:text-red-300",
                )}
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
        </div>

        <div className="flex min-h-0 flex-1 p-4">
          <TabsContent value="input" className="m-0 min-h-0 flex-1">
            <RuntimeInputPanel event={event} />
          </TabsContent>
          <TabsContent value="output" className="m-0 min-h-0 flex-1">
            <RuntimeOutputPanel event={event} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}