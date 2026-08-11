import { useEffect, useId, useMemo, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileIcon,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { cn } from "@/shared/lib/utils";
import { DataEmptyState } from "./DataEmptyState";
import { StatusBadge } from "./StatusBadge";

export type DataFileSortField = "file" | "status" | "lastModified" | "size";
export type DataFileSortDirection = "ascending" | "descending";
export type DataFileStatusFilter = "all" | DataHealthStatus;

export type DataFileTransformOptions = {
  query: string;
  statusFilter: DataFileStatusFilter;
  sortField: DataFileSortField;
  sortDirection: DataFileSortDirection;
};

type DataTableProps = {
  files: DataFile[];
  loading: boolean;
  onCreateIngestion?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  searchLabel?: string;
};

const statusRank: Record<DataHealthStatus, number> = {
  success: 0,
  processing: 1,
  failed: 2,
};
const statusFilterOptions: Array<{
  value: DataFileStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
];
const pageSizeOptions = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];

const byteFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${byteFormatter.format(bytes / 1024 ** unitIndex)} ${units[unitIndex]}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function validTimestamp(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

export function transformDataFiles(
  files: DataFile[],
  options: DataFileTransformOptions,
) {
  const normalizedQuery = options.query.trim().toLowerCase();
  const filtered = files.filter((file) => {
    const matchesQuery =
      !normalizedQuery ||
      file.name.toLowerCase().includes(normalizedQuery) ||
      file.key.toLowerCase().includes(normalizedQuery) ||
      file.type.toLowerCase().includes(normalizedQuery);
    return (
      matchesQuery &&
      (options.statusFilter === "all" || file.status === options.statusFilter)
    );
  });

  return [...filtered].sort((left, right) => {
    let comparison = 0;
    if (options.sortField === "lastModified") {
      const leftDate = validTimestamp(left.lastModified);
      const rightDate = validTimestamp(right.lastModified);
      if (leftDate === null || rightDate === null) {
        if (leftDate === null && rightDate !== null) return 1;
        if (leftDate !== null && rightDate === null) return -1;
      } else {
        comparison = leftDate - rightDate;
      }
    } else if (options.sortField === "file") {
      comparison = compareText(left.name, right.name);
    } else if (options.sortField === "status") {
      comparison = statusRank[left.status] - statusRank[right.status];
    } else {
      comparison = left.size - right.size;
    }
    if (comparison !== 0) {
      return options.sortDirection === "ascending" ? comparison : -comparison;
    }
    return compareText(left.key, right.key);
  });
}

function DataTableSkeleton() {
  return (
    <Table className="min-w-[920px]">
      <TableHeader>
        <TableRow>
          {["File", "Status", "Last modified", "Size", ""].map(
            (heading, index) => (
              <TableHead key={`${heading}-${index}`} className="h-11 px-4">
                {heading}
              </TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, index) => (
          <TableRow key={index}>
            {Array.from({ length: 5 }, (__, cellIndex) => (
              <TableCell key={cellIndex} className="px-4 py-4">
                <Skeleton
                  className={cellIndex === 0 ? "h-8 w-64" : "h-5 w-24"}
                />
              </TableCell>
            ))}
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
  emptyTitle = "No files in this source",
  emptyDescription = "Start an ingestion to add source files and make them available to AXIOM.",
  searchLabel = "Search files",
}: DataTableProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DataFileStatusFilter>("all");
  const [sortField, setSortField] = useState<DataFileSortField>("lastModified");
  const [sortDirection, setSortDirection] =
    useState<DataFileSortDirection>("descending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const transformedFiles = useMemo(
    () =>
      transformDataFiles(files, {
        query,
        statusFilter,
        sortField,
        sortDirection,
      }),
    [files, query, sortDirection, sortField, statusFilter],
  );
  const totalPages = Math.max(1, Math.ceil(transformedFiles.length / pageSize));
  const visibleFiles = transformedFiles.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  useEffect(
    () => setPage((current) => Math.min(current, totalPages)),
    [totalPages],
  );

  const resetPage = () => setPage(1);
  const changeSort = (field: DataFileSortField) => {
    setSortDirection((current) =>
      sortField === field && current === "ascending"
        ? "descending"
        : "ascending",
    );
    setSortField(field);
    resetPage();
  };
  const sortIcon = (field: DataFileSortField) => {
    if (sortField !== field) return <ArrowUpDownIcon className="size-3.5" />;
    return sortDirection === "ascending" ? (
      <ArrowUpIcon className="size-3.5" />
    ) : (
      <ArrowDownIcon className="size-3.5" />
    );
  };
  const ariaSort = (field: DataFileSortField) =>
    sortField === field ? sortDirection : "none";

  if (loading && files.length === 0) return <DataTableSkeleton />;
  if (files.length === 0) {
    return (
      <DataEmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={onCreateIngestion ? "Data Ingestion" : undefined}
        onAction={onCreateIngestion}
      />
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-center">
        <Field className="min-w-0 flex-1 lg:max-w-md">
          <FieldLabel htmlFor={searchId} className="sr-only">
            {searchLabel}
          </FieldLabel>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={searchId}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
              placeholder={searchLabel}
              className="pl-9"
            />
          </div>
        </Field>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between lg:w-[170px]"
                aria-label="Filter files by status"
              />
            }
          >
            {statusFilterOptions.find((option) => option.value === statusFilter)
              ?.label ?? "All statuses"}
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as DataFileStatusFilter);
                resetPage();
              }}
            >
              {statusFilterOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-sm tabular-nums text-muted-foreground">
          {transformedFiles.length} of {files.length}
        </span>
      </div>

      {transformedFiles.length === 0 ? (
        <DataEmptyState
          title="No matching files"
          description="Adjust the search or status filter to see more results."
        />
      ) : (
        <>
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader className="bg-muted/45">
                <TableRow className="hover:bg-transparent">
                  {(
                    [
                      ["file", "File", "w-[42%]"],
                      ["status", "Status", ""],
                      ["lastModified", "Last modified", ""],
                      ["size", "Size", "text-right"],
                    ] as const
                  ).map(([field, label, className]) => (
                    <TableHead
                      key={field}
                      aria-sort={ariaSort(field)}
                      className={cn(
                        "h-11 px-4 text-xs font-semibold",
                        className,
                      )}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => changeSort(field)}
                        className={cn(
                          "h-auto gap-1.5 rounded-md px-1 py-1",
                          field === "size" && "float-right",
                        )}
                      >
                        {label}
                        {sortIcon(field)}
                      </Button>
                    </TableHead>
                  ))}
                  <TableHead className="h-11 w-14 px-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleFiles.map((file) => (
                  <TableRow key={file.key} className="group">
                    <TableCell className="max-w-0 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted text-primary">
                          <FileIcon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-medium">
                            {file.name}
                          </strong>
                          <span
                            className="block truncate text-xs text-muted-foreground"
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
                          className="max-w-[190px] truncate text-xs capitalize text-muted-foreground"
                          title={file.errorMessage ?? file.statusDetail}
                        >
                          {file.statusDetail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                      {formatDate(file.lastModified)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right text-sm font-medium tabular-nums">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<a href={file.downloadUrl} />}
                        nativeButton={false}
                        aria-label={`Download ${file.name}`}
                        title={`Download ${file.name}`}
                      >
                        <DownloadIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Rows per page"
                    />
                  }
                >
                  {pageSize}
                  <ChevronDownIcon data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      resetPage();
                    }}
                  >
                    {pageSizeOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-sm tabular-nums text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
