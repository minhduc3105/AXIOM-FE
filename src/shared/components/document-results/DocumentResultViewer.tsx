import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  FileSearchIcon,
  PencilIcon,
  CheckIcon,
} from "lucide-react";
import { useGroupRef, usePanelRef } from "react-resizable-panels";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/lib/utils";
import { updateDocumentBlockDescription } from "@/shared/lib/document-results-api";
import type {
  InlinePreview,
  InspectorResource,
  LayoutBlock,
  ParsedDocumentResult,
  ProcessingFile,
} from "@/shared/types/document-results";
import { RenderedBlockContent } from "./RenderedBlockContent";
import { ParsedContentPane } from "./ParsedContentPane";
import { ResourceError, SourcePreviewPane } from "./SourcePreviewPane";

const EMPTY_BLOCKS: LayoutBlock[] = [];
const DESKTOP_VIEWER_WIDTH = 960;

export type DocumentInspectorContext = {
  sourceLabel?: string;
  statusLabel: string;
  statusTone?: "neutral" | "success" | "processing" | "failed";
  backLabel?: string;
  onBack?: () => void;
};

type DocumentResultViewerProps = {
  file: ProcessingFile | null;
  preview: InspectorResource<InlinePreview>;
  parsing: InspectorResource<ParsedDocumentResult>;
  onRetryPreview: () => void;
  onRetryParsing: () => void;
  context?: DocumentInspectorContext;
  className?: string;
};

function getDisplayName(file: ProcessingFile) {
  return file.filename ?? file.key.split("/").filter(Boolean).pop() ?? file.key;
}

function useWideViewer(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [wide, setWide] = useState(false);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setWide(element.clientWidth >= DESKTOP_VIEWER_WIDTH);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  return wide;
}

