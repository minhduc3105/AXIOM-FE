import { useId, type KeyboardEvent, type MouseEvent } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileIcon,
  FileSearchIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import type {
  DataFile,
  DataHealthFilter,
  DataSourceFileSortField,
  DataSourceFileSortOrder,
  DataSourceFilesPage,
} from "../model/types";
import { DataEmptyState } from "./DataEmptyState";
import { StatusBadge } from "./StatusBadge";

type DataSourceFilesTableProps = {
  result: DataSourceFilesPage | null;
  loading: boolean;
  healthFilter?: DataHealthFilter;
  search: string;
  page: number;
  pageSize: number;
  sortBy: DataSourceFileSortField;
  sortOrder: DataSourceFileSortOrder;
  onSearchChange: (value: string) => void;
  onClearFilter?: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (field: DataSourceFileSortField) => void;
  onInspect: (file: DataFile) => void;
  onCreateIngestion?: () => void;
};

const byteFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const pageSizeItems = [10, 20, 50];

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
  }).format(date);
}

function TableSkeleton() {
  return (
    <Table className="min-w-[860px]">
      <TableHeader>
        <TableRow>
          {["File", "Status", "Updated", "Size", ""].map(
            (heading, index) => (
              <TableHead key={`${heading}-${index}`} className="h-11 px-4">
                {heading}
              </TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }, (_, index) => (
          <TableRow key={index}>
            {Array.from({ length: 5 }, (__, cellIndex) => (
              <TableCell key={cellIndex} className="px-4 py-3.5">
                <Skeleton
                  className={cellIndex === 0 ? "h-9 w-64" : "h-5 w-24"}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DataSourceFilesTable({
  result,
  loading,
  healthFilter = "all",
  search,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onSearchChange,
  onClearFilter,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onInspect,
  onCreateIngestion,
}: DataSourceFilesTableProps) {
  const searchId = useId();
  const files = result?.files ?? [];
  const totalCount = result?.totalCount ?? 0;
  const totalUnfilteredCount = result?.totalUnfilteredCount ?? 0;
  const totalPages = Math.max(1, result?.totalPages ?? 0);
  const activeFilterLabel =
    healthFilter === "success"
      ? "Ready"
      : healthFilter === "processing"
        ? "Processing"
        : healthFilter === "failed"
          ? "Failed"
          : null;
  const firstVisible = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisible = Math.min(page * pageSize, totalCount);

  const sortIcon = (field: DataSourceFileSortField) => {
    if (sortBy !== field) return <ArrowUpDownIcon className="size-3.5" />;
    return sortOrder === "asc" ? (
      <ArrowUpIcon className="size-3.5" />
    ) : (
      <ArrowDownIcon className="size-3.5" />
    );
  };
  const clearSearchAndFilter = () => {
    onSearchChange("");
    onClearFilter?.();
  };
  const openFromRow = (file: DataFile) => {
    if (file.canInspect) onInspect(file);
  };
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, file: DataFile) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    openFromRow(file);
  };
  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    file: DataFile,
  ) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFromRow(file);
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
        <Field className="min-w-0 flex-1 lg:max-w-md">
          <FieldLabel htmlFor={searchId} className="sr-only">
            Search data source files
          </FieldLabel>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={searchId}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search file names"
              className="pl-9 pr-9"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => onSearchChange("")}
                aria-label="Clear file search"
              >
                <XIcon />
              </Button>
            )}
          </div>
        </Field>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
          {activeFilterLabel && (
            <Badge variant="outline" className="h-7 gap-1 pl-2.5 pr-1">
              Filtered: {activeFilterLabel}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onClearFilter}
                aria-label={`Clear ${activeFilterLabel} filter`}
              >
                <XIcon />
              </Button>
            </Badge>
          )}
          <span className="text-sm tabular-nums text-muted-foreground">
            {totalCount.toLocaleString()} of{" "}
            {totalUnfilteredCount.toLocaleString()}
          </span>
          {loading && result && (
            <span className="text-xs text-muted-foreground" role="status">
              Updating…
            </span>
          )}
        </div>
      </div>
      <Separator />

      {loading && !result ? (
        <div className="[&_[data-slot=table-container]]:max-h-[min(60dvh,40rem)] [&_[data-slot=table-container]]:overflow-auto">
          <TableSkeleton />
        </div>
      ) : totalUnfilteredCount === 0 ? (
        <DataEmptyState
          title="No files in this source"
          description="Start an ingestion to add files to this data source."
          actionLabel={onCreateIngestion ? "Add files" : undefined}
          onAction={onCreateIngestion}
        />
      ) : totalCount === 0 ? (
        <DataEmptyState
          title={
            activeFilterLabel && !search.trim()
              ? `No ${activeFilterLabel.toLowerCase()} files`
              : "No matching files"
          }
          description={
            activeFilterLabel && !search.trim()
              ? `No files currently have the ${activeFilterLabel} status.`
              : `No file names match “${search.trim()}”.`
          }
          actionLabel="Clear search and filters"
          onAction={clearSearchAndFilter}
        />
      ) : (
        <>
          <div
            className="[&_[data-slot=table-container]]:max-h-[min(60dvh,40rem)] [&_[data-slot=table-container]]:overflow-auto"
            aria-busy={loading}
          >
            <Table className="min-w-[860px]">
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                <TableRow className="hover:bg-transparent">
                  {(
                    [
                      ["name", "File", "w-[42%]"],
                      [null, "Status", ""],
                      ["last_modified", "Updated", ""],
                      ["size", "Size", "text-right"],
                    ] as const
                  ).map(([field, label, className]) => (
                    <TableHead
                      key={label}
                      aria-sort={
                        field !== null && sortBy === field
                          ? sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className={cn(
                        "h-11 bg-card px-4 text-xs font-semibold",
                        className,
                      )}
                    >
                      {field ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => onSortChange(field)}
                          className={cn(field === "size" && "float-right")}
                        >
                          {label}
                          {sortIcon(field)}
                        </Button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="h-11 w-24 bg-card px-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow
                    key={file.key}
                    tabIndex={file.canInspect ? 0 : undefined}
                    aria-label={file.canInspect ? `Open ${file.name}` : undefined}
                    onClick={(event) => handleRowClick(event, file)}
                    onKeyDown={(event) => handleRowKeyDown(event, file)}
                    className={cn(
                      "group outline-none",
                      file.canInspect &&
                        "cursor-pointer focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    )}
                  >
                    <TableCell className="max-w-0 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground group-hover:text-primary">
                          <FileIcon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <span className="block max-w-full truncate text-sm font-medium text-foreground" />
                              }
                            >
                              {file.name}
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              align="start"
                              className="max-w-sm break-all"
                            >
                              {file.name}
                            </TooltipContent>
                          </Tooltip>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {file.type}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="grid justify-items-start gap-1">
                        <StatusBadge status={file.status} />
                        <span
                          className="max-w-48 truncate text-xs text-muted-foreground"
                          title={file.errorMessage ?? file.statusDetail}
                        >
                          {file.statusDetail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(file.lastModified)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openFromRow(file);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          disabled={!file.canInspect}
                          aria-label={`View processed result for ${file.name}`}
                          title={
                            file.canInspect
                              ? `View processed result for ${file.name}`
                              : "Processed result is not ready"
                          }
                        >
                          <FileSearchIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<a href={file.downloadUrl} />}
                          nativeButton={false}
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          aria-label={`Download ${file.name}`}
                          title={`Download ${file.name}`}
                        >
                          <DownloadIcon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="tabular-nums">
                {firstVisible.toLocaleString()}–{lastVisible.toLocaleString()} of{" "}
                {totalCount.toLocaleString()}
              </span>
              <div className="flex items-center gap-2">
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
                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      {pageSizeItems.map((item) => (
                        <DropdownMenuItem
                          key={item}
                          onClick={() => onPageSizeChange(item)}
                        >
                          {item}
                          {item === pageSize && (
                            <span className="ml-auto text-primary">Current</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-sm tabular-nums text-muted-foreground">
                Page {page.toLocaleString()} of {totalPages.toLocaleString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
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
