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
      className="mb-5 h-auto w-full break-inside-avoid overflow-hidden whitespace-normal rounded-[24px] border border-border bg-card p-0 text-left font-normal shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:border-ring focus-visible:ring-ring/20"
      onClick={() => onOpen(report)}
      aria-label={`Open report: ${report.title}`}
    >
      <div className="grid gap-4 p-5">
        <div className="grid gap-2">
          <Badge
            variant="outline"
            className="h-6 w-fit rounded-full border-primary/25 bg-primary/10 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary"
          >
            {report.category}
          </Badge>
          <h2 className="text-[19px] font-semibold leading-tight text-foreground">
            {report.title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {report.excerpt}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {report.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="h-6 rounded-full border-border bg-secondary px-2.5 text-secondary-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <Separator className="bg-border" />
        <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
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
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            Open report
            <ArrowUpRightIcon className="size-3.5" />
          </span>
        </div>
      </div>
    </Button>
  );
}
