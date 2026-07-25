import {
  ArrowUpRightIcon,
  CalendarDaysIcon,
  UserRoundIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Report } from "../model/types";

type ReportCardProps = {
  report: Report;
  onOpen: (report: Report) => void;
};

export function ReportCard({ report, onOpen }: ReportCardProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="mb-5 h-auto w-full break-inside-avoid overflow-hidden whitespace-normal rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/90 p-0 text-left font-normal shadow-[0_18px_52px_rgba(24,24,18,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2456e8]/35 hover:bg-[#fffdf8]/95 hover:shadow-[0_24px_64px_rgba(24,24,18,0.12)] focus-visible:border-[#2456e8] focus-visible:ring-[#2456e8]/20 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/90 dark:hover:border-[#7895ff]/40 dark:hover:bg-[#1a1a17]/95 dark:focus-visible:border-[#7895ff] dark:focus-visible:ring-[#7895ff]/24"
      onClick={() => onOpen(report)}
      aria-label={`Open report: ${report.title}`}
    >
      <div className="grid gap-4 p-5">
        <div className="grid gap-2">
          <Badge
            variant="outline"
            className="h-6 w-fit rounded-full border-[#2456e8]/30 bg-[#edf2ff] px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]"
          >
            {report.category}
          </Badge>
          <h2 className="text-[19px] font-semibold leading-tight text-[#191915] dark:text-[#f4efe5]">
            {report.title}
          </h2>
          <p className="text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
            {report.excerpt}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {report.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="h-6 rounded-full border-[#d8d0c2]/80 bg-[#f4efe5]/65 px-2.5 text-[#4f4a42] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1]"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <Separator className="bg-[#d8d0c2]/78 dark:bg-white/10" />
        <div className="flex flex-col gap-3 text-xs text-[#6d685e] dark:text-[#aaa397] sm:flex-row sm:items-end sm:justify-between">
          <div className="grid min-w-0 gap-2">
            <span className="inline-flex items-center gap-2">
              <CalendarDaysIcon className="size-3.5" />
              {new Intl.DateTimeFormat("en", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date(report.createdAt))}
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <UserRoundIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {report.author} / {report.source}
              </span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2456e8] dark:text-[#9aafff]">
            Open report
            <ArrowUpRightIcon className="size-3.5" />
          </span>
        </div>
      </div>
    </Button>
  );
}
