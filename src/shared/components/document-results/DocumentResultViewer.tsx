import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  BracesIcon,
  ChevronDownIcon,
  CopyIcon,
  FileSearchIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PencilIcon,
  CheckIcon,
  RefreshCwIcon,
  Rows3Icon,
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
import type {
  InlinePreview,
  InspectorResource,
  LayoutBlock,
  ParsedDocumentResult,
  ProcessingFile,
} from "@/shared/types/document-results";
import { getSourcePreviewKind } from "@/shared/types/document-results";
import { RenderedBlockContent } from "./RenderedBlockContent";
import { SourceBlockOverlay } from "./SourceBlockOverlay";
import { SourceViewerToolbar } from "./SourceViewerToolbar";

const PdfSourceViewer = lazy(() => import("./PdfSourceViewer"));
const SpreadsheetSourceViewer = lazy(() => import("./SpreadsheetSourceViewer"));

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
  const [parsedMode, setParsedMode] = useState("rendered");
  const [pageFilter, setPageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [descriptionEdits, setDescriptionEdits] = useState<
    Record<string, string>
  >({});
  const [sourceCollapsed, setSourceCollapsed] = useState(false);
  const [parsedCollapsed, setParsedCollapsed] = useState(false);

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
    setParsedMode("rendered");
    setPageFilter("all");
    setTypeFilter("all");
    setDescriptionEdits({});
    setSourceCollapsed(false);
    setParsedCollapsed(false);
    const frame = window.requestAnimationFrame(() => {
      sourcePanelRef.current?.expand();
      parsedPanelRef.current?.expand();
      groupRef.current?.setLayout({ source: 52, parsed: 48 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [file?.key, groupRef, parsedPanelRef, sourcePanelRef]);

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
      setParsedMode("rendered");
      if (!wide) setCompactPane("parsed");
      revealParsedBlock(componentId);
    },
    [blocks, revealParsedBlock, wide],
  );

  const activateFromCard = useCallback((block: LayoutBlock) => {
    setActiveComponentId(block.component_id);
    if (block.page !== null) setPageIndex(block.page);
  }, []);

  const collapseSource = () => {
    parsedPanelRef.current?.expand();
    sourcePanelRef.current?.collapse();
  };
  const collapseParsed = () => {
    sourcePanelRef.current?.expand();
    parsedPanelRef.current?.collapse();
  };

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
    <InspectorPane
      title="File preview"
      description="Original file"
      onCollapse={wide ? collapseSource : undefined}
      collapseLabel="Hide source preview"
      collapseIcon={<PanelLeftCloseIcon />}
      restoreAction={
        parsedCollapsed
          ? {
              label: "Show parsed content",
              icon: <PanelRightOpenIcon />,
              onClick: () => parsedPanelRef.current?.expand(),
            }
          : undefined
      }
    >
      <SourcePane
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
    <InspectorPane
      title="Parsed content"
      description="Rendered blocks and normalized JSON"
      onCollapse={wide ? collapseParsed : undefined}
      collapseLabel="Hide parsed content"
      collapseIcon={<PanelRightCloseIcon />}
      restoreAction={
        sourceCollapsed
          ? {
              label: "Show source preview",
              icon: <PanelLeftOpenIcon />,
              onClick: () => sourcePanelRef.current?.expand(),
            }
          : undefined
      }
    >
      <ParsedPane
        parsing={parsing}
        blocks={blocks}
        filteredBlocks={filteredBlocks}
        pages={pages}
        blockTypes={blockTypes}
        pageFilter={pageFilter}
        typeFilter={typeFilter}
        parsedMode={parsedMode}
        activeComponentId={activeComponentId}
        cardRefs={cardRefs}
        viewportRef={parsedViewportRef}
        onPageFilterChange={setPageFilter}
        onTypeFilterChange={setTypeFilter}
        onModeChange={setParsedMode}
        onActivate={activateFromCard}
        descriptionEdits={descriptionEdits}
        onDescriptionEdit={(componentId, description) =>
          setDescriptionEdits((current) => ({
            ...current,
            [componentId]: description,
          }))
        }
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
              defaultSize="52%"
              minSize="35%"
              maxSize="65%"
              collapsible
              collapsedSize={0}
              onResize={(size) => setSourceCollapsed(size.inPixels <= 1)}
            >
              {sourcePane}
            </ResizablePanel>
            <ResizableHandle
              withHandle
              aria-label="Resize source and parsed content panels"
            />
            <ResizablePanel
              id="parsed"
              panelRef={parsedPanelRef}
              defaultSize="48%"
              minSize="35%"
              maxSize="65%"
              collapsible
              collapsedSize={0}
              onResize={(size) => setParsedCollapsed(size.inPixels <= 1)}
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
                <TabsTrigger value="source">Source</TabsTrigger>
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
  const blockLabel = parsing.data
    ? `${parsing.data.blocks.length.toLocaleString()} blocks`
    : parsing.status === "loading"
      ? "Loading blocks"
      : parsing.status === "error"
        ? "Blocks unavailable"
        : "No blocks";
  const statusTone = context?.statusTone ?? "neutral";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 shrink-0 items-center gap-3 border-b bg-card px-3 py-2 sm:px-4">
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
        <h2 className="truncate text-sm font-semibold">
          {getDisplayName(file)}
        </h2>
      </div>
    </header>
  );
}

