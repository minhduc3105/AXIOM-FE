import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DatabaseIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

type DataMetricsProps = {
  loading: boolean;
  total: number;
  ready: number;
  processing: number;
  failed: number;
  totalSize: string;
};

const metrics = [
  {
    key: "total",
    label: "Total files",
    icon: DatabaseIcon,
    tone: "text-[#2456e8] bg-[#edf2ff] dark:bg-[#7895ff]/12 dark:text-[#9aafff]",
  },
  {
    key: "ready",
    label: "Ready",
    icon: CheckCircle2Icon,
    tone: "text-emerald-700 bg-emerald-50 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  {
    key: "processing",
    label: "Processing",
    icon: LoaderCircleIcon,
    tone: "text-amber-800 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-200",
  },
  {
    key: "failed",
    label: "Failed",
    icon: AlertTriangleIcon,
    tone: "text-rose-700 bg-rose-50 dark:bg-rose-400/10 dark:text-rose-300",
  },
] as const;

export function DataMetrics({
  loading,
  total,
  ready,
  processing,
  failed,
  totalSize,
}: DataMetricsProps) {
  const values = { total, ready, processing, failed };

  return (
    <section
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Data health summary"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article
            key={metric.key}
            className="grid min-h-[118px] grid-cols-[1fr_auto] gap-4 rounded-[8px] border border-[#d8d0c2] bg-[#fffdf8]/88 p-4 shadow-[0_10px_28px_rgba(19,18,14,0.045)] dark:border-[#38372f] dark:bg-[#1a1a17]/88"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#6d685e] dark:text-[#aaa397]">
                {metric.label}
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <strong className="mt-2 block text-2xl font-semibold tabular-nums text-[#191915] dark:text-[#f4efe5]">
                  {values[metric.key]}
                </strong>
              )}
              <p className="mt-1 truncate text-xs text-[#8a8377] dark:text-[#898378]">
                {metric.key === "total" ? totalSize : "Current inventory"}
              </p>
            </div>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-[7px]",
                metric.tone,
              )}
              aria-hidden="true"
            >
              <Icon className="size-4" />
            </span>
          </article>
        );
      })}
    </section>
  );
}
