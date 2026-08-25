import { FilesIcon, Layers3Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onViewFiles: (jobId: string) => void;
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
  if (value === "UPLOAD") return "File upload";
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function IngestionJobsSkeleton() {
  return (
    <Table className="min-w-[840px]">
      <TableHeader className="bg-secondary">
        <TableRow className="hover:bg-transparent">
          {[
            "Source",
            "Status",
            "Records pulled",
            "Objects written",
            "Updated",
            "",
          ].map((heading) => (
            <TableHead
              key={heading}
              className="h-11 px-4 text-xs font-semibold text-muted-foreground"
            >
              {heading}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            {Array.from({ length: 6 }, (__, cellIndex) => (
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
  onViewFiles,
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
      <TableHeader className="bg-secondary">
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-11 px-4 text-xs font-semibold text-muted-foreground">
            Source
          </TableHead>
          <TableHead className="h-11 px-4 text-xs font-semibold text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="h-11 px-4 text-right text-xs font-semibold text-muted-foreground">
            Records pulled
          </TableHead>
          <TableHead className="h-11 px-4 text-right text-xs font-semibold text-muted-foreground">
            Objects written
          </TableHead>
          <TableHead className="h-11 px-4 text-xs font-semibold text-muted-foreground">
            Updated
          </TableHead>
          <TableHead className="h-11 w-14 px-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow
            key={job.job_id}
            className="group hover:bg-secondary/70"
          >
            <TableCell className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-border bg-secondary text-primary shadow-sm transition-transform duration-500 ease-out group-hover:scale-105">
                  <Layers3Icon className="size-4" />
                </span>
                <div className="grid gap-0.5">
                  <strong className="text-sm font-medium text-foreground">
                    {formatSourceType(job.datasource_type)}
                  </strong>
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-3.5">
              <div className="grid justify-items-start gap-1">
                <StatusBadge status={job.healthStatus} />
              </div>
            </TableCell>
            <TableCell className="px-4 py-3.5 text-right font-medium tabular-nums">
              {job.records_pulled.toLocaleString()}
            </TableCell>
            <TableCell className="px-4 py-3.5 text-right font-medium tabular-nums">
              {job.objects_written.toLocaleString()}
            </TableCell>
            <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
              {formatDate(job.updated_at)}
            </TableCell>
            <TableCell className="px-4 py-3.5 text-right">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onViewFiles(job.job_id)}
                aria-label={`View files for job ${job.job_id}`}
                disabled={job.objects_written === 0}
              >
                <FilesIcon />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
