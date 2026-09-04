import { useId, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  LoaderCircleIcon,
  SearchIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { useReportSourcePicker } from "../model/useReportSourcePicker";

type ReportSourcePickerDialogProps = {
  open: boolean;
  organizationId: string | null;
  workspaceId: string | null;
  generating?: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (sourceIds: string[]) => Promise<boolean>;
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ReportSourcePickerDialog({
  open,
  organizationId,
  workspaceId,
  generating = false,
  onOpenChange,
  onGenerate,
}: ReportSourcePickerDialogProps) {
  const searchId = useId();
  const [submitting, setSubmitting] = useState(false);
  const {
    search,
    setSearch,
    page,
    setPage,
    result,
    readyFiles,
    selectedSourceIds,
    loading,
    error,
    toggleFile,
  } = useReportSourcePicker({ organizationId, workspaceId, open });
  const totalPages = Math.max(1, result?.totalPages ?? 1);
  const busy = generating || submitting;

  const handleGenerate = async () => {
    if (!selectedSourceIds.length || busy) return;
    setSubmitting(true);
    try {
      const accepted = await onGenerate(selectedSourceIds);
      if (accepted) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}
    >
      <DialogContent className="flex max-h-[min(760px,calc(100dvh-2rem))] min-h-0 w-[min(720px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:w-[min(720px,calc(100vw-4rem))]">
        <DialogHeader className="shrink-0 border-b bg-muted/20 px-5 py-5 pr-12 sm:px-6">
          <DialogTitle>Generate from workspace files</DialogTitle>
          <DialogDescription>
            Select one or more Ready files to use as the report source.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 overflow-hidden px-5 py-4 sm:px-6">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={searchId}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search workspace files"
              aria-label="Search workspace files"
              className="pl-9"
              disabled={busy}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Workspace files unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div
            className="min-h-0 overflow-y-auto rounded-xl border"
            aria-busy={loading}
          >
            {loading && !result ? (
              <div className="grid gap-3 p-4">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-4" />
                    <div className="grid flex-1 gap-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : readyFiles.length ? (
              <ul className="divide-y">
                {readyFiles.map((file) => {
                  const selected = selectedSourceIds.includes(file.key);
                  return (
                    <li key={file.key}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                          selected && "bg-primary/5",
                          busy && "opacity-60",
                        )}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleFile(file)}
                          disabled={busy}
                          aria-label={`Select ${file.name}`}
                        />
                        <FileTextIcon
                          className="size-5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {file.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {file.type} · {formatFileSize(file.size)} · Updated{" "}
                            {formatDate(file.lastModified)}
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="grid min-h-44 place-content-center gap-2 px-6 py-8 text-center">
                <FileTextIcon
                  className="mx-auto size-8 text-muted-foreground/60"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">No Ready files found</p>
                <p className="text-sm text-muted-foreground">
                  Only files that have finished processing can be used for a
                  report.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {selectedSourceIds.length} selected
              {result &&
                result.totalCount > 0 &&
                ` · Page ${page} of ${totalPages}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={busy || page <= 1 || loading}
                  aria-label="Previous workspace files page"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={busy || page >= totalPages || loading}
                  aria-label="Next workspace files page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            )}
          </div>
        </div>

        <Separator />
        <DialogFooter className="shrink-0 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={busy || !selectedSourceIds.length}
          >
            {busy && (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            )}
            Generate report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
