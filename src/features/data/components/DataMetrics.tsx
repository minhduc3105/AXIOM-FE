import { DatabaseIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type {
  DataHealthFilter,
  DataHealthStatus,
} from "../model/types";
import { dataStatusPresentation } from "./StatusBadge";

type DataMetricsProps = {
  loading: boolean;
  total: number;
  ready: number;
  processing: number;
  failed: number;
  className?: string;
};

const metrics: Array<{
  key: DataHealthFilter;
  label: string;
  accessibleLabel: string;
  icon: typeof DatabaseIcon;
  iconClassName: string;
}> = [
  {
    key: "all",
    label: "All",
    accessibleLabel: "All files",
    icon: DatabaseIcon,
    iconClassName: "text-muted-foreground",
  },
  ...(["success", "processing", "failed"] as const).map(
    (status: DataHealthStatus) => ({
      key: status,
      label: dataStatusPresentation[status].label,
      accessibleLabel: `${dataStatusPresentation[status].label} files`,
      icon: dataStatusPresentation[status].icon,
      iconClassName:
        status === "success"
          ? "text-status-success"
          : status === "processing"
            ? "text-info"
            : "text-destructive",
    }),
  ),
];

export function DataMetrics({
  loading,
  total,
  ready,
  processing,
  failed,
  className,
}: DataMetricsProps) {
  const values: Record<DataHealthFilter, number> = {
    all: total,
    success: ready,
    processing,
    failed,
  };

  return (
    <ul
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
      aria-label="Workspace file status"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <li
            key={metric.key}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap",
            )}
            aria-label={`${metric.accessibleLabel}: ${values[metric.key]}`}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0",
                metric.iconClassName,
              )}
              aria-hidden="true"
            />
            <span>{metric.label}</span>
            {loading ? (
              <Skeleton className="h-3.5 w-5" />
            ) : (
              <strong className="font-semibold tabular-nums text-foreground">
                {values[metric.key]}
              </strong>
            )}
          </li>
        );
      })}
    </ul>
  );
}
