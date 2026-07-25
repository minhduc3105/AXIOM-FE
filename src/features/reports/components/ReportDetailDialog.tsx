import { useEffect, useState } from "react";
import {
  CalendarDaysIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";
import { downloadReport } from "../lib/downloadReport";
import type { Report } from "../model/types";

type ReportDetailDialogProps = {
  report: Report | null;
  onOpenChange: (open: boolean) => void;
};

const statusClasses = {
  "On track":
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  Watch:
    "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  "Action needed":
    "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
} as const;

export function ReportDetailDialog({
  report,
  onOpenChange,
}: ReportDetailDialogProps) {
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setDownloaded(false);
  }, [report?.id]);

  if (!report) return null;

  const handleDownload = () => {
    downloadReport(report);
    setDownloaded(true);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-20px)] w-[min(1120px,calc(100vw-20px))] max-w-none gap-0 overflow-hidden rounded-[8px] border border-[#cfc6b7] bg-[#fffdf8] p-0 shadow-[0_28px_90px_rgba(25,25,21,0.28)] ring-0 dark:border-[#403f36] dark:bg-[#161613] sm:max-w-none"
        showCloseButton
      >
        <div className="max-h-[calc(100dvh-20px)] overflow-y-auto">
          <DialogHeader className="border-b border-[#d8d0c2] px-5 py-5 pr-16 dark:border-[#38372f] sm:px-8 sm:py-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-6 rounded-full bg-[#2456e8] px-3 text-[10px] uppercase text-white dark:bg-[#7895ff] dark:text-[#10162c]">
                {report.category}
              </Badge>
              {report.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="h-6 rounded-full px-2.5 text-[10px]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <DialogTitle className="mt-4 max-w-4xl text-[34px] font-semibold leading-[0.98] tracking-normal sm:text-[48px] lg:text-[60px]">
              {report.title}
            </DialogTitle>
            <DialogDescription className="mt-4 max-w-3xl text-base leading-7 text-[#615b51] dark:text-[#b6afa2]">
              {report.excerpt}
            </DialogDescription>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#6d685e] dark:text-[#aaa397]">
                <span className="font-semibold text-[#191915] dark:text-[#eee8dc]">
                  {report.author} · {report.source}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDaysIcon className="size-3.5" />
                  {report.createdAt}
                </span>
              </div>
              <Button
                className="h-10 rounded-md bg-[#2456e8] px-4 text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]"
                type="button"
                onClick={handleDownload}
              >
                {downloaded ? (
                  <CheckIcon data-icon="inline-start" />
                ) : (
                  <DownloadIcon data-icon="inline-start" />
                )}
                {downloaded ? "Downloaded" : "Download report"}
              </Button>
            </div>
          </DialogHeader>

          <div className="grid gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.25fr)_320px] lg:gap-14 lg:py-12">
            <article className="min-w-0">
              <img
                src={report.image}
                alt={report.imageAlt}
                className="aspect-[16/8] w-full rounded-[6px] object-cover"
              />
              <p className="mt-8 border-l-2 border-[#2456e8] pl-5 text-xl font-medium leading-8 text-[#282721] dark:border-[#7895ff] dark:text-[#e8e1d5]">
                {report.lead}
              </p>

              {report.sections.map((section) => (
                <section className="mt-9" key={section.heading}>
                  <h3 className="text-xl font-semibold">{section.heading}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#615b51] dark:text-[#b6afa2]">
                    {section.body}
                  </p>
                </section>
              ))}

              <section className="mt-10">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#2456e8] dark:text-[#8da5ff]">
                      Comparative view
                    </span>
                    <h3 className="mt-1 text-xl font-semibold">
                      Performance by dimension
                    </h3>
                  </div>
                  <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                    Current vs previous
                  </span>
                </div>
                <div className="overflow-hidden rounded-[6px] border border-[#d8d0c2] dark:border-[#38372f]">
                  <Table>
                    <TableHeader className="bg-[#f0eadf] dark:bg-[#24241f]">
                      <TableRow>
                        <TableHead className="px-4">Dimension</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead className="px-4 text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.table.map((row) => (
                        <TableRow key={row.dimension}>
                          <TableCell className="px-4 font-medium">
                            {row.dimension}
                          </TableCell>
                          <TableCell>{row.current}</TableCell>
                          <TableCell className="text-[#6d685e] dark:text-[#aaa397]">
                            {row.previous}
                          </TableCell>
                          <TableCell className="px-4 text-right">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                statusClasses[row.status],
                              )}
                            >
                              {row.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </article>

            <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
              <div className="border-t-2 border-[#191915] pt-4 dark:border-[#eee8dc]">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="size-4 text-[#2456e8] dark:text-[#8da5ff]" />
                  <h3 className="text-sm font-semibold uppercase">
                    Key indicators
                  </h3>
                </div>
                <div className="mt-5 grid gap-6">
                  {report.metrics.map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                            {metric.label}
                          </span>
                          <div className="mt-1 text-3xl font-semibold">
                            {metric.displayValue}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {metric.change}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e4ddd1] dark:bg-[#303029]">
                        <div
                          className="h-full rounded-full bg-[#2456e8] dark:bg-[#7895ff]"
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t border-[#d8d0c2] pt-5 dark:border-[#38372f]">
                <p className="text-xs leading-5 text-[#6d685e] dark:text-[#aaa397]">
                  Generated from validated AXIOM evidence. Export includes the
                  executive summary, indicators, and comparison table.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 h-10 w-full rounded-md border-[#bdb4a6] bg-transparent"
                  type="button"
                  onClick={handleDownload}
                >
                  <DownloadIcon data-icon="inline-start" />
                  Download CSV
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
