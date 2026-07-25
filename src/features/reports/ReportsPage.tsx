import { useMemo, useState } from "react";
import { DatabaseIcon, DownloadIcon, FileTextIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportCard } from "./components/ReportCard";
import { ReportDetailDialog } from "./components/ReportDetailDialog";
import { mockReports } from "./model/mockReports";
import type { Report } from "./model/types";

type ReportsPageProps = {
  onIngestion: () => void;
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

export function ReportsPage({ onIngestion }: ReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const reports = useMemo(() => mockReports, []);

  const totalTags = useMemo(
    () => new Set(reports.flatMap((report) => report.tags)).size,
    [reports],
  );

  const handleDownload = (report: Report) => {
    createReportDownload(report);
    toast.success("Report download mocked", {
      description: `${report.title} exported as CSV sample.`,
    });
  };

  return (
    <section
      className="min-h-screen w-full overflow-x-hidden px-5 pb-10 pt-8 sm:px-8 md:pt-10"
      aria-label="Tổng hợp Report"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-6">
        <header className="grid gap-5 rounded-[8px] border border-[#d8d0c2] bg-[#fffdf8]/88 p-4 shadow-[0_18px_54px_rgba(19,18,14,0.08)] backdrop-blur-xl dark:border-[#38372f] dark:bg-[#1a1a17]/88 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-6 rounded-[7px] border-[#2456e8]/30 bg-[#edf2ff] text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]"
                >
                  Report workspace
                </Badge>
                <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                  {reports.length} reports / {totalTags} tags indexed
                </span>
              </div>
              <h1 className="text-2xl font-semibold leading-tight text-[#191915] dark:text-[#f4efe5] sm:text-3xl">
                Tổng hợp Report
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
                Không gian theo dõi các báo cáo phân tích, vận hành, hệ thống
                và kiểm toán đã được tổng hợp từ workflow dữ liệu của AXIOM.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="h-10 justify-start rounded-[7px] border-[#d8d0c2] bg-[#fffdf8] px-3 text-[#25241f] hover:bg-[#f4efe5] dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#eee8dc]"
                onClick={onIngestion}
              >
                <DatabaseIcon data-icon="inline-start" />
                Data Ingest Setting
              </Button>
              <Button className="h-10 justify-start rounded-[7px] bg-[#2456e8] px-3 text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]">
                <FileTextIcon data-icon="inline-start" />
                Report
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] border border-[#d8d0c2] bg-[#f4efe5]/72 p-3 dark:border-[#38372f] dark:bg-white/5">
              <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                Latest report
              </span>
              <strong className="mt-1 block truncate text-sm">
                {reports[0]?.title}
              </strong>
            </div>
            <div className="rounded-[8px] border border-[#d8d0c2] bg-[#f4efe5]/72 p-3 dark:border-[#38372f] dark:bg-white/5">
              <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                Download format
              </span>
              <strong className="mt-1 flex items-center gap-2 text-sm">
                <DownloadIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
                Mock CSV export
              </strong>
            </div>
            <div className="rounded-[8px] border border-[#d8d0c2] bg-[#f4efe5]/72 p-3 dark:border-[#38372f] dark:bg-white/5">
              <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                Detail mode
              </span>
              <strong className="mt-1 block text-sm">
                Modal with charts and tables
              </strong>
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
