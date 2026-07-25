import { useMemo, useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  SearchIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DataFile, DataHealthStatus } from "../model/types";
import { DataEmptyState } from "./DataEmptyState";
import { StatusBadge } from "./StatusBadge";

type DataTableProps = {
  files: DataFile[];
  loading: boolean;
  onCreateIngestion: () => void;
};

type StatusFilter = "all" | DataHealthStatus;

const byteFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  return `${byteFormatter.format(value)} ${units[unitIndex]}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatStatusDetail(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function DataTableSkeleton() {
  return (
    <Table className="min-w-[920px]">
      <TableHeader className="bg-[#f4efe5]/75 dark:bg-white/4">
        <TableRow className="hover:bg-transparent">
          {["File", "Status", "Last modified", "Size", ""].map(
            (heading, index) => (
              <TableHead
                key={`${heading}-${index}`}
                className="h-11 px-4 text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]"
              >
                {heading}
              </TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell className="px-4 py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-[7px]" />
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-4">
              <Skeleton className="h-6 w-24" />
            </TableCell>
            <TableCell className="px-4 py-4">
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell className="px-4 py-4">
              <Skeleton className="ml-auto h-4 w-16" />
            </TableCell>
            <TableCell className="px-4 py-4">
              <Skeleton className="ml-auto size-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DataTable({
  files,
  loading,
  onCreateIngestion,
}: DataTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return files.filter((file) => {
      const matchesQuery =
        !normalizedQuery ||
        file.name.toLowerCase().includes(normalizedQuery) ||
        file.key.toLowerCase().includes(normalizedQuery) ||
        file.type.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" || file.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [files, query, statusFilter]);

  if (loading && files.length === 0) return <DataTableSkeleton />;

  if (files.length === 0) {
    return (
      <DataEmptyState
        title="No files in this organization"
        description="Start an ingestion to add source files and make them available to AXIOM."
        actionLabel="Data Ingestion"
        onAction={onCreateIngestion}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-[#d8d0c2] bg-[#fffdf8]/60 px-4 py-3 sm:flex-row sm:items-center dark:border-[#38372f] dark:bg-[#1a1a17]/60">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Search files</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8377]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files"
            className="h-9 rounded-[7px] bg-[#fffdf8] pl-9 dark:bg-[#20201c]"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-[#6d685e] dark:text-[#aaa397]">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="h-9 min-w-[132px] rounded-[7px] border border-[#d8d0c2] bg-[#fffdf8] px-3 text-sm text-[#191915] outline-none focus:border-[#2456e8] focus:ring-3 focus:ring-[#2456e8]/15 dark:border-[#403f36] dark:bg-[#20201c] dark:text-[#f4efe5]"
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <span className="text-xs tabular-nums text-[#6d685e] dark:text-[#aaa397]">
          {filteredFiles.length} of {files.length}
        </span>
      </div>

      {filteredFiles.length === 0 ? (
        <DataEmptyState
          title="No matching files"
          description="Adjust the search or status filter to see more results."
        />
      ) : (
        <Table className="min-w-[920px]">
          <TableHeader className="bg-[#f4efe5]/75 dark:bg-white/4">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-11 w-[42%] px-4 text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
                File
              </TableHead>
              <TableHead className="h-11 px-4 text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
                Status
              </TableHead>
              <TableHead className="h-11 px-4 text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
                Last modified
              </TableHead>
              <TableHead className="h-11 px-4 text-right text-xs font-semibold text-[#6d685e] dark:text-[#aaa397]">
                Size
              </TableHead>
              <TableHead className="h-11 w-14 px-4">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.map((file) => (
              <TableRow
                key={file.key}
                className="group hover:bg-[#f4efe5]/55 dark:hover:bg-white/4"
              >
                <TableCell className="max-w-0 px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] border border-[#d8d0c2] bg-[#f4efe5] text-[#2456e8] dark:border-[#38372f] dark:bg-[#292923] dark:text-[#9aafff]">
                      <FileIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-medium text-[#191915] dark:text-[#f4efe5]">
                        {file.name}
                      </strong>
                      <span
                        className="block truncate text-xs text-[#6d685e] dark:text-[#aaa397]"
                        title={file.key}
                      >
                        {file.key}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <div className="grid justify-items-start gap-1">
                    <StatusBadge status={file.status} />
                    <span
                      className="max-w-[190px] truncate text-xs text-[#6d685e] dark:text-[#aaa397]"
                      title={file.errorMessage ?? file.statusDetail}
                    >
                      {formatStatusDetail(file.statusDetail)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-sm text-[#625d53] dark:text-[#c5bcaf]">
                  {formatDate(file.lastModified)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-sm font-medium tabular-nums text-[#191915] dark:text-[#f4efe5]">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right">
                  <a
                    href={file.downloadUrl}
                    className="inline-flex size-8 items-center justify-center rounded-[7px] text-[#6d685e] outline-none transition-colors hover:bg-[#e9e2d5] hover:text-[#191915] focus-visible:ring-3 focus-visible:ring-[#2456e8]/25 dark:text-[#aaa397] dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={`Download ${file.name}`}
                    title={`Download ${file.name}`}
                  >
                    <DownloadIcon className="size-4" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
