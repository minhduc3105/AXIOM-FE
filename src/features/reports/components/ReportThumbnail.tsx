import type { Report } from "../model/types";
import { cn } from "@/shared/lib/utils";

const toneClasses = {
  blue: {
    frame: "bg-secondary",
    accent: "bg-chart-1",
    soft: "bg-accent",
  },
  green: {
    frame: "bg-muted",
    accent: "bg-chart-2",
    soft: "bg-accent",
  },
  amber: {
    frame: "bg-secondary",
    accent: "bg-chart-3",
    soft: "bg-muted",
  },
  slate: {
    frame: "bg-muted",
    accent: "bg-chart-4",
    soft: "bg-accent",
  },
  rose: {
    frame: "bg-secondary",
    accent: "bg-chart-5",
    soft: "bg-muted",
  },
  cyan: {
    frame: "bg-muted",
    accent: "bg-chart-2",
    soft: "bg-secondary",
  },
} as const;

export function ReportThumbnail({ report }: { report: Report }) {
  const tone = toneClasses[report.thumbnailTone];
  const values = report.detail.chart.slice(0, 5);
  const maxValue = Math.max(...values.map((point) => point.value), 1);

  return (
    <div
      className={cn(
        "relative h-38 overflow-hidden rounded-t-[8px] p-4",
        tone.frame,
      )}
      aria-hidden="true"
    >
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <div className="grid gap-1">
          <span className="h-2 w-24 rounded-full bg-foreground/18" />
          <span className="h-2 w-14 rounded-full bg-foreground/12" />
        </div>
        <span className={cn("size-9 rounded-[8px]", tone.accent)} />
      </div>
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-[1fr_76px] items-end gap-3">
        <div className="flex h-20 items-end gap-2 rounded-[8px] border border-border bg-card p-2 shadow-sm">
          {values.map((point) => (
            <span
              key={point.label}
              className={cn("w-full rounded-t-[4px]", tone.accent)}
              style={{
                height: `${Math.max(18, (point.value / maxValue) * 100)}%`,
              }}
            />
          ))}
        </div>
        <div className="grid gap-2">
          <span className={cn("h-8 rounded-[7px]", tone.soft)} />
          <span className="h-3 rounded-full bg-foreground/14" />
          <span className="h-3 w-10 rounded-full bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}
