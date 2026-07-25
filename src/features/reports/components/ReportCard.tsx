import { CalendarDaysIcon, UserRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ReportThumbnail } from "./ReportThumbnail";
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
      className="mb-4 h-auto w-full break-inside-avoid overflow-hidden whitespace-normal rounded-[8px] border border-[#d8d0c2] bg-[#fffdf8]/92 p-0 text-left font-normal shadow-[0_14px_36px_rgba(24,24,18,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2456e8]/40 hover:bg-[#fffdf8]/92 hover:shadow-[0_18px_46px_rgba(24,24,18,0.11)] focus-visible:border-[#2456e8] focus-visible:ring-[#2456e8]/20 dark:border-[#38372f] dark:bg-[#1a1a17]/92 dark:hover:border-[#7895ff]/42 dark:hover:bg-[#1a1a17]/92 dark:focus-visible:border-[#7895ff] dark:focus-visible:ring-[#7895ff]/24"
      onClick={() => onOpen(report)}
      aria-label={`Open report: ${report.title}`}
    >
      <ReportThumbnail report={report} />
      <div className="grid gap-4 p-4">
        <div className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2456e8] dark:text-[#9aafff]">
            {report.category}
          </div>
          <h2 className="text-[18px] font-semibold leading-tight text-[#191915] dark:text-[#f4efe5]">
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
              className="h-6 rounded-[7px] border-[#d8d0c2] bg-[#f4efe5]/65 text-[#4f4a42] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1]"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <Separator className="bg-[#d8d0c2]/78 dark:bg-white/10" />
        <div className="grid gap-2 text-xs text-[#6d685e] dark:text-[#aaa397]">
          <span className="inline-flex items-center gap-2">
            <CalendarDaysIcon className="size-3.5" />
            {new Intl.DateTimeFormat("vi-VN", {
              day: "2-digit",
              month: "2-digit",
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
      </div>
    </Button>
  );
}
