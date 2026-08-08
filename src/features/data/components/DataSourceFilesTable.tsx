import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileIcon,
  FileSearchIcon,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type {
  DataFile,
  DataSourceFileSortField,
  DataSourceFileSortOrder,
  DataSourceFilesPage,
} from "../model/types";
import { cn } from "@/shared/lib/utils";
import { DataEmptyState } from "./DataEmptyState";
import { StatusBadge } from "./StatusBadge";

type DataSourceFilesTableProps = {
  result: DataSourceFilesPage | null;
  loading: boolean;
  search: string;
  page: number;
  pageSize: number;
  sortBy: DataSourceFileSortField;
  sortOrder: DataSourceFileSortOrder;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (field: DataSourceFileSortField) => void;
  onInspect: (file: DataFile) => void;
  onCreateIngestion?: () => void;
};

const byteFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const pageSizeItems = [
  { label: "10", value: "10" },
  { label: "20", value: "20" },
  { label: "50", value: "50" },
];

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

export function DataSourceFilesTable({
  result,
  loading,
  search,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onInspect,
  onCreateIngestion,
}: DataSourceFilesTableProps) {
  const files = result?.files ?? [];
  const totalCount = result?.totalCount ?? 0;
  const totalUnfilteredCount = result?.totalUnfilteredCount ?? 0;
  const totalPages = Math.max(1, result?.totalPages ?? 0);
  const sortIcon = (field: DataSourceFileSortField) => {
    if (sortBy !== field) return <ArrowUpDownIcon className="size-3.5" />;
    return sortOrder === "asc" ? (
      <ArrowUpIcon className="size-3.5" />
    ) : (
      <ArrowDownIcon className="size-3.5" />
    );
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1 lg:max-w-md">
          <span className="sr-only">Search data source files</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search files"
            className="pl-9"
          />
        </label>
        <span className="text-sm tabular-nums text-muted-foreground">
          {totalCount} of {totalUnfilteredCount}
        </span>
      </div>
      <Separator />

      {loading && !result ? (
        <TableSkeleton />
      ) : totalUnfilteredCount === 0 ? (
        <DataEmptyState
          title="No files in this source"
          description="Start an ingestion to add files to this data source."
          actionLabel={onCreateIngestion ? "Data Ingestion" : undefined}
          onAction={onCreateIngestion}
        />
      ) : totalCount === 0 ? (
        <DataEmptyState
          title="No matching files"
          description="Adjust the search to see more results."
        />
      ) : (
        <>
          <div className="max-w-full overflow-x-auto" aria-busy={loading}>
            <Table className="min-w-[920px]">
              <TableHeader className="bg-muted/45">
                <TableRow className="hover:bg-transparent">
                  {(
                    [
                      ["name", "File", "w-[42%]"],
                      [null, "Status", ""],
                      ["last_modified", "Last modified", ""],
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
                        "h-11 px-4 text-xs font-semibold",
                        className,
                      )}
                    >
                      {field ? (
                        <button
                          type="button"
                          onClick={() => onSortChange(field)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md py-1 outline-none focus-visible:ring-3 focus-visible:ring-primary/25",
                            field === "size" && "float-right",
                          )}
                        >
                          {label}
                          {sortIcon(field)}
                        </button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="h-11 w-24 px-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.key} className="group">
                    <TableCell className="max-w-0 px-4 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted text-primary">
                          <FileIcon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          {file.canInspect ? (
                            <button
                              type="button"
                              onClick={() => onInspect(file)}
                              className="block max-w-full truncate text-left text-sm font-medium outline-none hover:text-primary focus-visible:rounded focus-visible:ring-3 focus-visible:ring-primary/25"
                            >
                              {file.name}
                            </button>
                          ) : (
                            <strong className="block truncate text-sm font-medium">
                              {file.name}
                            </strong>
                          )}
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
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onInspect(file)}
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
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <DropdownMenuGroup>
                    {pageSizeItems.map((item) => (
                      <DropdownMenuItem
                        key={item.value}
                        onClick={() => onPageSizeChange(Number(item.value))}
                      >
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
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
