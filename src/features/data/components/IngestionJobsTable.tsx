import { Layers3Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IngestionJob } from "../model/types";
import { DataEmptyState } from "./DataEmptyState";
import { StatusBadge } from "./StatusBadge";

type IngestionJobsTableProps = {
  jobs: IngestionJob[];
  loading: boolean;
  onCreateIngestion: () => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSourceType(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function IngestionJobsSkeleton() {
  return (
    <Table className="min-w-[840px]">
      <TableHeader className="bg-[#f4efe5]/70 dark:bg-white/4">
        <TableRow className="hover:bg-transparent">
          {["Source", "Status", "Records pulled", "Objects written", "Updated"].map(
            (heading) => (
              <TableHead
                key={heading}
                className="h-11 px-4 text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]"
              >
                {heading}
              </TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            {Array.from({ length: 5 }, (__, cellIndex) => (
              <TableCell key={cellIndex} className="px-4 py-4">
                <Skeleton
                  className={cellIndex === 0 ? "h-5 w-44" : "h-5 w-24"}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function IngestionJobsTable({
  jobs,
  loading,
  onCreateIngestion,
}: IngestionJobsTableProps) {
  if (loading && jobs.length === 0) return <IngestionJobsSkeleton />;

  if (jobs.length === 0) {
    return (
      <DataEmptyState
        title="No ingestion jobs yet"
        description="Create an ingestion to start tracking source transfer and processing activity."
        actionLabel="Data Ingestion"
        onAction={onCreateIngestion}
      />
    );
  }

  return (
    <Table className="min-w-[840px]">
      <TableHeader className="bg-[#f4efe5]/70 dark:bg-white/4">
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-11 px-4 text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
            Source
          </TableHead>
          <TableHead className="h-11 px-4 text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
            Status
          </TableHead>
          <TableHead className="h-11 px-4 text-right text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
            Records pulled
          </TableHead>
          <TableHead className="h-11 px-4 text-right text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
            Objects written
          </TableHead>
          <TableHead className="h-11 px-4 text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
            Updated
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow
            key={job.job_id}
            className="group hover:bg-[#f4efe5]/52 dark:hover:bg-white/4"
          >
            <TableCell className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[#d8d0c2]/84 bg-[#f4efe5]/86 text-[#2456e8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.36)] transition-transform duration-500 ease-out group-hover:scale-105 dark:border-[#38372f] dark:bg-[#292923] dark:text-[#9aafff]">
                  <Layers3Icon className="size-4" />
                </span>
                <div className="grid gap-0.5">
                  <strong className="text-sm font-medium text-[#191915] dark:text-[#f4efe5]">
                    {formatSourceType(job.datasource_type)}
                  </strong>
                  <span
                    className="max-w-52 truncate font-mono text-[11px] text-[#6d685e] dark:text-[#aaa397]"
                    title={job.job_id}
                  >
                    {job.job_id}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <div className="grid justify-items-start gap-1">
                <StatusBadge status={job.healthStatus} />
                <span
                  className="max-w-44 truncate text-xs capitalize text-[#6d685e] dark:text-[#aaa397]"
                  title={job.error_message ?? job.status}
                >
                  {job.error_message ?? job.status}
                </span>
              </div>
            </TableCell>
            <TableCell className="px-4 py-3.5 text-right font-medium tabular-nums">
              {job.records_pulled.toLocaleString()}
            </TableCell>
            <TableCell className="px-4 py-3.5 text-right font-medium tabular-nums">
              {job.objects_written.toLocaleString()}
            </TableCell>
            <TableCell className="px-4 py-3.5 text-sm text-[#625d53] dark:text-[#c5bcaf]">
              {formatDate(job.updated_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
