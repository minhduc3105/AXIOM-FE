import {
  BracesIcon,
  BookOpenIcon,
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
  skill_registry_tool: BookOpenIcon,
};

export function ToolKindIcon({
  kind,
  className,
}: {
  kind: ToolKind;
  className?: string;
}) {
  const ToolIcon = icons[kind] ?? WrenchIcon;
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-soft text-text-secondary",
        className,
      )}
      aria-hidden="true"
    >
      <ToolIcon className="size-5" />
    </span>
  );
}
