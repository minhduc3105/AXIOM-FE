import { useState } from "react";
import { ArrowRightIcon, DatabaseIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reports } from "./data/reports";
import { ReportCard } from "./components/ReportCard";
import { ReportDetailDialog } from "./components/ReportDetailDialog";
import type { Report } from "./model/types";

type ReportsPageProps = {
  onIngestion: () => void;
};

export function ReportsPage({ onIngestion }: ReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <div className="min-h-screen bg-[#f8f4eb]/82 dark:bg-[#11110f]/72">
      <header className="border-b border-[#d8d0c2] bg-[#fffdf8]/78 px-4 pb-8 pt-20 backdrop-blur-xl dark:border-[#38372f] dark:bg-[#151512]/78 sm:px-8 md:pt-10 lg:px-12">
        <div className="mx-auto max-w-[1460px]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-[#2456e8] dark:text-[#8da5ff]">
                AXIOM Intelligence Review
              </span>
              <h1 className="mt-3 text-[44px] font-semibold leading-[0.9] tracking-normal sm:text-[64px] lg:text-[80px]">
                Reports
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[#615b51] dark:text-[#b6afa2]">
                Analysis, operational findings, and system decisions grounded
                in reviewed evidence.
              </p>
            </div>

            <div
              className="inline-grid w-full grid-cols-2 gap-1 rounded-[8px] border border-[#cfc6b7] bg-[#eee7dc] p-1 dark:border-[#403f36] dark:bg-[#24241f] sm:w-auto"
              aria-label="Data workspace views"
            >
              <Button
                variant="ghost"
                className="h-10 min-w-0 justify-center rounded-[5px] px-3 text-[#615b51] hover:bg-[#fffdf8] dark:text-[#b6afa2] dark:hover:bg-white/8 sm:min-w-44"
                onClick={onIngestion}
              >
                <DatabaseIcon data-icon="inline-start" />
                Data ingest setting
              </Button>
              <Button
                className="h-10 min-w-0 justify-center rounded-[5px] bg-[#191915] px-3 text-[#fffdf8] hover:bg-[#2d2c26] dark:bg-[#eee8dc] dark:text-[#191915] dark:hover:bg-white sm:min-w-32"
                aria-current="page"
              >
                <FileTextIcon data-icon="inline-start" />
                Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1460px] px-4 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
        <div className="mb-7 flex items-end justify-between gap-5 border-b-2 border-[#191915] pb-3 dark:border-[#eee8dc]">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#6d685e] dark:text-[#aaa397]">
              Latest edition
            </span>
            <h2 className="mt-1 text-xl font-semibold">Intelligence desk</h2>
          </div>
          <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
            {reports.length} published reports
          </span>
        </div>

        <section
          className="grid min-w-0 gap-x-7 gap-y-12 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Published reports"
        >
          <ReportCard
            report={reports[0]}
            featured
            onOpen={setSelectedReport}
          />

          <aside className="border-t-2 border-[#191915] pt-4 dark:border-[#eee8dc] lg:row-span-1">
            <span className="text-[10px] font-bold uppercase text-[#2456e8] dark:text-[#8da5ff]">
              Editor's briefing
            </span>
            <h2 className="mt-3 text-2xl font-semibold leading-tight">
              Decisions that need attention this week
            </h2>
            <div className="mt-6 divide-y divide-[#d8d0c2] dark:divide-[#38372f]">
              {reports.slice(1, 4).map((report, index) => (
                <button
                  key={report.id}
                  type="button"
                  className="group flex w-full items-start gap-4 py-5 text-left outline-none first:pt-0 focus-visible:ring-3 focus-visible:ring-[#2456e8]/25"
                  onClick={() => setSelectedReport(report)}
                >
                  <span className="text-[11px] font-semibold text-[#91897c]">
                    0{index + 1}
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[16px] leading-5 transition-colors group-hover:text-[#2456e8] dark:group-hover:text-[#8da5ff]">
                      {report.title}
                    </strong>
                    <span className="mt-2 flex items-center gap-1 text-[11px] text-[#6d685e] dark:text-[#aaa397]">
                      {report.category}
                      <ArrowRightIcon className="size-3" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {reports.slice(1).map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpen={setSelectedReport}
            />
          ))}
        </section>
      </main>

      <ReportDetailDialog
        report={selectedReport}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null);
        }}
      />
    </div>
  );
}
