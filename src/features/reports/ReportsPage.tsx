import { useMemo, useState } from "react";
import {
  DatabaseIcon,
  DownloadIcon,
  FileTextIcon,
  LayersIcon,
  TagsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportCard } from "./components/ReportCard";
import { ReportDetailDialog } from "./components/ReportDetailDialog";
import { mockReports } from "./model/mockReports";
import type { Report } from "./model/types";

type ReportsPageProps = {
  onData: () => void;
};

function createReportDownload(report: Report) {
  const rows = [
    ["Title", report.title],
    ["Created at", report.createdAt],
    ["Author", report.author],
    ["Source", report.source],
    ["Tags", report.tags.join("; ")],
    ["Headline", report.detail.headline],
    [],
    ["Metric", "Value", "Change"],
    ...report.detail.metrics.map((metric) => [
      metric.label,
      metric.value,
      metric.change,
    ]),
    [],
    ["Dimension", "Finding", "Owner", "Status"],
    ...report.detail.table.map((row) => [
      row.dimension,
      row.finding,
      row.owner,
      row.status,
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.id}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ReportsPage({ onData }: ReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const reports = useMemo(() => mockReports, []);

  const totalTags = useMemo(
    () => new Set(reports.flatMap((report) => report.tags)).size,
    [reports],
  );

  const handleDownload = (report: Report) => {
    createReportDownload(report);
    toast.success("Report exported", {
      description: `${report.title} was exported as a CSV sample.`,
    });
  };

  return (
    <section
      className="relative min-h-screen w-full overflow-x-hidden px-5 pb-12 pt-20 sm:px-8 md:pt-10"
      aria-label="Reports workspace"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_78%_8%,rgba(36,86,232,0.12),transparent_34%),radial-gradient(circle_at_10%_38%,rgba(120,75,18,0.10),transparent_36%)] dark:bg-[radial-gradient(circle_at_78%_8%,rgba(120,149,255,0.12),transparent_34%)]"
        aria-hidden="true"
      />
      <div className="mx-auto grid w-full max-w-[1360px] gap-6">
        <header className="overflow-hidden rounded-[28px] border border-[#d8d0c2]/80 bg-[#fffdf8]/88 shadow-[0_24px_70px_rgba(24,24,18,0.09)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88">
          <div className="grid gap-6 p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full border-[#2456e8]/30 bg-[#edf2ff] px-2.5 text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]"
                  >
                    Report workspace
                  </Badge>
                  <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                    {reports.length} reports / {totalTags} indexed tags
                  </span>
                </div>
                <h1 className="text-3xl font-semibold leading-tight text-[#191915] dark:text-[#f4efe5] sm:text-4xl">
                  Intelligence reports
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
                  Review analytical, operational, system, and audit reports
                  generated from AXIOM data workflows.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  variant="outline"
                  className="h-10 justify-start rounded-full border-[#d8d0c2] bg-[#fffdf8]/72 px-4 text-[#25241f] hover:bg-[#f4efe5] dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#eee8dc]"
                  onClick={onData}
                >
                  <DatabaseIcon data-icon="inline-start" />
                  Data manage
                </Button>
                <Button className="h-10 justify-start rounded-full bg-[#2456e8] px-4 text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]">
                  <FileTextIcon data-icon="inline-start" />
                  Reports
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-[#d8d0c2]/80 bg-[#f4efe5]/72 p-4 dark:border-[#38372f] dark:bg-white/5">
                <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                  Latest report
                </span>
                <strong className="mt-2 flex min-w-0 items-center gap-2 text-sm">
                  <LayersIcon className="size-4 shrink-0 text-[#2456e8] dark:text-[#9aafff]" />
                  <span className="truncate">{reports[0]?.title}</span>
                </strong>
              </div>
              <div className="rounded-[18px] border border-[#d8d0c2]/80 bg-[#f4efe5]/72 p-4 dark:border-[#38372f] dark:bg-white/5">
                <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                  Download format
                </span>
                <strong className="mt-2 flex items-center gap-2 text-sm">
                  <DownloadIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
                  CSV sample export
                </strong>
              </div>
              <div className="rounded-[18px] border border-[#d8d0c2]/80 bg-[#f4efe5]/72 p-4 dark:border-[#38372f] dark:bg-white/5">
                <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                  Indexed tags
                </span>
                <strong className="mt-2 flex items-center gap-2 text-sm">
                  <TagsIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
                  {totalTags} topics available
                </strong>
              </div>
            </div>
          </div>
        </header>

        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpen={setSelectedReport}
            />
          ))}
        </div>
      </div>

      <ReportDetailDialog
        report={selectedReport}
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null);
        }}
        onDownload={handleDownload}
      />
    </section>
  );
}
