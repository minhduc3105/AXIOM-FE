import { CheckCircle2Icon, CircleAlertIcon, Clock3Icon, DownloadIcon, FileTextIcon, LoaderCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type { AutoReport } from "../api/reportsApi";

type ReportHistoryProps = {
  reports: AutoReport[];
  selectedReportId?: string | null;
  loading?: boolean;
  onSelect: (report: AutoReport) => void;
  onDownload: (reportId: string) => void;
};

const statusLabels: Record<AutoReport["status"], string> = {
  completed: "Ready",
  failed: "Failed",
  running: "Generating",
  skipped: "Skipped",
};

const statusVariants: Record<AutoReport["status"], "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  failed: "destructive",
  running: "secondary",
  skipped: "outline",
};

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function ReportHistory({ reports, selectedReportId, loading = false, onSelect, onDownload }: ReportHistoryProps) {
  return (
    <Card className="border-border/80 bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/70">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Timeline</p>
          <CardTitle className="mt-1">Recent reports</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">{reports.length} run{reports.length === 1 ? "" : "s"}</span>
      </CardHeader>
      <CardContent className="grid gap-2 p-3 sm:p-4">
        {loading && !reports.length ? (
          Array.from({ length: 3 }, (_, index) => <HistorySkeleton key={index} />)
        ) : !reports.length ? (
          <Empty className="min-h-56">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Clock3Icon aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>No reports yet</EmptyTitle>
              <EmptyDescription>Generate a report after adding a workspace file.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          reports.map((report) => {
            const isSelected = report.report_id === selectedReportId;
            const StatusIcon = report.status === "completed" ? CheckCircle2Icon : report.status === "failed" ? CircleAlertIcon : report.status === "running" ? LoaderCircleIcon : Clock3Icon;
            return (
              <div key={report.report_id} className={cn("flex flex-col gap-3 rounded-xl border px-3 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between", isSelected ? "border-primary/45 bg-primary/5" : "border-border/70 bg-background/40")}>
                <button type="button" className="min-w-0 text-left" onClick={() => onSelect(report)}>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <StatusIcon className={report.status === "running" ? "animate-spin" : "text-primary"} aria-hidden="true" />
                    <span className="truncate">{report.title || "Report generation"}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <FileTextIcon aria-hidden="true" />
                    <span className="truncate">{report.primary_source?.filename || "Waiting for newest file"}</span>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0">{formatDate(report.completed_at || report.created_at)}</span>
                  </span>
                </button>
                <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                  <Badge variant={statusVariants[report.status]} className="rounded-full">{statusLabels[report.status]}</Badge>
                  {report.report_available && <Button size="sm" variant="outline" onClick={() => onDownload(report.report_id)}><DownloadIcon data-icon="inline-start" />PDF</Button>}
                </div>
              </div>
            );
          })
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
