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
      <div className="grid min-h-[300px] place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
        No process step selected.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[420px] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-muted-foreground">
            <TerminalSquareIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold leading-6 text-foreground">
                {event.label}
              </h3>
              <Badge
                variant={event.status === "done" ? "secondary" : "outline"}
                className={cn(
                  event.status === "done" && "border-status-success/25 bg-status-success/10 text-status-success",
                  event.status === "running" && "border-info/25 bg-info/10 text-info",
                  event.status === "failed" && "border-destructive/25 bg-destructive/10 text-destructive",
                )}
              >
                {processStatusLabel(event.status)}
              </Badge>
            </div>
            {event.detail && (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2">
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
