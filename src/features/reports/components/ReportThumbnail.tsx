import type { Report } from "../model/types";
import { cn } from "@/shared/lib/utils";

const toneClasses = {
  blue: {
    frame: "from-[#edf2ff] via-[#fffdf8] to-[#dbe6ff] dark:from-[#172036] dark:via-[#1a1a17] dark:to-[#14224a]",
    accent: "bg-[#2456e8]",
    soft: "bg-[#dbe6ff] dark:bg-[#26345f]",
  },
  green: {
    frame: "from-[#edf7ee] via-[#fffdf8] to-[#d7ecdd] dark:from-[#162319] dark:via-[#1a1a17] dark:to-[#173321]",
    accent: "bg-[#1f8a4c]",
    soft: "bg-[#d9efdf] dark:bg-[#254c31]",
  },
  amber: {
    frame: "from-[#fff3d7] via-[#fffdf8] to-[#f3dfb2] dark:from-[#2c2312] dark:via-[#1a1a17] dark:to-[#3a2b10]",
    accent: "bg-[#c27a12]",
    soft: "bg-[#f6e3b9] dark:bg-[#4a3718]",
  },
  slate: {
    frame: "from-[#eceff3] via-[#fffdf8] to-[#dfe3e8] dark:from-[#1a2028] dark:via-[#1a1a17] dark:to-[#25303b]",
    accent: "bg-[#536171]",
    soft: "bg-[#dfe5ec] dark:bg-[#34404d]",
  },
  rose: {
    frame: "from-[#fff0f1] via-[#fffdf8] to-[#f3d2d8] dark:from-[#311a20] dark:via-[#1a1a17] dark:to-[#431e28]",
    accent: "bg-[#cc425b]",
    soft: "bg-[#f4d8de] dark:bg-[#56303a]",
  },
  cyan: {
    frame: "from-[#e8f7f8] via-[#fffdf8] to-[#ccecef] dark:from-[#14272b] dark:via-[#1a1a17] dark:to-[#173940]",
    accent: "bg-[#178c99]",
    soft: "bg-[#d0eef1] dark:bg-[#254c52]",
  },
} as const;

export function ReportThumbnail({ report }: { report: Report }) {
  const tone = toneClasses[report.thumbnailTone];
  const values = report.detail.chart.slice(0, 5);
  const maxValue = Math.max(...values.map((point) => point.value), 1);

  return (
    <div
      className={cn(
        "relative h-38 overflow-hidden rounded-t-[8px] bg-gradient-to-br p-4",
        tone.frame,
      )}
      aria-hidden="true"
    >
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <div className="grid gap-1">
          <span className="h-2 w-24 rounded-full bg-[#191915]/18 dark:bg-white/18" />
          <span className="h-2 w-14 rounded-full bg-[#191915]/12 dark:bg-white/12" />
        </div>
        <span className={cn("size-9 rounded-[8px]", tone.accent)} />
      </div>
      <div className="absolute bottom-4 left-4 right-4 grid grid-cols-[1fr_76px] items-end gap-3">
        <div className="flex h-20 items-end gap-2 rounded-[8px] border border-white/75 bg-white/58 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/14">
          {values.map((point) => (
            <span
              key={point.label}
              className={cn("w-full rounded-t-[4px]", tone.accent)}
              style={{ height: `${Math.max(18, (point.value / maxValue) * 100)}%` }}
            />
          ))}
        </div>
        <div className="grid gap-2">
          <span className={cn("h-8 rounded-[7px]", tone.soft)} />
          <span className="h-3 rounded-full bg-[#191915]/14 dark:bg-white/14" />
          <span className="h-3 w-10 rounded-full bg-[#191915]/10 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}
