import {
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type { AutoReport, AutoReportPagination } from "../api/reportsApi";

type ReportHistoryProps = {
  reports: AutoReport[];
  selectedReportId?: string | null;
  loading?: boolean;
  pagination?: AutoReportPagination | null;
  onSelect?: (report: AutoReport) => void;
  onDownload: (reportId: string) => void;
  onPageChange?: (page: number) => void;
};

const statusLabels: Record<AutoReport["status"], string> = {
  completed: "Ready",
  failed: "Failed",
  running: "Generating",
  skipped: "Skipped",
};

const statusVariants: Record<
  AutoReport["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  completed: "default",
  failed: "destructive",
  running: "secondary",
  skipped: "outline",
};

export function ReportHistory({
  reports,
  selectedReportId,
  loading = false,
  pagination = null,
  onSelect,
  onDownload,
  onPageChange,
}: ReportHistoryProps) {
  return (
    <Card className="border-border/80 bg-card shadow-sm gap-0">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/70">
        <div>
          <CardTitle className="mt-1">Recent reports</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 p-3 sm:p-4">
        {loading && !reports.length ? (
          Array.from({ length: 3 }, (_, index) => (
            <HistorySkeleton key={index} />
          ))
        ) : !reports.length ? (
          <Empty className="min-h-56">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Clock3Icon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No reports yet</EmptyTitle>
              <EmptyDescription>
                Generate a report after adding a workspace file.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          reports.map((report) => {
            const isSelected = report.report_id === selectedReportId;
            const title =
              report.signal?.title || report.title || "Report generation";
            const description = report.signal?.description || report.summary;
            const StatusIcon =
              report.status === "completed"
                ? CheckCircle2Icon
                : report.status === "failed"
                  ? CircleAlertIcon
                  : report.status === "running"
                    ? LoaderCircleIcon
                    : Clock3Icon;
            return (
              <div
                key={report.report_id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border px-3 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
                  isSelected
                    ? "border-primary/45 bg-primary/5"
                    : "border-border/70 bg-background/40",
                )}
              >
                <div
                  className="min-w-0 text-left"
                  onClick={() => onSelect?.(report)}
                  onKeyDown={(event) => {
                    if (
                      !onSelect ||
                      (event.key !== "Enter" && event.key !== " ")
                    ) {
                      return;
                    }
                    event.preventDefault();
                    onSelect(report);
                  }}
                  role={onSelect ? "button" : undefined}
                  tabIndex={onSelect ? 0 : undefined}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <StatusIcon
                      className={
                        report.status === "running"
                          ? "animate-spin"
                          : "text-primary"
                      }
                      aria-hidden="true"
                    />
                    <span className="truncate">{title}</span>
                  </span>
                  {description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                  <Badge
                    variant={statusVariants[report.status]}
                    className="rounded-full"
                  >
                    {statusLabels[report.status]}
                  </Badge>
                  {report.report_available && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownload(report.report_id)}
                    >
                      <DownloadIcon data-icon="inline-start" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {pagination && pagination.total_pages > 1 && onPageChange && (
          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Previous reports page"
                disabled={!pagination.has_previous || loading}
                onClick={() => onPageChange(pagination.page - 1)}
              >
                <ChevronLeftIcon aria-hidden="true" />
                Previous
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Next reports page"
                disabled={!pagination.has_next || loading}
                onClick={() => onPageChange(pagination.page + 1)}
              >
                Next
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistorySkeleton() {
  return (
    <div className="grid gap-2 rounded-xl border border-border/70 px-3 py-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
