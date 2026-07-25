import { DownloadIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { Report, ReportMetric } from "../model/types";
import { cn } from "@/shared/lib/utils";

type ReportDetailDialogProps = {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (report: Report) => void;
};

const metricToneClasses: Record<ReportMetric["tone"], string> = {
  positive:
    "border-[#bddcc8] bg-[#eff8f1] text-[#17643a] dark:border-[#315a3e] dark:bg-[#142419] dark:text-[#91d6a7]",
  warning:
    "border-[#e9d39c] bg-[#fff8e8] text-[#87560e] dark:border-[#5b4620] dark:bg-[#2c2415] dark:text-[#f1c56d]",
  neutral:
    "border-[#d8d0c2] bg-[#f4efe5] text-[#4f4a42] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1]",
};

export function ReportDetailDialog({
  report,
  open,
  onOpenChange,
  onDownload,
}: ReportDetailDialogProps) {
  const maxValue = report
    ? Math.max(...report.detail.chart.map((point) => point.value), 1)
    : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(860px,calc(100vh-32px))] overflow-hidden rounded-[8px] border border-[#d8d0c2] bg-[#fffdf8] p-0 text-[#191915] sm:max-w-[min(980px,calc(100vw-32px))] dark:border-[#38372f] dark:bg-[#1a1a17] dark:text-[#eee8dc]">
        {report && (
          <div className="flex max-h-[min(860px,calc(100vh-32px))] min-h-0 flex-col">
            <DialogHeader className="border-b border-[#d8d0c2] px-5 py-4 pr-14 dark:border-[#38372f]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-6 rounded-[7px] border-[#2456e8]/30 bg-[#edf2ff] text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]"
                >
                  {report.category}
                </Badge>
                <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                  {new Intl.DateTimeFormat("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }).format(new Date(report.createdAt))}
                  {" / "}
                  {report.author}
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <DialogTitle className="text-2xl font-semibold leading-tight">
                    {report.title}
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-3xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
                    {report.detail.headline}
                  </DialogDescription>
                </div>
                <Button
                  className="h-9 rounded-[7px] bg-[#2456e8] px-3 text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]"
                  onClick={() => onDownload(report)}
                >
                  <DownloadIcon data-icon="inline-start" />
                  Tải xuống Report
                </Button>
              </div>
            </DialogHeader>

            <div className="min-h-0 overflow-y-auto px-5 py-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <article className="grid gap-5">
                  <section className="grid gap-3 rounded-[8px] border border-[#d8d0c2] bg-[#fffaf1]/72 p-4 dark:border-[#38372f] dark:bg-white/5">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FileTextIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
                      Nội dung phân tích
                    </div>
                    <div className="grid gap-3 text-sm leading-7 text-[#4f4a42] dark:text-[#d5cec1]">
                      {report.detail.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[8px] border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#1a1a17]">
                    <h3 className="text-sm font-semibold">Bảng phát hiện chính</h3>
                    <div className="mt-3 overflow-hidden rounded-[8px] border border-[#d8d0c2] dark:border-[#38372f]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#f4efe5] hover:bg-[#f4efe5] dark:bg-white/5 dark:hover:bg-white/5">
                            <TableHead className="text-xs">Dimension</TableHead>
                            <TableHead className="text-xs">Finding</TableHead>
                            <TableHead className="text-xs">Owner</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.detail.table.map((row) => (
                            <TableRow key={`${row.dimension}-${row.owner}`}>
                              <TableCell className="font-medium text-[#25241f] dark:text-[#eee8dc]">
                                {row.dimension}
                              </TableCell>
                              <TableCell className="min-w-[220px] whitespace-normal text-[#625d53] dark:text-[#c5bcaf]">
                                {row.finding}
                              </TableCell>
                              <TableCell className="text-[#625d53] dark:text-[#c5bcaf]">
                                {row.owner}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-[7px]">
                                  {row.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </section>
                </article>

                <aside className="grid gap-4 self-start">
                  <section className="grid gap-3 rounded-[8px] border border-[#d8d0c2] bg-[#fffaf1]/72 p-4 dark:border-[#38372f] dark:bg-white/5">
                    <h3 className="text-sm font-semibold">Chỉ số nổi bật</h3>
                    <div className="grid gap-2">
                      {report.detail.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className={cn(
                            "rounded-[8px] border p-3",
                            metricToneClasses[metric.tone],
                          )}
                        >
                          <div className="text-xs opacity-78">{metric.label}</div>
                          <div className="mt-1 flex items-end justify-between gap-3">
                            <strong className="text-xl leading-none">
                              {metric.value}
                            </strong>
                            <span className="text-xs font-semibold">
                              {metric.change}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[8px] border border-[#d8d0c2] bg-[#fffdf8] p-4 dark:border-[#38372f] dark:bg-[#1a1a17]">
                    <h3 className="text-sm font-semibold">Biểu đồ mẫu</h3>
                    <div className="mt-4 flex h-48 items-end gap-3 border-b border-l border-[#d8d0c2] px-3 pb-3 dark:border-[#38372f]">
                      {report.detail.chart.map((point) => (
                        <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                          <span
                            className="w-full rounded-t-[5px] bg-[#2456e8] dark:bg-[#7895ff]"
                            style={{ height: `${Math.max(12, (point.value / maxValue) * 100)}%` }}
                          />
                          <span className="w-full truncate text-center text-[11px] text-[#6d685e] dark:text-[#aaa397]">
                            {point.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