function InspectorPane({
  title,
  description,
  children,
  onCollapse,
  collapseLabel,
  collapseIcon,
  restoreAction,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onCollapse?: () => void;
  collapseLabel: string;
  collapseIcon: React.ReactNode;
  restoreAction?: { label: string; icon: React.ReactNode; onClick: () => void };
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </section>
  );
}

type SourcePaneProps = {
  file: ProcessingFile;
  preview: InspectorResource<InlinePreview>;
  blocks: LayoutBlock[];
  activeComponentId: string | null;
  pageIndex: number;
  showBoxes: boolean;
  zoom: number;
  onActivate: (componentId: string) => void;
  onPageIndexChange: (pageIndex: number) => void;
  onShowBoxesChange: (visible: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onRetry: () => void;
};

function SourcePane(props: SourcePaneProps) {
  const kind = getSourcePreviewKind(props.file);
  const expired = Boolean(
    props.preview.data && props.preview.data.expiresAt <= Date.now(),
  );

  if (kind === "unsupported") {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <Alert className="max-w-md">
          <FileSearchIcon />
          <AlertTitle>Unsupported preview format</AlertTitle>
          <AlertDescription>
            Browser preview is available for PDF, PNG, JPEG, and XLSX files.
            Parsed content remains available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (props.preview.status === "loading" && !props.preview.data) {
    return <SourceLoadingState label="Preparing source preview…" />;
  }

  if (expired || (props.preview.status === "error" && !props.preview.data)) {
    return (
      <ResourceError
        title={expired ? "Preview link expired" : "Preview failed"}
        message={
          expired
            ? "The secure preview link expired. Request a fresh link to continue."
            : (props.preview.error ?? "Unable to load the source preview.")
        }
        onRetry={props.onRetry}
      />
    );
  }

  if (!props.preview.data) return null;

  if (kind === "pdf") {
    return (
      <Suspense fallback={<SourceLoadingState label="Loading PDF viewer…" />}>
        <PdfSourceViewer
          url={props.preview.data.url}
          fileName={getDisplayName(props.file)}
          blocks={props.blocks}
          activeComponentId={props.activeComponentId}
          pageIndex={props.pageIndex}
          showBoxes={props.showBoxes}
          zoom={props.zoom}
          onActivate={props.onActivate}
          onPageIndexChange={props.onPageIndexChange}
          onShowBoxesChange={props.onShowBoxesChange}
          onZoomChange={props.onZoomChange}
          onRetry={props.onRetry}
        />
      </Suspense>
    );
  }

  if (kind === "xlsx") {
    return (
      <Suspense
        fallback={<SourceLoadingState label="Loading spreadsheet viewer…" />}
      >
        <SpreadsheetSourceViewer
          url={props.preview.data.url}
          fileName={getDisplayName(props.file)}
          onRetry={props.onRetry}
        />
      </Suspense>
    );
  }

  return (
    <ImageSourceViewer
      url={props.preview.data.url}
      fileName={getDisplayName(props.file)}
      blocks={props.blocks}
      activeComponentId={props.activeComponentId}
      showBoxes={props.showBoxes}
      zoom={props.zoom}
      onActivate={props.onActivate}
      onShowBoxesChange={props.onShowBoxesChange}
      onZoomChange={props.onZoomChange}
      onRetry={props.onRetry}
    />
  );
}

function ImageSourceViewer({
  url,
  fileName,
  blocks,
  activeComponentId,
  showBoxes,
  zoom,
  onActivate,
  onShowBoxesChange,
  onZoomChange,
  onRetry,
}: {
  url: string;
  fileName: string;
  blocks: LayoutBlock[];
  activeComponentId: string | null;
  showBoxes: boolean;
  zoom: number;
  onActivate: (componentId: string) => void;
  onShowBoxesChange: (visible: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onRetry: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => setImageError(false), [url]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !activeComponentId) return;
    const target = Array.from(
      viewport.querySelectorAll<HTMLElement>("[data-block-id]"),
    ).find((element) => element.dataset.blockId === activeComponentId);
    if (!target) return;
    scrollElementWithin(viewport, target, reducedMotion() ? "auto" : "smooth");
  }, [activeComponentId, zoom]);

  if (imageError) {
    return (
      <ResourceError
        title="Image preview failed"
        message="The signed image preview could not be rendered."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
      <SourceViewerToolbar
        positionLabel="1 / 1"
        previousDisabled
        nextDisabled
        onPrevious={() => undefined}
        onNext={() => undefined}
        zoom={zoom}
        zoomOutDisabled={zoom <= 0.65}
        zoomInDisabled={zoom >= 1.75}
        onZoomOut={() =>
          onZoomChange(Math.max(0.65, Number((zoom - 0.15).toFixed(2))))
        }
        onZoomIn={() =>
          onZoomChange(Math.min(1.75, Number((zoom + 0.15).toFixed(2))))
        }
        onFitWidth={() => onZoomChange(1)}
        onResetZoom={() => onZoomChange(1)}
        showBoxes={showBoxes}
        onShowBoxesChange={onShowBoxesChange}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div ref={viewportRef} className="min-w-0 p-4">
          <div
            className="relative mx-auto w-fit max-w-none overflow-hidden border bg-background shadow-sm"
            style={{
              width: `${zoom * 100}%`,
              minWidth: zoom > 1 ? "100%" : undefined,
            }}
          >
            <img
              className="block h-auto w-full"
              src={url}
              alt={`Source preview for ${fileName}`}
              onError={() => setImageError(true)}
            />
            <SourceBlockOverlay
              blocks={blocks.filter((block) => block.page === 0)}
              allBlocks={blocks}
              activeComponentId={activeComponentId}
              visible={showBoxes}
              onActivate={onActivate}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
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
  parsedMode: string;
  activeComponentId: string | null;
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  onPageFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onModeChange: (value: string) => void;
  onActivate: (block: LayoutBlock) => void;
  descriptionEdits: Record<string, string>;
  onDescriptionEdit: (componentId: string, description: string) => void;
  onRetry: () => void;
};

function ParsedPane({
  parsing,
  blocks,
  filteredBlocks,
  pages,
  blockTypes,
  pageFilter,
  typeFilter,
  parsedMode,
  activeComponentId,
  cardRefs,
  viewportRef,
  onPageFilterChange,
  onTypeFilterChange,
  onModeChange,
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

  const jsonValue = JSON.stringify(
    {
      document: parsing.data.document,
      processing_run: parsing.data.processingRun,
      reading_order: parsing.data.readingOrder,
      blocks: parsing.data.blocks,
    },
    null,
    2,
  );

  return (
    <Tabs
      value={parsedMode}
      onValueChange={onModeChange}
      className="min-h-0 flex-1 gap-0 overflow-hidden"
    >
      <div className="flex min-w-0 flex-col gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <TabsList aria-label="Parsed content modes">
            <TabsTrigger value="rendered">
              <Rows3Icon />
              Rendered
            </TabsTrigger>
            <TabsTrigger value="json">
              <BracesIcon />
              JSON
            </TabsTrigger>
          </TabsList>
          {parsedMode === "json" && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => void copyJson(jsonValue)}
            >
              <CopyIcon data-icon="inline-start" />
              Copy
            </Button>
          )}
        </div>
        {parsedMode === "rendered" && (
          <div className="grid min-w-0 grid-cols-2 gap-2">
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
        )}
      </div>

      <TabsContent
        value="rendered"
        keepMounted
        className="m-0 min-h-0 overflow-hidden"
      >
        <ScrollArea className="h-full min-h-0">
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
                      description={descriptionEdits[block.component_id]}
                      onDescriptionEdit={onDescriptionEdit}
                      onActivate={onActivate}
                    />
                  );
                })
              )}
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent
        value="json"
        keepMounted
        className="m-0 min-h-0 overflow-hidden"
      >
        <ScrollArea className="h-full min-h-0">
          <div className="p-3">
            <pre className="min-w-max rounded-lg border bg-muted/50 p-4 font-mono text-xs leading-relaxed text-foreground">
              {jsonValue}
            </pre>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
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
              <DropdownMenuRadioItem key={item.value} value={item.value}>
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
  onDescriptionEdit: (componentId: string, description: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(
    description ?? block.text ?? block.semantic_text ?? "",
  );
  const boxed = Boolean(block.bbox && block.page_bbox);
  const pageLabel = block.page === null ? "Page —" : `Page ${block.page + 1}`;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onDescriptionEdit(block.component_id, draft);
                    setEditing(false);
                  }}
                >
                  <CheckIcon data-icon="inline-start" />
                  Save
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

async function copyJson(value: string) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard access is unavailable.");
    }
    await navigator.clipboard.writeText(value);
    toast.success("Parsed JSON copied.");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Unable to copy parsed JSON.",
    );
  }
}

function SourceLoadingState({ label }: { label: string }) {
  return (
    <div className="grid min-h-0 flex-1 place-items-center p-6">
      <div className="flex w-full max-w-md flex-col gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-80" />
        <p className="text-center text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ResourceError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-0 flex-1 place-items-center p-6">
      <Alert variant="destructive" className="max-w-sm">
        <AlertCircleIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
        <Button
          className="mt-3"
          variant="outline"
          type="button"
          onClick={onRetry}
        >
          <RefreshCwIcon data-icon="inline-start" />
          Retry
        </Button>
      </Alert>
    </div>
  );
}
