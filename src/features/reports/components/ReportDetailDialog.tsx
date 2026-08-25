import {
  BarChart3Icon,
  DownloadIcon,
  FileTextIcon,
  GaugeIcon,
  Table2Icon,
} from "lucide-react";
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
    "border-status-success/25 bg-status-success/10 text-status-success",
  warning:
    "border-status-warning/25 bg-status-warning/10 text-status-warning",
  neutral:
    "border-border bg-secondary text-secondary-foreground",
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
      <DialogContent className="max-h-[min(900px,calc(100vh-32px))] overflow-hidden rounded-[28px] border-border bg-card p-0 text-foreground shadow-xl sm:max-w-[min(1060px,calc(100vw-32px))]">
        {report && (
          <div className="flex max-h-[min(900px,calc(100vh-32px))] min-h-0 flex-col">
            <DialogHeader className="border-b border-border bg-secondary px-5 py-5 pr-14 sm:px-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-6 rounded-full border-primary/25 bg-primary/10 px-2.5 text-primary"
                >
                  {report.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en", {
                    day: "2-digit",
                    month: "short",
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
                  <DialogDescription className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {report.detail.headline}
                  </DialogDescription>
                </div>
                <Button
                  className="h-10 rounded-full px-4"
                  onClick={() => onDownload(report)}
                >
                  <DownloadIcon data-icon="inline-start" />
                  Download report
                </Button>
              </div>
            </DialogHeader>

            <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
                <article className="grid gap-5">
                  <section className="grid gap-3 rounded-[22px] border border-border bg-secondary p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FileTextIcon className="size-4 text-primary" />
                      Analysis narrative
                    </div>
                    <div className="grid gap-3 text-sm leading-7 text-secondary-foreground">
                      {report.detail.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[22px] border border-border bg-card p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Table2Icon className="size-4 text-primary" />
                      Key findings
                    </h3>
                    <div className="mt-3 overflow-hidden rounded-[16px] border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-secondary hover:bg-secondary">
                            <TableHead className="text-xs">Dimension</TableHead>
                            <TableHead className="text-xs">Finding</TableHead>
                            <TableHead className="text-xs">Owner</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.detail.table.map((row) => (
                            <TableRow key={`${row.dimension}-${row.owner}`}>
                              <TableCell className="font-medium text-foreground">
                                {row.dimension}
                              </TableCell>
                              <TableCell className="min-w-[220px] whitespace-normal text-muted-foreground">
                                {row.finding}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {row.owner}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="rounded-full px-2.5"
                                >
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
                  <section className="grid gap-3 rounded-[22px] border border-border bg-secondary p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <GaugeIcon className="size-4 text-primary" />
                      Highlighted metrics
                    </h3>
                    <div className="grid gap-2">
                      {report.detail.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className={cn(
                            "rounded-[16px] border p-3.5",
                            metricToneClasses[metric.tone],
                          )}
                        >
                          <div className="text-xs opacity-78">
                            {metric.label}
                          </div>
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

                  <section className="rounded-[22px] border border-border bg-card p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <BarChart3Icon className="size-4 text-primary" />
                      Sample chart
                    </h3>
                    <div className="mt-4 flex h-48 items-end gap-3 rounded-[16px] border border-border bg-secondary px-3 pb-3 pt-4">
                      {report.detail.chart.map((point) => (
                        <div
                          key={point.label}
                          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        >
                          <span
                            className="w-full rounded-t-[8px] bg-chart-1"
                            style={{
                              height: `${Math.max(12, (point.value / maxValue) * 100)}%`,
                            }}
                          />
                          <span className="w-full truncate text-center text-[11px] text-muted-foreground">
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
