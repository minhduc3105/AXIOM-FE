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
  totalSize: string;
};

const metrics: Array<{
  key: DataHealthFilter;
  label: string;
  description: string;
  icon: typeof DatabaseIcon;
  iconClassName: string;
}> = [
  {
    key: "all",
    label: "All files",
    description: "Stored in this workspace",
    icon: DatabaseIcon,
    iconClassName: "bg-muted text-foreground",
  },
  ...(["success", "processing", "failed"] as const).map(
    (status: DataHealthStatus) => ({
      key: status,
      ...dataStatusPresentation[status],
    }),
  ),
];

export function DataMetrics({
  loading,
  total,
  ready,
  processing,
  failed,
  totalSize,
}: DataMetricsProps) {
  const values: Record<DataHealthFilter, number> = {
    all: total,
    success: ready,
    processing,
    failed,
  };

  return (
    <section
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Data health summary"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const description =
          metric.key === "all"
            ? `${totalSize} across this workspace`
            : metric.description;

        return (
          <article
            key={metric.key}
            className={cn(
              "flex min-h-36 w-full items-start justify-between gap-2 overflow-hidden rounded-lg border bg-card p-3 text-left text-foreground sm:min-h-32 sm:gap-4 sm:p-4",
            )}
            aria-label={`${metric.label}: ${values[metric.key]}. ${description}`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">{metric.label}</span>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <strong className="mt-2 block text-2xl font-semibold tabular-nums">
                  {values[metric.key]}
                </strong>
              )}
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {description}
              </span>
            </span>

            <span className="flex shrink-0 flex-col items-end">
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-md",
                  metric.iconClassName,
                )}
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </span>
            </span>
          </article>
        );
      })}
    </section>
  );
}
