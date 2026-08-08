import { useMemo, useState } from "react";
import { ChevronDownIcon, CloudIcon, FileIcon, SearchIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { S3File } from "../api/ingestionApi";
import type {
  ConnectorJobUiStatus,
  S3BrowserStatus,
  S3Connection,
} from "../model/types";

type S3FileSelectorProps = {
  connection: S3Connection;
  files: S3File[];
  nextToken: string | null;
  selectedKeys: string[];
  browserStatus: S3BrowserStatus;
  browserError: string | null;
  importStatus: ConnectorJobUiStatus;
  importError: string | null;
  onToggleKey: (key: string) => void;
  onSetSelection: (keys: string[]) => void;
  onClearSelection: () => void;
  onLoadMore: () => void;
  onLoadAll: () => void;
  onRetryBrowser: () => void;
  onImport: () => void;
  onEditConnection: () => void;
};

const sizeFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${sizeFormatter.format(bytes / 1024 ** unitIndex)} ${units[unitIndex]}`;
}

function formatUploadedDate(value: string) {
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

function getExtension(file: S3File) {
  const filename = file.name || file.key.split("/").pop() || file.key;
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === filename.length - 1) return "No extension";
  return filename.slice(dotIndex + 1).toUpperCase();
}

export function S3FileSelector({
  connection,
  files,
  nextToken,
  selectedKeys,
  browserStatus,
  browserError,
  importStatus,
  importError,
  onToggleKey,
  onSetSelection,
  onClearSelection,
  onLoadMore,
  onLoadAll,
  onRetryBrowser,
  onImport,
  onEditConnection,
}: S3FileSelectorProps) {
  const [query, setQuery] = useState("");
  const [extensionFilter, setExtensionFilter] = useState("all");
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const extensions = useMemo(
    () =>
      Array.from(new Set(files.map(getExtension))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [files],
  );
  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return files.filter((file) => {
      const matchesQuery =
        !normalizedQuery ||
        file.name.toLowerCase().includes(normalizedQuery) ||
        file.key.toLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        (extensionFilter === "all" || getExtension(file) === extensionFilter)
      );
    });
  }, [extensionFilter, files, query]);

  const filteredKeys = filteredFiles.map((file) => file.key);
  const selectedFilteredCount = filteredKeys.filter((key) =>
    selectedSet.has(key),
  ).length;
  const allFilteredSelected =
    filteredKeys.length > 0 && selectedFilteredCount === filteredKeys.length;
  const someFilteredSelected =
    selectedFilteredCount > 0 && !allFilteredSelected;
  const loadingMore = browserStatus === "loading_more";
  const loadingAll = browserStatus === "loading_all";
  const importing = importStatus === "submitting";
  const busy = loadingMore || loadingAll || importing;

  const toggleFilteredSelection = () => {
    if (allFilteredSelected) {
      const filteredKeySet = new Set(filteredKeys);
      onSetSelection(selectedKeys.filter((key) => !filteredKeySet.has(key)));
      return;
    }
    onSetSelection(Array.from(new Set([...selectedKeys, ...filteredKeys])));
  };

  return (
    <Card className="min-w-0 rounded-3xl bg-card/90">
      <CardHeader className="gap-4 border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <CloudIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-2xl">
                Choose S3 objects
              </CardTitle>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {connection.bucketName} · {connection.region}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{files.length} loaded</Badge>
            <Badge variant={selectedKeys.length ? "default" : "outline"}>
              {selectedKeys.length} selected
            </Badge>
            {nextToken && <Badge variant="outline">More available</Badge>}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onEditConnection}
              disabled={busy}
            >
              Edit connection
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search S3 files</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by file name or object path"
              className="pl-9"
            />
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full justify-between lg:w-[190px]"
                  aria-label="Filter by file type"
                />
              }
            >
              {extensionFilter === "all" ? "All file types" : extensionFilter}
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={extensionFilter}
                onValueChange={(value) => setExtensionFilter(String(value))}
              >
                <DropdownMenuRadioItem value="all">
                  All file types
                </DropdownMenuRadioItem>
                {extensions.map((extension) => (
                  <DropdownMenuRadioItem value={extension} key={extension}>
                    {extension}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-sm tabular-nums text-muted-foreground">
            {filteredFiles.length} shown
          </span>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 p-0">
        {nextToken && (
          <Alert className="mx-5 mt-5 w-auto border-primary/25 bg-primary/10">
            <AlertTitle>More objects are available</AlertTitle>
            <AlertDescription>
              Search and Select all currently apply to the {files.length} files
              loaded in this browser session.
            </AlertDescription>
          </Alert>
        )}

        {browserError && (
          <Alert variant="destructive" className="mx-5 mt-5 w-auto">
            <AlertTitle>File listing needs attention</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>{browserError}</span>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={onRetryBrowser}
              >
                Retry file listing
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {importError && (
          <Alert variant="destructive" className="mx-5 mt-5 w-auto">
            <AlertTitle>Import could not start</AlertTitle>
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        )}

        {loadingAll && (
          <div
            className="mx-5 mt-5 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm text-primary"
            role="status"
          >
            <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            Loading every remaining page. {files.length} files are available so
            far.
          </div>
        )}

        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader className="bg-muted/55">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 px-4">
                  <Checkbox
                    checked={allFilteredSelected}
                    indeterminate={someFilteredSelected}
                    disabled={!filteredFiles.length || busy}
                    onCheckedChange={toggleFilteredSelection}
                    aria-label="Select all matching files"
                  />
                </TableHead>
                <TableHead className="w-[46%]">File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => {
                const selected = selectedSet.has(file.key);
                return (
                  <TableRow
                    key={file.key}
                    data-state={selected ? "selected" : undefined}
                    className="group data-[state=selected]:bg-primary/6"
                  >
                    <TableCell className="px-4">
                      <Checkbox
                        checked={selected}
                        disabled={busy}
                        onCheckedChange={() => onToggleKey(file.key)}
                        aria-label={`Select ${file.name}`}
                      />
                    </TableCell>
                    <TableCell className="max-w-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                          <FileIcon className="size-4" aria-hidden="true" />
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
                    <TableCell>
                      <Badge variant="outline">{getExtension(file)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatUploadedDate(file.uploadedDate)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatFileSize(file.size)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredFiles.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-48 text-center">
                    <strong className="block">
                      {files.length
                        ? "No files match this filter"
                        : "No files found in this bucket"}
                    </strong>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {files.length
                        ? "Adjust the search or file type filter."
                        : "Edit the connection to browse a different bucket."}
                    </span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-3 border-t sm:flex-row sm:justify-between">
        <div className="text-sm text-muted-foreground" aria-live="polite">
          {selectedKeys.length} object{selectedKeys.length === 1 ? "" : "s"}{" "}
          selected
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
          <Button
            variant="ghost"
            type="button"
            disabled={!selectedKeys.length || busy}
            onClick={onClearSelection}
          >
            Clear selection
          </Button>
          {nextToken && (
            <>
              <Button
                variant="outline"
                type="button"
                disabled={busy}
                onClick={onLoadMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={busy}
                onClick={onLoadAll}
              >
                {loadingAll ? "Loading all..." : "Load all"}
              </Button>
            </>
          )}
          <Button
            type="button"
            disabled={!selectedKeys.length || busy}
            onClick={onImport}
          >
            {importing
              ? "Creating import job..."
              : `Import ${selectedKeys.length} selected file${
                  selectedKeys.length === 1 ? "" : "s"
                }`}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
