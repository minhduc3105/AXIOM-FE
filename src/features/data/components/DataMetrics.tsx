import { CheckIcon, DatabaseIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type {
  DataHealthFilter,
  DataHealthStatus,
} from "../model/types";
import { dataStatusPresentation } from "./StatusBadge";

type DataMetricsProps = {
  loading: boolean;
  disabled: boolean;
  activeFilter: DataHealthFilter | null;
  total: number;
  ready: number;
  processing: number;
  failed: number;
  totalSize: string;
  onFilterChange: (filter: DataHealthFilter) => void;
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
  disabled,
  activeFilter,
  total,
  ready,
  processing,
  failed,
  totalSize,
  onFilterChange,
}: DataMetricsProps) {
  const values: Record<DataHealthFilter, number> = {
    all: total,
    success: ready,
    processing,
    failed,
  };

  return (
    <section
      className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      aria-label="Data health summary"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const selected = activeFilter === metric.key;
        const description =
          metric.key === "all"
            ? `${totalSize} across this workspace`
            : metric.description;

        return (
          <button
            key={metric.key}
            type="button"
            className={cn(
              "relative flex min-h-36 w-full items-start justify-between gap-2 overflow-hidden rounded-lg border bg-card p-3 text-left text-card-foreground transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 sm:min-h-32 sm:gap-4 sm:p-4",
              selected &&
                "border-ring bg-accent/50 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-full before:bg-primary",
            )}
            onClick={() => onFilterChange(metric.key)}
            disabled={disabled}
            aria-pressed={selected}
            aria-controls="data-file-inventory"
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

            <span className="flex shrink-0 flex-col items-end gap-3">
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-md",
                  metric.iconClassName,
                )}
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium text-foreground",
                  !selected && "invisible",
                )}
                aria-hidden={!selected}
              >
                <CheckIcon className="size-3.5" />
                <span className="hidden sm:inline">Active</span>
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
