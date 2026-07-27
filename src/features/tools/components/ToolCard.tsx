import type { CSSProperties } from "react";
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  PowerIcon,
  PowerOffIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useToolsState } from "../model/ToolsProvider";
import { formatToolKind, formatToolName } from "../model/toolPresentation";
import type { ToolSummary } from "../model/types";
import { ToolKindIcon } from "./ToolKindIcon";

type ToolCardProps = {
  tool: ToolSummary;
  enabled?: boolean;
  onOpen: (toolName: string) => void;
};

export function ToolCard({ tool, enabled: enabledProp, onOpen }: ToolCardProps) {
  const { getToolRevision, isToolEnabled, isToolUpdating, setToolEnabled } =
    useToolsState();
  const enabled =
    enabledProp ?? isToolEnabled(tool.name, tool.kind, tool.enabled);
  const revision = getToolRevision(tool.name, tool.revision);
  const updating = isToolUpdating(tool.name);
  const canUpdate = typeof revision === "number";
  const displayName = formatToolName(tool.name);
  const transitionName = `tool-${tool.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open ${displayName}`}
      data-status={enabled ? "active" : "disabled"}
      style={{ viewTransitionName: transitionName } as CSSProperties}
      className={cn(
        "group relative grid min-h-[258px] cursor-pointer grid-rows-[auto_1fr_auto] overflow-hidden rounded-[22px] border bg-[#fffdf8]/90 outline-none backdrop-blur-xl transition-[transform,border-color,box-shadow,opacity,background-color] duration-300 animate-in fade-in slide-in-from-bottom-2 focus-visible:ring-3 focus-visible:ring-[#2456e8]/20 dark:bg-[#1a1a17]/90 dark:focus-visible:ring-[#7895ff]/24",
        enabled
          ? "border-[#2456e8]/45 shadow-[0_18px_48px_rgba(36,86,232,0.10)] hover:-translate-y-0.5 hover:border-[#2456e8]/65 hover:shadow-[0_22px_58px_rgba(36,86,232,0.15)] dark:border-[#7895ff]/42"
          : "border-[#d8d0c2]/80 opacity-78 grayscale-[0.18] shadow-[0_12px_36px_rgba(24,24,18,0.055)] hover:-translate-y-0.5 hover:border-[#b9b0a3] hover:opacity-100 hover:grayscale-0 dark:border-[#38372f]/80 dark:hover:border-[#565449]",
      )}
      onClick={() => onOpen(tool.name)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(tool.name);
        }
      }}
    >
      {enabled && (
        <div
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#2456e8] via-emerald-500 to-[#2456e8] dark:from-[#7895ff] dark:via-emerald-300 dark:to-[#7895ff]"
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 items-start gap-3 px-5 pb-3 pt-5">
        <ToolKindIcon
          kind={tool.kind}
          className={cn(
            "rounded-[15px] transition-colors",
            enabled &&
              "ring-2 ring-[#2456e8]/12 dark:ring-[#7895ff]/15",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="min-w-0 flex-1 break-words text-[17px] font-semibold leading-6 text-[#191915] dark:text-[#f4efe5]">
              {displayName}
            </h3>
            <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-[#9b9488] transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2456e8] dark:text-[#777064] dark:group-hover:text-[#9aafff]" />
          </div>
          <code className="mt-1 block truncate text-[11px] text-[#777064] dark:text-[#aaa397]">
            {tool.name}
          </code>
        </div>
      </div>

      <div className="px-5 pb-5">
        <p className="line-clamp-3 text-[13px] leading-5 text-[#625d53] dark:text-[#c5bcaf]">
          {tool.description || "No description is available for this tool."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="h-6 rounded-full border-[#d8d0c2] bg-[#f4efe5]/68 px-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#625d53] dark:border-[#49483f] dark:bg-white/5 dark:text-[#c5bcaf]"
          >
            {formatToolKind(tool.kind)}
          </Badge>
          {enabled && (
            <Badge className="h-6 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-semibold text-emerald-700 shadow-none dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
              Active
            </Badge>
          )}
          <span className="text-[11px] text-[#8a8377] dark:text-[#918a7f]">
            {tool.param_count} {tool.param_count === 1 ? "parameter" : "parameters"}
          </span>
        </div>
      </div>

      <footer
        className={cn(
          "flex min-h-16 items-center justify-between gap-3 border-t px-5",
          enabled
            ? "border-[#2456e8]/15 bg-[#edf2ff]/45 dark:border-[#7895ff]/14 dark:bg-[#7895ff]/[0.055]"
            : "border-[#d8d0c2]/78 bg-[#f4efe5]/55 dark:border-white/10 dark:bg-white/[0.035]",
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-[#777064] dark:text-[#aaa397]">
          {enabled ? (
            <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
          ) : (
            <PowerOffIcon className="size-3.5 shrink-0" />
          )}
          <span className="truncate">
            {updating ? "Updating status…" : enabled ? "Ready for workflows" : "Not in use"}
          </span>
        </span>
        <Button
          type="button"
          size="sm"
          variant={enabled ? "destructive" : "default"}
          aria-label={`${enabled ? "Disable" : "Enable"} ${displayName}`}
          aria-busy={updating || undefined}
          disabled={updating || !canUpdate}
          className={cn(
            "h-8 min-w-[88px] rounded-full px-3",
            !enabled &&
              "bg-[#2456e8] text-white shadow-[0_8px_20px_rgba(36,86,232,0.18)] hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]",
          )}
          onClick={(event) => {
            event.stopPropagation();
            if (updating || !canUpdate) return;
            setToolEnabled(tool.name, !enabled, revision);
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {updating ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : enabled ? (
            <PowerOffIcon />
          ) : (
            <PowerIcon />
          )}
          {updating ? "Updating" : enabled ? "Disable" : "Enable"}
        </Button>
      </footer>
    </article>
  );
}