function scrollElementWithin(
  viewport: HTMLElement,
  target: HTMLElement,
  behavior: ScrollBehavior,
) {
  const scrollViewport =
    viewport.closest<HTMLElement>("[data-slot='scroll-area-viewport']") ??
    viewport;
  const viewportRect = scrollViewport.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  scrollViewport.scrollTo({
    top:
      scrollViewport.scrollTop +
      targetRect.top -
      viewportRect.top -
      scrollViewport.clientHeight / 2 +
      targetRect.height / 2,
    left:
      scrollViewport.scrollLeft +
      targetRect.left -
      viewportRect.left -
      scrollViewport.clientWidth / 2 +
      targetRect.width / 2,
    behavior,
  });
}

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function DocumentResultViewer({
  file,
  preview,
  parsing,
  onRetryPreview,
  onRetryParsing,
  context,
  className,
}: DocumentResultViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parsedViewportRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const groupRef = useGroupRef();
  const sourcePanelRef = usePanelRef();
  const parsedPanelRef = usePanelRef();
  const wide = useWideViewer(containerRef);
  const blocks = parsing.data?.blocks ?? EMPTY_BLOCKS;

  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    null,
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [compactPane, setCompactPane] = useState("source");
  const [pageFilter, setPageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [descriptionEdits, setDescriptionEdits] = useState<
    Record<string, string>
  >({});

  const pages = useMemo(
    () =>
      Array.from(
        new Set(
          blocks
            .map((block) => block.page)
            .filter((page): page is number => page !== null),
        ),
      ).sort((left, right) => left - right),
    [blocks],
  );
  const blockTypes = useMemo(
    () =>
      Array.from(new Set(blocks.map((block) => block.type))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [blocks],
  );
  const filteredBlocks = useMemo(
    () =>
      blocks.filter(
        (block) =>
          (pageFilter === "all" || block.page === Number(pageFilter)) &&
          (typeFilter === "all" || block.type === typeFilter),
      ),
    [blocks, pageFilter, typeFilter],
  );

  useEffect(() => {
    setActiveComponentId(null);
    setPageIndex(0);
    setShowBoxes(true);
    setZoom(1);
    setCompactPane("source");
    setPageFilter("all");
    setTypeFilter("all");
    setDescriptionEdits({});
    const frame = window.requestAnimationFrame(() => {
      sourcePanelRef.current?.expand();
      parsedPanelRef.current?.expand();
      groupRef.current?.setLayout({ parsed: 44, source: 56 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [file?.key, groupRef, parsedPanelRef, sourcePanelRef]);

  const handleDescriptionEdit = useCallback(
    async (componentId: string, description: string) => {
      const documentId = parsing.data?.document.document_id;
      const runId = parsing.data?.document.latest_run_id;
      const workspaceId = parsing.data?.document.workspace_id;
      if (!documentId || !runId || !workspaceId) {
        throw new Error("The document is not ready to save an edit.");
      }

      await updateDocumentBlockDescription({
        workspaceId,
        documentId,
        runId,
        componentId,
        description,
      });
      setDescriptionEdits((current) => ({
        ...current,
        [componentId]: description,
      }));
    },
    [parsing.data],
  );

  useEffect(() => {
    if (!blocks.length) {
      setActiveComponentId(null);
      return;
    }
    if (
      !activeComponentId ||
      !blocks.some((block) => block.component_id === activeComponentId)
    ) {
      setActiveComponentId(blocks[0].component_id);
      if (blocks[0].page !== null) setPageIndex(blocks[0].page);
    }
  }, [activeComponentId, blocks]);

  useEffect(() => {
    if (!filteredBlocks.length) return;
    if (
      activeComponentId &&
      filteredBlocks.some((block) => block.component_id === activeComponentId)
    ) {
      return;
    }
    const first = filteredBlocks[0];
    setActiveComponentId(first.component_id);
    if (first.page !== null) setPageIndex(first.page);
  }, [activeComponentId, filteredBlocks]);

  const revealParsedBlock = useCallback((componentId: string) => {
    window.requestAnimationFrame(() => {
      const viewport = parsedViewportRef.current;
      const card = cardRefs.current.get(componentId);
      if (!viewport || !card) return;
      scrollElementWithin(viewport, card, reducedMotion() ? "auto" : "smooth");
    });
  }, []);

  const activateFromSource = useCallback(
    (componentId: string) => {
      const block = blocks.find((item) => item.component_id === componentId);
      setActiveComponentId(componentId);
      if (block?.page !== null && block?.page !== undefined) {
        setPageIndex(block.page);
      }
      setPageFilter("all");
      setTypeFilter("all");
      if (!wide) setCompactPane("parsed");
      revealParsedBlock(componentId);
    },
    [blocks, revealParsedBlock, wide],
  );

  const activateFromCard = useCallback(
    (block: LayoutBlock) => {
      setActiveComponentId(block.component_id);
      if (block.page !== null) setPageIndex(block.page);
      if (!wide) setCompactPane("source");
    },
    [wide],
  );

  if (!file) {
    return (
      <Card className={cn("min-h-[520px] min-w-0", className)}>
        <CardContent className="grid flex-1 place-items-center p-8 text-center">
          <Empty className="max-w-sm border-0 p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileSearchIcon />
              </EmptyMedia>
              <EmptyTitle>No indexed result selected</EmptyTitle>
              <EmptyDescription>
                Select an indexed file to compare its source with parsed
                content.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const sourcePane = (
    <InspectorPane>
      <SourcePreviewPane
        file={file}
        preview={preview}
        blocks={blocks}
        activeComponentId={activeComponentId}
        pageIndex={pageIndex}
        showBoxes={showBoxes}
        zoom={zoom}
        onActivate={activateFromSource}
        onPageIndexChange={setPageIndex}
        onShowBoxesChange={setShowBoxes}
        onZoomChange={setZoom}
        onRetry={onRetryPreview}
      />
    </InspectorPane>
  );

  const parsedPane = (
    <InspectorPane>
      <ParsedContentPane
        parsing={parsing}
        blocks={blocks}
        filteredBlocks={filteredBlocks}
        pages={pages}
        blockTypes={blockTypes}
        pageFilter={pageFilter}
        typeFilter={typeFilter}
        activeComponentId={activeComponentId}
        cardRefs={cardRefs}
        viewportRef={parsedViewportRef}
        onPageFilterChange={setPageFilter}
        onTypeFilterChange={setTypeFilter}
        onActivate={activateFromCard}
        descriptionEdits={descriptionEdits}
        onDescriptionEdit={handleDescriptionEdit}
        onRetry={onRetryParsing}
      />
    </InspectorPane>
  );

  return (
    <section
      ref={containerRef}
      className={cn(
        "flex h-full min-h-[620px] min-w-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm",
        className,
      )}
      aria-label="Document comparison workspace"
    >
      <InspectorHeader file={file} context={context} parsing={parsing} />

      <div className="min-h-0 min-w-0 flex-1">
        {wide ? (
          <ResizablePanelGroup
            groupRef={groupRef}
            orientation="horizontal"
            className="min-h-0 min-w-0"
          >
            <ResizablePanel
              id="source"
              panelRef={sourcePanelRef}
              defaultSize="56%"
              minSize="35%"
              maxSize="65%"
              collapsible
              collapsedSize={0}
            >
              {sourcePane}
            </ResizablePanel>
            <ResizableHandle
              withHandle
              aria-label="Resize source preview and parsed content panels"
            />
            <ResizablePanel
              id="parsed"
              panelRef={parsedPanelRef}
              defaultSize="44%"
              minSize="35%"
              maxSize="65%"
              collapsible
              collapsedSize={0}
            >
              {parsedPane}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <Tabs
            value={compactPane}
            onValueChange={setCompactPane}
            className="h-full min-h-0 gap-0"
          >
            <div className="border-b px-3 py-2">
              <TabsList
                className="w-full"
                aria-label="Document comparison views"
              >
                <TabsTrigger value="source">Source preview</TabsTrigger>
                <TabsTrigger value="parsed">Parsed content</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="source"
              keepMounted
              className="m-0 min-h-0 overflow-hidden"
            >
              {sourcePane}
            </TabsContent>
            <TabsContent
              value="parsed"
              keepMounted
              className="m-0 min-h-0 overflow-hidden"
            >
              {parsedPane}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </section>
  );
}

function InspectorHeader({
  file,
  context,
  parsing,
}: {
  file: ProcessingFile;
  context?: DocumentInspectorContext;
  parsing: InspectorResource<ParsedDocumentResult>;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3 sm:px-4">
      {context?.onBack && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={context.onBack}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          <span className="max-sm:sr-only">{context.backLabel ?? "Back"}</span>
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h2
          className="truncate text-sm font-semibold"
          title={getDisplayName(file)}
        >
          {getDisplayName(file)}
        </h2>
      </div>
    </header>
  );
}

function InspectorPane({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </section>
  );
}

type ParsedPaneProps = {
  parsing: InspectorResource<ParsedDocumentResult>;
  blocks: LayoutBlock[];
  filteredBlocks: LayoutBlock[];
  pages: number[];
  blockTypes: string[];
  pageFilter: string;
  typeFilter: string;
  activeComponentId: string | null;
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  onPageFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onActivate: (block: LayoutBlock) => void;
  descriptionEdits: Record<string, string>;
  onDescriptionEdit: (
    componentId: string,
    description: string,
  ) => Promise<void>;
  onRetry: () => void;
};

export function ParsedPane({
  parsing,
  blocks,
  filteredBlocks,
  pages,
  blockTypes,
  pageFilter,
  typeFilter,
  activeComponentId,
  cardRefs,
  viewportRef,
  onPageFilterChange,
  onTypeFilterChange,
  onActivate,
  descriptionEdits,
  onDescriptionEdit,
  onRetry,
}: ParsedPaneProps) {
  if (parsing.status === "loading" && !parsing.data) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-9" />
        <Skeleton className="h-36" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (parsing.status === "error" && !parsing.data) {
    return (
      <ResourceError
        title="Parsed content failed"
        message={parsing.error}
        onRetry={onRetry}
      />
    );
  }

  if (!parsing.data) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-w-0 grid-cols-2 gap-2 border-b px-3 py-2">
        <FilterDropdown
          label="Filter blocks by page"
          value={pageFilter}
          onChange={onPageFilterChange}
          items={[
            { label: "All pages", value: "all" },
            ...pages.map((page) => ({
              label: `Page ${page + 1}`,
              value: page.toString(),
            })),
          ]}
        />
        <FilterDropdown
          label="Filter blocks by type"
          value={typeFilter}
          onChange={onTypeFilterChange}
          items={[
            { label: "All types", value: "all" },
            ...blockTypes.map((type) => ({ label: type, value: type })),
          ]}
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div ref={viewportRef} className="min-w-0">
          <div className="grid min-w-0 gap-3 p-3">
            {!blocks.length ? (
              <Alert>
                <AlertTitle>No layout blocks</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                  {parsing.data.mainText ||
                    "Corpus did not return block or main-text content for this document."}
                </AlertDescription>
              </Alert>
            ) : !filteredBlocks.length ? (
              <Alert>
                <FileSearchIcon />
                <AlertTitle>No matching blocks</AlertTitle>
                <AlertDescription>
                  Change the page or block type filter to continue reviewing.
                </AlertDescription>
              </Alert>
            ) : (
              filteredBlocks.map((block) => {
                const index = blocks.findIndex(
                  (item) => item.component_id === block.component_id,
                );
                return (
                  <ParsedBlockCard
                    key={block.component_id}
                    block={block}
                    index={index}
                    active={activeComponentId === block.component_id}
                    cardRefs={cardRefs}
                    description={
                      descriptionEdits[block.component_id] ?? block.description
                    }
                    onDescriptionEdit={onDescriptionEdit}
                    onActivate={onActivate}
                  />
                );
              })
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
}) {
  const selectedLabel =
    items.find((item) => item.value === value)?.label ?? label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            aria-label={label}
          />
        }
      >
        {selectedLabel}
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {items.map((item) => (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                closeOnClick
              >
                {item.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ParsedBlockCard({
  block,
  index,
  active,
  cardRefs,
  onActivate,
  description,
  onDescriptionEdit,
}: {
  block: LayoutBlock;
  index: number;
  active: boolean;
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onActivate: (block: LayoutBlock) => void;
  description?: string;
  onDescriptionEdit: (
    componentId: string,
    description: string,
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(
    description ?? block.text ?? block.semantic_text ?? "",
  );
  const boxed = Boolean(block.bbox && block.page_bbox);
  const pageLabel = block.page === null ? "Page —" : `Page ${block.page + 1}`;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onActivate(block);
  };

  return (
    <Card
      ref={(element) => {
        if (element) cardRefs.current.set(block.component_id, element);
        else cardRefs.current.delete(block.component_id);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Show ${block.component_id} in source document`}
      aria-pressed={active}
      className={cn(
        "relative min-w-0 cursor-pointer gap-0 overflow-hidden py-0 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active &&
          "border-primary bg-accent before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary",
      )}
      onClick={() => onActivate(block)}
      onKeyDown={handleKeyDown}
    >
      <CardHeader className="border-b bg-muted/40 px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge>{(index + 1).toString().padStart(2, "0")}</Badge>
          <Badge variant="outline">{block.type}</Badge>
          <Badge variant="secondary">{pageLabel}</Badge>
          <Badge variant={boxed ? "secondary" : "outline"}>
            {boxed ? "Boxed" : "No box"}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto h-7 gap-1 px-2"
            aria-label={`Edit description for ${block.component_id}`}
            onClick={(event) => {
              event.stopPropagation();
              setDraft(description ?? block.text ?? block.semantic_text ?? "");
              setEditing(true);
            }}
          >
            <PencilIcon className="size-3.5" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <code
          className="block overflow-x-auto border-b bg-muted/30 px-3 py-2 font-mono text-[10px] text-muted-foreground"
          title={block.component_id}
        >
          {block.component_id}
        </code>
        <div className="min-w-0 overflow-hidden">
          {editing ? (
            <div
              className="grid gap-2 p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <Textarea
                aria-label={`Description for ${block.component_id}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await onDescriptionEdit(block.component_id, draft);
                      setEditing(false);
                      toast.success("Description saved.");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Unable to save description.",
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <CheckIcon data-icon="inline-start" />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <RenderedBlockContent block={block} contentOverride={description} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
