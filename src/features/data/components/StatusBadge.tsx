import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import type { DataHealthStatus } from "../model/types";

const statusPresentation = {
  success: {
    label: "Success",
    icon: CheckCircle2Icon,
    className:
      "border-emerald-600/20 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  processing: {
    label: "Processing",
    icon: LoaderCircleIcon,
    className:
      "border-amber-600/25 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
  },
  failed: {
    label: "Failed",
    icon: AlertTriangleIcon,
    className:
      "border-rose-600/20 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300",
  },
} satisfies Record<
  DataHealthStatus,
  {
    label: string;
    icon: typeof CheckCircle2Icon;
    className: string;
  }
>;

export function StatusBadge({ status }: { status: DataHealthStatus }) {
  const presentation = statusPresentation[status];
  const Icon = presentation.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 min-w-[104px] justify-center rounded-full px-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]",
        presentation.className,
      )}
    >
      <Icon
        data-icon="inline-start"
        className={status === "processing" ? "animate-spin" : undefined}
      />
      {presentation.label}
    </Badge>
  );
}
