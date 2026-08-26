import { useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  CircleStopIcon,
  ChevronDownIcon,
  DownloadIcon,
  FileCodeIcon,
  FileIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { getUploadFileDefinition } from "@/features/ingestion/model/uploadFileRegistry";
import type {
  DataFile,
  DataSourceFileSortField,
  DataSourceFileSortOrder,
  DataSourceFilesPage,
} from "../model/types";
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
  onCancelIndexing?: (file: DataFile) => void;
  onRetryIndexing?: (file: DataFile) => void;
  onReprocessIndexing?: (file: DataFile) => void;
  onDeleteFile?: (file: DataFile) => void;
  onBulkRetry?: (files: DataFile[]) => void;
  onBulkDelete?: (files: DataFile[]) => void;
  selectedFileKeys?: string[];
  onSelectedFileKeysChange?: (keys: string[]) => void;
  pendingFileKey?: string | null;
  pendingAction?: "cancel" | "retry" | "reprocess" | "delete";
  bulkProgress?: {
    action: "retry" | "delete";
    completed: number;
    total: number;
    failed: number;
  } | null;
};

const byteFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const pageSizeItems = [10, 20, 50];

function FileVisual({ file }: { file: DataFile }) {
  const [imageFailed, setImageFailed] = useState(false);
  const definition = getUploadFileDefinition(file.name);
  const showImage = definition?.previewKind === "image" && !imageFailed;
  let Icon = FileIcon;
  let iconClassName = "text-muted-foreground group-hover:text-primary";

  switch (definition?.extension) {
    case "csv":
    case "xlsx":
      Icon = FileSpreadsheetIcon;
      iconClassName = "text-muted-foreground group-hover:text-primary";
      break;
    case "pdf":
      Icon = FileTextIcon;
      iconClassName = "text-muted-foreground group-hover:text-primary";
      break;
    case "docx":
    case "txt":
      Icon = FileTextIcon;
      iconClassName = "text-muted-foreground group-hover:text-primary";
      break;
    case "md":
      Icon = FileCodeIcon;
      iconClassName = "text-muted-foreground group-hover:text-primary";
      break;
    case "png":
    case "jpg":
    case "webp":
      Icon = FileImageIcon;
      iconClassName = "text-primary";
      break;
  }

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors",
        showImage
          ? "overflow-hidden bg-muted"
          : "bg-white group-hover:bg-transparent",
      )}
    >
      {showImage ? (
        <img
          src={file.downloadUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Icon className={cn("size-[24px]", iconClassName)} aria-hidden="true" />
      )}
    </span>
  );
}

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
          {["", "File", "Status", "Updated", "Size", "Actions"].map(
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
  onCancelIndexing,
  onRetryIndexing,
  onReprocessIndexing,
  onDeleteFile,
  onBulkRetry,
  onBulkDelete,
  selectedFileKeys = [],
  onSelectedFileKeysChange,
  pendingFileKey = null,
  pendingAction,
  bulkProgress = null,
}: DataSourceFilesTableProps) {
  const searchId = useId();
  const files = result?.files ?? [];
  const totalCount = result?.totalCount ?? 0;
  const totalUnfilteredCount = result?.totalUnfilteredCount ?? 0;
  const totalPages = Math.max(1, result?.totalPages ?? 0);
  const firstVisible = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisible = Math.min(page * pageSize, totalCount);
  const selectableFiles = files.filter((file) => Boolean(file.datasetId));
  const selectedFileKeySet = new Set(selectedFileKeys);
  const selectedFiles = files.filter((file) =>
    selectedFileKeySet.has(file.key),
  );
  const retryableSelectedFiles = selectedFiles.filter(
    (file) => file.status === "failed",
  );
  const allVisibleSelected =
    selectableFiles.length > 0 &&
    selectableFiles.every((file) => selectedFileKeySet.has(file.key));
  const someVisibleSelected = selectableFiles.some((file) =>
    selectedFileKeySet.has(file.key),
  );
  const selectionDisabled = Boolean(pendingFileKey || bulkProgress);

  const toggleFileSelection = (file: DataFile) => {
    if (!file.datasetId || !onSelectedFileKeysChange || selectionDisabled)
      return;
    onSelectedFileKeysChange(
      selectedFileKeySet.has(file.key)
        ? selectedFileKeys.filter((key) => key !== file.key)
        : [...selectedFileKeys, file.key],
    );
  };

  const toggleVisibleSelection = () => {
    if (!onSelectedFileKeysChange || selectionDisabled) return;
    const visibleKeys = selectableFiles.map((file) => file.key);
    onSelectedFileKeysChange(
      allVisibleSelected
        ? selectedFileKeys.filter((key) => !visibleKeys.includes(key))
        : Array.from(new Set([...selectedFileKeys, ...visibleKeys])),
    );
  };

  const sortIcon = (field: DataSourceFileSortField) => {
    if (sortBy !== field) return <ArrowUpDownIcon className="size-3.5" />;
    return sortOrder === "asc" ? (
      <ArrowUpIcon className="size-3.5" />
    ) : (
      <ArrowDownIcon className="size-3.5" />
    );
  };
  const openFromRow = (file: DataFile) => {
    if (file.canInspect) onInspect(file);
  };
  const handleRowClick = (
    event: MouseEvent<HTMLTableRowElement>,
    file: DataFile,
  ) => {
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
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
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/35 p-1.5">
            <span className="px-2 text-xs font-medium text-muted-foreground">
              {selectedFiles.length} selected
            </span>
            {onBulkRetry && retryableSelectedFiles.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectionDisabled}
                onClick={() => onBulkRetry(retryableSelectedFiles)}
              >
                <RefreshCwIcon data-icon="inline-start" />
                Retry failed ({retryableSelectedFiles.length})
              </Button>
            )}
            {onBulkDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selectionDisabled}
                onClick={() => onBulkDelete(selectedFiles)}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
      <Separator />
      {bulkProgress && (
        <div
          className="flex items-center gap-3 border-b bg-primary/5 px-4 py-3 text-sm text-primary sm:px-5"
          role="status"
          aria-live="polite"
        >
          <LoaderCircleIcon className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          <span className="min-w-0 flex-1 truncate">
            {bulkProgress.action === "delete"
              ? "Deleting"
              : "Retrying indexing"}{" "}
            {bulkProgress.completed} of {bulkProgress.total}
            {bulkProgress.failed > 0 && ` · ${bulkProgress.failed} failed`}
          </span>
        </div>
      )}

      {loading && !result ? (
        <TableSkeleton />
      ) : totalUnfilteredCount === 0 ? (
        <DataEmptyState
          title="No files in this source"
          description="Start an ingestion to add files to this data source."
          actionLabel={onCreateIngestion ? "Add files" : undefined}
          onAction={onCreateIngestion}
          variant="flat"
        />
      ) : totalCount === 0 ? (
        <DataEmptyState
          title="No matching files"
          description={`No file names match “${search.trim()}”.`}
          actionLabel="Clear search"
          onAction={() => onSearchChange("")}
        />
      ) : (
        <>
          <div
            data-testid="data-file-table-viewport"
            aria-busy={loading}
            className="min-h-0 flex-1 overflow-x-auto"
          >
            <table className="flex h-full min-w-[1000px] flex-col text-sm">
              <TableHeader className="table w-full table-fixed shrink-0 bg-card shadow-[0_1px_0_0_var(--border)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-11 w-12 bg-card px-4">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected && !allVisibleSelected}
                      disabled={!selectableFiles.length || selectionDisabled}
                      onCheckedChange={toggleVisibleSelection}
                      aria-label="Select all visible files"
                    />
                  </TableHead>
                  {(
                  [
                      ["name", "File", "w-[42%]"],
                      [null, "Status", "w-36"],
                      ["last_modified", "Updated", "w-44"],
                      ["size", "Size", "w-28 text-right"],
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
                  <TableHead className="h-11 w-40 bg-card px-4 text-right text-xs font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                data-testid="data-file-table-body"
                className="block min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]"
              >
                {files.map((file) => {
                  const actionPending = pendingFileKey === file.key;
                  const cancelPending = actionPending && pendingAction === "cancel";
                  const retryPending = actionPending && pendingAction === "retry";
                  const reprocessPending =
                    actionPending && pendingAction === "reprocess";

                  return (
                    <TableRow
                      key={file.key}
                      data-state={
                        selectedFileKeySet.has(file.key) ? "selected" : undefined
                      }
                      data-interactive={file.canInspect || undefined}
                    tabIndex={file.canInspect ? 0 : undefined}
                    aria-label={
                      file.canInspect ? `Open ${file.name}` : undefined
                    }
                    onClick={(event) => handleRowClick(event, file)}
                    onKeyDown={(event) => handleRowKeyDown(event, file)}
                      className={cn(
                      "group table w-full table-fixed outline-none",
                      selectedFileKeySet.has(file.key) && "bg-primary/5",
                      file.canInspect &&
                        "focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    )}
                  >
                    <TableCell className="w-12 px-4 py-3">
                      <Checkbox
                        checked={selectedFileKeySet.has(file.key)}
                        disabled={!file.datasetId || selectionDisabled}
                        onCheckedChange={() => toggleFileSelection(file)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        aria-label={`Select ${file.name}`}
                      />
                    </TableCell>
                    <TableCell className="w-[42%] max-w-0 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileVisual file={file} />
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
                    <TableCell className="w-36 px-4 py-3">
                      <div className="grid justify-items-start gap-1">
                        <StatusBadge status={file.status} />
                      </div>
                    </TableCell>
                    <TableCell className="w-44 px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(file.lastModified)}
                    </TableCell>
                    <TableCell className="w-28 px-4 py-3 text-right text-sm font-medium tabular-nums">
                      {formatFileSize(file.size)}
                    </TableCell>
                    <TableCell className="w-40 px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {onCancelIndexing &&
                          !retryPending &&
                          !reprocessPending &&
                          ((file.status === "processing" &&
                            file.sourceStatus !== "cancel_requested") ||
                            cancelPending) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={
                                !file.datasetId ||
                                Boolean(bulkProgress) ||
                                actionPending
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                onCancelIndexing(file);
                              }}
                              onKeyDown={(event) => event.stopPropagation()}
                              aria-label={`Stop processing ${file.name}`}
                              title={`Stop processing ${file.name}`}
                              aria-busy={cancelPending}
                            >
                              <CircleStopIcon
                                className={cn(
                                  cancelPending &&
                                    "animate-spin motion-reduce:animate-none",
                                )}
                              />
                            </Button>
                          )}
                        {onRetryIndexing &&
                          (file.status === "failed" || retryPending) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={
                                !file.datasetId ||
                                Boolean(bulkProgress) ||
                                actionPending
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                onRetryIndexing(file);
                              }}
                              onKeyDown={(event) => event.stopPropagation()}
                              aria-label={`Retry indexing ${file.name}`}
                              title={`Retry indexing ${file.name}`}
                              aria-busy={retryPending}
                            >
                              <RefreshCwIcon
                                className={cn(
                                  retryPending &&
                                    "animate-spin motion-reduce:animate-none",
                                )}
                              />
                            </Button>
                          )}
                        {onReprocessIndexing &&
                          (file.status === "success" || reprocessPending) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={
                                !file.datasetId ||
                                Boolean(bulkProgress) ||
                                actionPending
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                onReprocessIndexing(file);
                              }}
                              onKeyDown={(event) => event.stopPropagation()}
                              aria-label={`Reprocess ${file.name}`}
                              title={`Reprocess ${file.name}`}
                              aria-busy={reprocessPending}
                            >
                              <RefreshCwIcon
                                className={cn(
                                  reprocessPending &&
                                    "animate-spin motion-reduce:animate-none",
                                )}
                              />
                            </Button>
                          )}
                        {file.sourceStatus === "cancel_requested" &&
                          !cancelPending &&
                          !retryPending &&
                          !reprocessPending && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled
                              aria-label={`Stop requested for ${file.name}`}
                              title={`Stop requested for ${file.name}`}
                            >
                              <CircleStopIcon />
                            </Button>
                          )}
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
                        {onDeleteFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={
                              !file.datasetId ||
                              Boolean(bulkProgress) ||
                              actionPending
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteFile(file);
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                            aria-label={`Delete ${file.name}`}
                            title={`Delete ${file.name}`}
                          >
                            <Trash2Icon />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="tabular-nums">
                {firstVisible.toLocaleString()}–{lastVisible.toLocaleString()}{" "}
                of {totalCount.toLocaleString()}
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
                  <DropdownMenuContent align="start" className="min-w-0">
                    <DropdownMenuGroup>
                      {pageSizeItems.map((item) => (
                        <DropdownMenuItem
                          key={item}
                          onClick={() => onPageSizeChange(item)}
                        >
                          {item}
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
