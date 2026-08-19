import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import type { DataHealthStatus } from "../model/types";

export const dataStatusPresentation = {
  success: {
    label: "Ready",
    description: "Available for use",
    icon: CheckCircle2Icon,
    iconClassName: "bg-status-success/10 text-status-success",
    badgeClassName:
      "border-status-success/25 bg-status-success/10 text-status-success",
  },
  processing: {
    label: "Processing",
    description: "Parsing or indexing",
    icon: LoaderCircleIcon,
    iconClassName: "bg-info/10 text-info",
    badgeClassName: "border-info/25 bg-info/10 text-info",
  },
  failed: {
    label: "Failed",
    description: "Needs review or retry",
    icon: AlertTriangleIcon,
    iconClassName: "bg-destructive/10 text-destructive",
    badgeClassName:
      "border-destructive/25 bg-destructive/10 text-destructive",
  },
} satisfies Record<
  DataHealthStatus,
  {
    label: string;
    description: string;
    icon: typeof CheckCircle2Icon;
    iconClassName: string;
    badgeClassName: string;
  }
>;

export function StatusBadge({ status }: { status: DataHealthStatus }) {
  const presentation = dataStatusPresentation[status];
  const Icon = presentation.icon;

  return (
    <Badge
      variant="outline"
      className={cn("justify-center", presentation.badgeClassName)}
    >
      <Icon
        data-icon="inline-start"
        className={
          status === "processing"
            ? "animate-spin motion-reduce:animate-none"
            : undefined
        }
      />
      {presentation.label}
    </Badge>
  );
}
