import {
  BracesIcon,
  DatabaseIcon,
  HardDriveDownloadIcon,
  WrenchIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { ToolKind } from "../model/types";

const icons = {
  builtin_tool: WrenchIcon,
  database_method: DatabaseIcon,
  datalake_action: HardDriveDownloadIcon,
  utility_method: BracesIcon,
};

const colors: Record<ToolKind, string> = {
  builtin_tool:
    "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
  database_method:
    "border-[#2456e8]/25 bg-[#edf2ff] text-[#1237b4] dark:border-[#7895ff]/25 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]",
  datalake_action:
    "border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
  utility_method:
    "border-zinc-300/80 bg-zinc-50 text-zinc-700 dark:border-zinc-400/20 dark:bg-zinc-400/10 dark:text-zinc-200",
};

export function ToolKindIcon({
  kind,
  className,
}: {
  kind: ToolKind;
  className?: string;
}) {
  const ToolIcon = icons[kind];
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg border",
        colors[kind],
        className,
      )}
      aria-hidden="true"
    >
      <ToolIcon className="size-5" />
    </span>
  );
}
