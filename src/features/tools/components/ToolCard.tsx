import { ArrowUpRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToolsState } from "../model/ToolsProvider";
import { formatToolKind, formatToolName } from "../model/toolPresentation";
import type { ToolSummary } from "../model/types";
import { ToolKindIcon } from "./ToolKindIcon";
import { ToolStatusSwitch } from "./ToolStatusSwitch";

type ToolCardProps = {
  tool: ToolSummary;
  onOpen: (toolName: string) => void;
};

export function ToolCard({ tool, onOpen }: ToolCardProps) {
  const { isToolEnabled, setToolEnabled } = useToolsState();
  const enabled = isToolEnabled(tool.name, tool.kind);
  const displayName = formatToolName(tool.name);

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open ${displayName}`}
      className="group grid min-h-[248px] cursor-pointer grid-rows-[auto_1fr_auto] overflow-hidden rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/90 shadow-[0_18px_52px_rgba(24,24,18,0.08)] outline-none backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2456e8]/35 hover:bg-[#fffdf8]/95 hover:shadow-[0_24px_64px_rgba(24,24,18,0.12)] focus-visible:border-[#2456e8] focus-visible:ring-3 focus-visible:ring-[#2456e8]/20 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/90 dark:hover:border-[#7895ff]/40 dark:hover:bg-[#1a1a17]/95 dark:focus-visible:border-[#7895ff] dark:focus-visible:ring-[#7895ff]/24"
      onClick={() => onOpen(tool.name)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(tool.name);
        }
      }}
    >
      <div className="flex min-w-0 items-start gap-3 px-5 pb-3 pt-5">
        <ToolKindIcon kind={tool.kind} className="rounded-[16px]" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h2 className="min-w-0 flex-1 break-words text-[17px] font-semibold leading-6 text-[#191915] dark:text-[#f4efe5]">
              {displayName}
            </h2>
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
            className="h-6 rounded-full border-[#2456e8]/24 bg-[#edf2ff]/70 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1237b4] dark:border-[#7895ff]/26 dark:bg-[#7895ff]/10 dark:text-[#bcc9ff]"
          >
            {formatToolKind(tool.kind)}
          </Badge>
          <span className="text-[11px] text-[#8a8377] dark:text-[#918a7f]">
            {tool.param_count}{" "}
            {tool.param_count === 1 ? "parameter" : "parameters"}
          </span>
        </div>
      </div>

      <footer className="flex min-h-14 items-center justify-between border-t border-[#d8d0c2]/78 bg-[#f4efe5]/55 px-5 dark:border-white/10 dark:bg-white/[0.035]">
        <span className="text-[11px] text-[#777064] dark:text-[#aaa397]">
          {tool.required_params.length > 0
            ? `${tool.required_params.length} required`
            : "No required inputs"}
        </span>
        <ToolStatusSwitch
          checked={enabled}
          label={displayName}
          onCheckedChange={(checked) => setToolEnabled(tool.name, checked)}
        />
      </footer>
    </article>
  );
}
