import { useEffect, useId, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  DatabaseIcon,
  FileSearchIcon,
  FileSpreadsheetIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlugZapIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { presignFileForPreview } from "@/shared/lib/document-results-api";
import { cn } from "@/shared/lib/utils";
import type { IngestionFile } from "@/features/ingestion/model/types";
import { UploadFilePreview } from "@/features/ingestion/components/UploadFilePreview";
import {
  allChatDataScope,
  createSelectedChatDataScope,
  noChatDataScope,
  type ChatDataResource,
  type ChatDataResourceKind,
  type ChatDataScope,
} from "../model/chatDataScope";

const FILES_PER_PAGE = 8;

type ChatDataScopeSelectorProps = {
  scope: ChatDataScope;
  resources: ChatDataResource[];
  workspaceId?: string;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onPreviewChange?: (previewOpen: boolean) => void;
  onChange: (scope: ChatDataScope) => void;
  onRefresh?: () => void;
};

export function ChatDataScopeSelector({
  scope,
  resources,
  workspaceId = "",
  loading = false,
  error = null,
  disabled = false,
  className,
  collapsed,
  onCollapsedChange,
  onPreviewChange,
  onChange,
  onRefresh,
}: ChatDataScopeSelectorProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [draftMode, setDraftMode] = useState<ChatDataScope["mode"]>(scope.mode);
  const [draftIds, setDraftIds] = useState<string[]>(scope.resourceIds);
  const [page, setPage] = useState(1);
  const [previewResourceId, setPreviewResourceId] = useState<string | null>(
    null,
  );
  const inputId = useId();
  const readyResources = useMemo(
    () => resources.filter((resource) => resource.status === "ready"),
    [resources],
  );
  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return readyResources;
    return readyResources.filter((resource) =>
      [resource.name, resource.source, resource.detail].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, readyResources]);
  const pageCount = Math.max(
    1,
    Math.ceil(filteredResources.length / FILES_PER_PAGE),
  );
  const currentPage = Math.min(page, pageCount);
  const paginatedResources = useMemo(() => {
    const startIndex = (currentPage - 1) * FILES_PER_PAGE;
    return filteredResources.slice(startIndex, startIndex + FILES_PER_PAGE);
  }, [currentPage, filteredResources]);
  const pageItems = useMemo(
    () => createPageItems(currentPage, pageCount),
    [currentPage, pageCount],
  );
  const previewResource = useMemo(
    () =>
      previewResourceId
        ? (resources.find((resource) => resource.id === previewResourceId) ??
          null)
        : null,
    [previewResourceId, resources],
  );
  const isCollapsed = collapsed ?? internalCollapsed;
  const allReadySelected =
    readyResources.length > 0 &&
    (draftMode === "all" ||
      readyResources.every((resource) => draftIds.includes(resource.id)));
  const noReadySelected = draftMode === "none";

  useEffect(() => {
    setPage((currentPageValue) => Math.min(currentPageValue, pageCount));
  }, [pageCount]);

  const setCollapsed = (nextCollapsed: boolean) => {
    if (collapsed === undefined) setInternalCollapsed(nextCollapsed);
    onCollapsedChange?.(nextCollapsed);
  };

  const openPreview = (resourceId: string) => {
    setPreviewResourceId(resourceId);
    onPreviewChange?.(true);
  };

  const closePreview = () => {
    setPreviewResourceId(null);
    onPreviewChange?.(false);
  };

  const toggleResource = (resourceId: string, checked: boolean) => {
    const readyIds = readyResources.map((resource) => resource.id);
    const currentIds = draftMode === "all" ? readyIds : draftIds;
    const nextIds = checked
      ? [...new Set([...currentIds, resourceId])]
      : currentIds.filter((id) => id !== resourceId);
    const nextIsAll =
      nextIds.length === readyIds.length &&
      readyIds.every((id) => nextIds.includes(id));
    const nextScope = nextIsAll
      ? allChatDataScope
      : nextIds.length === 0
        ? noChatDataScope
        : createSelectedChatDataScope(nextIds, resources);

    setDraftMode(nextScope.mode);
    setDraftIds(nextScope.resourceIds);
    onChange(nextScope);
  };

  const selectAllResources = () => {
    if (allReadySelected) return;
    setDraftMode("all");
    setDraftIds([]);
    onChange(allChatDataScope);
  };

  const deselectAllResources = () => {
    if (noReadySelected) return;
    setDraftMode("none");
    setDraftIds([]);
    onChange(noChatDataScope);
  };

  return (
    <aside
      className={cn("pointer-events-none absolute inset-0 z-30", className)}
      aria-label="Chat data scope"
    >
      <div
        className={cn(
          "pointer-events-auto absolute right-4 top-4 bottom-4 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-[width,opacity] duration-150 ease-out max-lg:right-3",
          previewResource
            ? "w-[min(640px,52vw)] max-lg:w-[min(92vw,640px)]"
            : "w-[min(420px,34vw)] max-lg:w-[min(92vw,420px)]",
          isCollapsed ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={isCollapsed}
        inert={isCollapsed}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-foreground">
                Chat files
              </h2>
            </div>
          </div>
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto h-8 shrink-0 gap-1.5 px-2"
              aria-label="Refresh workspace files"
              disabled={disabled || loading}
              onClick={onRefresh}
            >
              <RefreshCwIcon />
              Refresh
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Collapse chat data sidebar"
            title="Collapse chat data sidebar"
            onClick={() => setCollapsed(true)}
          >
            <PanelRightCloseIcon />
          </Button>
        </header>

        <div className="min-h-0 flex-1">
          {previewResource ? (
            <SelectedFilePreview
              resource={previewResource}
              workspaceId={workspaceId}
              onBack={closePreview}
            />
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 px-3 pb-3 pt-3">
                <label className="sr-only" htmlFor={inputId}>
                  Search workspace files
                </label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id={inputId}
                    className="h-9 bg-background pl-9 text-sm"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search workspace files"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 px-3 pb-2">
                <span className="text-xs text-muted-foreground">
                  {readyResources.length} files
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    disabled={disabled || loading || allReadySelected}
                    onClick={selectAllResources}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    disabled={disabled || loading || noReadySelected}
                    onClick={deselectAllResources}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1 px-3">
                <div className="flex flex-col gap-2 pb-3">
                  {loading ? (
                    <DataScopeLoading />
                  ) : error ? (
                    <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                      {error}
                    </p>
                  ) : filteredResources.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                      No completed files match your search.
                    </p>
                  ) : (
                    paginatedResources.map((resource) => (
                      <DataResourceRow
                        key={resource.id}
                        resource={resource}
                        checked={
                          draftMode === "all" ||
                          (draftMode !== "none" &&
                            draftIds.includes(resource.id))
                        }
                        disabled={false}
                        onPreview={() => openPreview(resource.id)}
                        onCheckedChange={(checked) =>
                          toggleResource(resource.id, checked)
                        }
                      />
                    ))
                  )}
                </div>
              </ScrollArea>

              {pageCount > 1 && !loading && !error && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {pageCount}
                  </span>
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          aria-disabled={currentPage === 1}
                          tabIndex={currentPage === 1 ? -1 : undefined}
                          className={cn(
                            currentPage === 1 &&
                              "pointer-events-none opacity-50",
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage > 1) setPage(currentPage - 1);
                          }}
                        />
                      </PaginationItem>
                      {pageItems.map((item, index) =>
                        item === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href="#"
                              size="icon-sm"
                              isActive={item === currentPage}
                              aria-label={`Go to page ${item}`}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          aria-disabled={currentPage === pageCount}
                          tabIndex={currentPage === pageCount ? -1 : undefined}
                          className={cn(
                            currentPage === pageCount &&
                              "pointer-events-none opacity-50",
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            if (currentPage < pageCount)
                              setPage(currentPage + 1);
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-auto absolute right-3 top-1/2 flex w-12 -translate-y-1/2 flex-col items-center justify-between rounded-full border border-border/80 bg-card/95 py-3 shadow-lg backdrop-blur-sm transition-opacity duration-150 ease-out md:right-6",
          isCollapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!isCollapsed}
        inert={!isCollapsed}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Expand chat data sidebar"
          title="Expand chat data sidebar"
          onClick={() => setCollapsed(false)}
        >
          <PanelRightOpenIcon />
        </Button>
      </div>
    </aside>
  );
}

function DataResourceRow({
  resource,
  checked,
  disabled,
  onPreview,
  onCheckedChange,
}: {
  resource: ChatDataResource;
  checked: boolean;
  disabled: boolean;
  onPreview: () => void;
  onCheckedChange: (checked: boolean) => void;
}) {
  const Icon = resourceIcon(resource.kind);
  const canPreview = resource.kind === "file" && Boolean(resource.resourceRef);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg bg-card px-2 py-2 transition-colors",
        !disabled && "hover:border-primary/30 hover:bg-accent/35",
        disabled && "opacity-65",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked === true)}
        aria-label={`Select ${resource.name}`}
      />
      <button
        type="button"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          canPreview && "cursor-pointer",
          !canPreview && "cursor-default",
        )}
        disabled={!canPreview}
        onClick={onPreview}
        title={canPreview ? `Preview ${resource.name}` : undefined}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {resource.name}
            </span>
            {resource.status !== "ready" && (
              <Badge
                variant="outline"
                className="h-5 shrink-0 px-1.5 text-[10px] font-normal capitalize"
              >
                {resource.status}
              </Badge>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {resource.detail}
          </span>
        </span>
        {canPreview && (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function SelectedFilePreview({
  resource,
  workspaceId,
  onBack,
}: {
  resource: ChatDataResource;
  workspaceId: string;
  onBack: () => void;
}) {
  const reference = resource.resourceRef;
  const [previewFile, setPreviewFile] = useState<IngestionFile | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewAttempt, setPreviewAttempt] = useState(0);

  useEffect(() => {
    if (!reference) {
      setPreviewFile(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const filename = reference.filename || resource.name;

    setPreviewFile(null);
    setPreviewError(null);
    setPreviewLoading(true);

    void presignFileForPreview(
      reference.bucket,
      reference.objectKey,
      workspaceId,
      controller.signal,
    )
      .then(async (preview) => {
        const response = await fetch(preview.url, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Unable to download preview (${response.status}).`);
        }
        const blob = await response.blob();
        if (cancelled) return;

        setPreviewFile({
          id: resource.id,
          file: new File([blob], filename, {
            type: blob.type || contentTypeForFile(filename) || "",
          }),
          name: filename,
          extension: extensionForFile(filename),
          sizeLabel: formatFileSize(blob.size),
        });
        setPreviewLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPreviewLoading(false);
        setPreviewError(
          error instanceof Error
            ? error.message
            : "Unable to load the selected file preview.",
        );
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [previewAttempt, reference, resource.id, resource.name, workspaceId]);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="File preview">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Back to workspace files"
          title="Back to workspace files"
          onClick={onBack}
        >
          <ArrowLeftIcon />
        </Button>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">
            {resource.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {resource.detail}
          </p>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden bg-muted/20 p-2">
        {previewLoading ? (
          <div className="flex h-full min-h-0 flex-col justify-center gap-3 p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : previewError ? (
          <div className="grid h-full min-h-0 place-items-center p-4">
            <Alert variant="destructive" className="max-w-sm">
              <FileSearchIcon />
              <AlertTitle>Preview unavailable</AlertTitle>
              <AlertDescription>{previewError}</AlertDescription>
              <Button
                className="mt-3"
                variant="outline"
                type="button"
                onClick={() => setPreviewAttempt((attempt) => attempt + 1)}
              >
                Retry preview
              </Button>
            </Alert>
          </div>
        ) : previewFile ? (
          <UploadFilePreview file={previewFile} />
        ) : (
          <div className="grid h-full place-items-center p-4 text-center text-sm text-muted-foreground">
            <div>
              <FileSearchIcon className="mx-auto mb-2 size-5" />
              This file cannot be previewed here.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function contentTypeForFile(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === "xlsx")
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (extension === "md" || extension === "markdown") return "text/markdown";
  if (extension === "txt") return "text/plain";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return null;
}

function extensionForFile(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function DataScopeLoading() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading workspace data">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-[62px] animate-pulse rounded-lg border border-border bg-muted"
        />
      ))}
    </div>
  );
}

type PageItem = number | "ellipsis";

function createPageItems(currentPage: number, pageCount: number): PageItem[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  if (currentPage <= 3) return [1, 2, 3, "ellipsis", pageCount];
  if (currentPage >= pageCount - 2) {
    return [1, "ellipsis", pageCount - 2, pageCount - 1, pageCount];
  }
  return [1, "ellipsis", currentPage, "ellipsis", pageCount];
}

function resourceIcon(kind: ChatDataResourceKind) {
  if (kind === "database") return DatabaseIcon;
  if (kind === "connector") return PlugZapIcon;
  return FileSpreadsheetIcon;
}
