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
      className="group grid min-h-[228px] cursor-pointer grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-[#d8d0c2] bg-[#fffdf8]/92 shadow-[0_8px_24px_rgba(25,25,21,0.05)] outline-none transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#2456e8]/35 hover:shadow-[0_18px_42px_rgba(25,25,21,0.10)] focus-visible:border-[#2456e8]/55 focus-visible:ring-3 focus-visible:ring-[#2456e8]/18 dark:border-[#38372f] dark:bg-[#1a1a17]/92 dark:hover:border-[#7895ff]/38 dark:hover:shadow-[0_18px_42px_rgba(0,0,0,0.22)] dark:focus-visible:border-[#7895ff]/60 dark:focus-visible:ring-[#7895ff]/20"
      onClick={() => onOpen(tool.name)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(tool.name);
        }
      }}
    >
      <div className="flex min-w-0 items-start gap-3 px-4 pb-3 pt-4">
        <ToolKindIcon kind={tool.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h2 className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-5 text-[#191915] dark:text-[#f4efe5]">
              {displayName}
            </h2>
            <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-[#9b9488] transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2456e8] dark:text-[#777064] dark:group-hover:text-[#9aafff]" />
          </div>
          <code className="mt-1 block truncate text-[11px] text-[#777064] dark:text-[#aaa397]">
            {tool.name}
          </code>
        </div>
      </div>

      <div className="px-4 pb-4">
        <p className="line-clamp-3 text-[13px] leading-5 text-[#625d53] dark:text-[#c5bcaf]">
          {tool.description || "No description is available for this tool."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="h-6 rounded-md border-[#d8d0c2] bg-[#f4efe5]/70 px-2 text-[10px] font-medium text-[#625d53] dark:border-[#38372f] dark:bg-white/5 dark:text-[#c5bcaf]"
          >
            {formatToolKind(tool.kind)}
          </Badge>
          <span className="text-[11px] text-[#8a8377] dark:text-[#918a7f]">
            {tool.param_count} {tool.param_count === 1 ? "parameter" : "parameters"}
          </span>
        </div>
      </div>

      <footer className="flex min-h-12 items-center justify-between border-t border-[#e1dacc] bg-[#f8f3ea]/72 px-4 dark:border-[#38372f] dark:bg-white/[0.025]">
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
