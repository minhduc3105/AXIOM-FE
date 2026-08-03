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
    label: "All stored objects",
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
            className="group grid min-h-[126px] grid-cols-[1fr_auto] gap-4 overflow-hidden rounded-[22px] border border-[#d8d0c2]/78 bg-[#fffdf8]/84 p-4 shadow-[0_18px_48px_rgba(24,24,18,0.07)] backdrop-blur-xl transition-transform duration-500 ease-out hover:-translate-y-0.5 dark:border-[#38372f]/82 dark:bg-[#1a1a17]/86"
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
                {metric.key === "total" ? totalSize : "All data sources"}
              </p>
            </div>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-[12px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.38)] transition-transform duration-500 ease-out group-hover:scale-105",
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
