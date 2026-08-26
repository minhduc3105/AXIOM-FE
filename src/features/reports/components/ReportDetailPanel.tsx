import { DownloadIcon, FileTextIcon, PanelRightCloseIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import type { AutoReportDetail } from "../api/reportsApi";

type ReportDetailPanelProps = {
  report: AutoReportDetail | null;
  onClose: () => void;
  onDownload: (reportId: string) => void;
};

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function ReportDetailPanel({ report, onClose, onDownload }: ReportDetailPanelProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  if (!report) return null;

  const body = <DetailBody report={report} onDownload={onDownload} />;

  return (
    <>
      <aside className="hidden md:block md:sticky md:top-5 md:self-start">
        <Card className="border-border/80 bg-card shadow-sm">
          <CardHeader className="flex-row items-start justify-between gap-3 border-b border-border/70">
            <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Inspector</p><CardTitle className="mt-1 truncate" title={report.title || report.report_id}>{report.title || "Report details"}</CardTitle><CardDescription className="mt-1">Generated {formatDate(report.completed_at || report.created_at)}</CardDescription></div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close report inspector"><PanelRightCloseIcon /></Button>
          </CardHeader>
          <CardContent className="grid gap-4 p-4">{body}</CardContent>
        </Card>
      </aside>
      <Sheet open={isMobile} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl md:hidden">
          <SheetHeader className="border-b border-border/70 pr-12">
            <SheetTitle>{report.title || "Report details"}</SheetTitle>
            <SheetDescription>Generated {formatDate(report.completed_at || report.created_at)}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 p-5">{body}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function DetailBody({ report, onDownload }: { report: AutoReportDetail; onDownload: (reportId: string) => void }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2"><Badge variant={report.status === "failed" ? "destructive" : report.status === "completed" ? "default" : "secondary"} className="rounded-full">{report.status}</Badge><span className="text-xs text-muted-foreground">{report.sources.length} source{report.sources.length === 1 ? "" : "s"}</span></div>
      <div className="grid gap-2 rounded-xl border border-border/70 bg-secondary/45 p-3">
        <p className="text-sm font-medium">{report.dashboard?.headline.title || report.title || "Report generation"}</p>
        <p className="text-sm leading-5 text-muted-foreground">{report.dashboard?.headline.summary || report.summary || "No narrative summary was returned."}</p>
      </div>
      <section className="grid gap-2" aria-labelledby="report-detail-sources"><h3 id="report-detail-sources" className="text-sm font-semibold">Source files</h3><ul className="grid gap-2">{report.sources.length ? report.sources.map((source) => <li key={`${source.role}-${source.source_id}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2 truncate"><FileTextIcon className="shrink-0 text-primary" aria-hidden="true" /><span className="truncate">{source.filename}</span></span><Badge variant="outline" className="shrink-0 rounded-full">{source.role}</Badge></li>) : <li className="text-sm text-muted-foreground">No source files recorded.</li>}</ul></section>
      {report.dashboard?.metrics.length ? <><Separator /><section className="grid gap-2" aria-labelledby="report-detail-metrics"><h3 id="report-detail-metrics" className="text-sm font-semibold">Extracted metrics</h3><ul className="grid gap-2">{report.dashboard.metrics.map((metric) => <li key={metric.id} className="flex items-baseline justify-between gap-3 text-sm"><span className="truncate text-muted-foreground">{metric.label}</span><span className="shrink-0 font-medium tabular-nums">{metric.value}{metric.unit ? ` ${metric.unit}` : ""}</span></li>)}</ul></section></> : null}
      {report.error_message && <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{report.error_message}</div>}
      <Button variant="outline" className="w-full" disabled={!report.report_available} onClick={() => onDownload(report.report_id)}><DownloadIcon data-icon="inline-start" />{report.report_available ? "Open PDF" : "PDF unavailable"}</Button>
    </>
  );
}
