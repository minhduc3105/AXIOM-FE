import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { FileSearchIcon, RefreshCwIcon, ScanSearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/shared/lib/utils";
import type {
  InlinePreview,
  InspectorResource,
  LayoutBlock,
  ParsedDocumentResult,
} from "../model/documentResults";
import { getSourcePreviewKind, type ProcessingFile } from "../model/types";
import { RenderedBlockContent } from "./RenderedBlockContent";
import { SourceBlockOverlay } from "./SourceBlockOverlay";

const PdfSourceViewer = lazy(() => import("./PdfSourceViewer"));

type DocumentResultViewerProps = {
  file: ProcessingFile | null;
  runId: string | null;
  preview: InspectorResource<InlinePreview>;
  parsing: InspectorResource<ParsedDocumentResult>;
  onRetryPreview: () => void;
  onRetryParsing: () => void;
};

function getDisplayName(file: ProcessingFile) {
  return file.filename ?? file.key.split("/").filter(Boolean).pop() ?? file.key;
}

export function DocumentResultViewer({
  file,
  runId,
  preview,
  parsing,
  onRetryPreview,
  onRetryParsing,
}: DocumentResultViewerProps) {
  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);
  const [zoom, setZoom] = useState(1);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const blocks = parsing.data?.blocks ?? [];

  useEffect(() => {
    setActiveComponentId(null);
    setPageIndex(0);
    setZoom(1);
  }, [file?.key]);

  useEffect(() => {
    if (!blocks.length) {
      setActiveComponentId(null);
      return;
    }
    if (!activeComponentId || !blocks.some((block) => block.component_id === activeComponentId)) {
      setActiveComponentId(blocks[0].component_id);
      if (blocks[0].page !== null) setPageIndex(blocks[0].page);
    }
  }, [activeComponentId, blocks]);

  const activateFromSource = useCallback((componentId: string) => {
    setActiveComponentId(componentId);
    cardRefs.current.get(componentId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const activateFromCard = useCallback((block: LayoutBlock) => {
    setActiveComponentId(block.component_id);
    if (block.page !== null) setPageIndex(block.page);
  }, []);

  if (!file) {
    return (
      <div className="grid min-h-[680px] place-items-center rounded-[28px] border border-dashed bg-card/70 p-8 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-primary">
            <FileSearchIcon />
          </span>
          <h3 className="mt-4 text-lg font-semibold">No indexed result selected</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an indexed file to compare its source with parsed content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[28px] border bg-card/95" aria-label="Parsed document inspector">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{getDisplayName(file)}</h3>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{file.key}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{blocks.length} blocks</Badge>
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Indexed</Badge>
        </div>
        {runId && <span className="w-full truncate font-mono text-[10px] text-muted-foreground">Run {runId}</span>}
      </header>

      <div className="grid min-h-[680px] xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
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
        <ParsedPane
          parsing={parsing}
          activeComponentId={activeComponentId}
          cardRefs={cardRefs}
          onActivate={activateFromCard}
          onRetry={onRetryParsing}
        />
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
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [props.preview.data?.url]);
  return (
    <div className="flex min-h-0 min-w-0 flex-col border-b bg-[#25241f] xl:border-b-0 xl:border-r">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 bg-[#191915] px-4 text-white">
        <div className="min-w-0">
          <strong className="block text-sm">Source document</strong>
          <span className="block truncate text-[10px] uppercase tracking-[0.14em] text-white/55">
            {kind === "unsupported" ? "Preview unavailable" : `${kind.toUpperCase()} · inline preview`}
          </span>
        </div>
        {kind === "image" && (
          <Toggle
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10 hover:text-white data-[state=on]:bg-amber-300 data-[state=on]:text-[#191915]"
            pressed={props.showBoxes}
            onPressedChange={props.onShowBoxesChange}
            aria-label="Toggle parsed layout boxes"
          >
            <ScanSearchIcon />
            Boxes
          </Toggle>
        )}
      </div>
      {kind === "unsupported" ? (
        <div className="grid min-h-[520px] flex-1 place-items-center p-8 text-center text-sm text-white/65">
          Source preview is available for PDF, PNG, and JPEG files. Parsed content remains available beside it.
        </div>
      ) : props.preview.status === "loading" && !props.preview.data ? (
        <div className="grid min-h-[520px] flex-1 place-items-center p-6">
          <div className="w-full max-w-md space-y-3">
            <Skeleton className="h-10 bg-white/10" />
            <Skeleton className="h-[430px] bg-white/10" />
          </div>
        </div>
      ) : props.preview.status === "error" && !props.preview.data ? (
        <ResourceError message={props.preview.error} onRetry={props.onRetry} dark />
      ) : props.preview.data && kind === "pdf" ? (
        <Suspense fallback={<div className="grid min-h-[520px] place-items-center text-sm text-white/70">Loading PDF viewer…</div>}>
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
          />
        </Suspense>
      ) : props.preview.data && imageError ? (
        <ResourceError message="The signed image preview could not be loaded." onRetry={props.onRetry} dark />
      ) : props.preview.data ? (
        <div className="min-h-[520px] flex-1 overflow-auto p-4">
          <div className="relative mx-auto w-fit max-w-full overflow-hidden bg-white shadow-2xl">
            <img
              className="block h-auto max-h-[720px] max-w-full"
              src={props.preview.data.url}
              alt={`Source preview for ${getDisplayName(props.file)}`}
              onError={() => setImageError(true)}
            />
            <SourceBlockOverlay
              blocks={props.blocks.filter((block) => block.page === 0)}
              allBlocks={props.blocks}
              activeComponentId={props.activeComponentId}
              visible={props.showBoxes}
              onActivate={props.onActivate}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ParsedPaneProps = {
  parsing: InspectorResource<ParsedDocumentResult>;
  activeComponentId: string | null;
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onActivate: (block: LayoutBlock) => void;
  onRetry: () => void;
};

function ParsedPane({ parsing, activeComponentId, cardRefs, onActivate, onRetry }: ParsedPaneProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-muted/35">
      {parsing.status === "loading" && !parsing.data ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-40" />
          <Skeleton className="h-28" />
        </div>
      ) : parsing.status === "error" && !parsing.data ? (
        <ResourceError message={parsing.error} onRetry={onRetry} />
      ) : parsing.data ? (
        <Tabs defaultValue="rendered" className="min-h-0 flex-1 gap-0">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b bg-card px-4">
            <div>
              <strong className="block text-sm">Parsed content</strong>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">JSON reading order</span>
            </div>
            <TabsList>
              <TabsTrigger value="rendered">Rendered</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="rendered" className="min-h-0">
            <ScrollArea className="h-[624px]">
              <div className="grid gap-3 p-3">
                {parsing.data.blocks.length ? parsing.data.blocks.map((block, index) => {
                  const active = activeComponentId === block.component_id;
                  const boxed = Boolean(block.bbox && block.page_bbox);
                  return (
                    <article
                      ref={(element) => {
                        if (element) cardRefs.current.set(block.component_id, element);
                        else cardRefs.current.delete(block.component_id);
                      }}
                      className={cn(
                        "cursor-pointer overflow-hidden rounded-xl border bg-card transition hover:border-primary/45 focus-within:border-primary",
                        active && "border-primary shadow-[0_0_0_2px_color-mix(in_srgb,var(--primary)_18%,transparent)]",
                      )}
                      key={block.component_id}
                      onMouseEnter={() => onActivate(block)}
                    >
                      <button
                        type="button"
                        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        aria-label={`Show ${block.component_id} in source document`}
                        aria-pressed={active}
                        onClick={() => onActivate(block)}
                      >
                        <span className="flex min-h-9 items-center gap-2 bg-[#191915] px-3 text-white">
                          <i className="min-w-6 bg-amber-300 px-1 py-0.5 text-center font-mono text-[10px] font-bold not-italic text-[#191915]">
                            {(index + 1).toString().padStart(2, "0")}
                          </i>
                          <b className="font-mono text-[10px] uppercase tracking-[0.08em] text-amber-300">{block.type}</b>
                          <small className="ml-auto font-mono text-[9px] text-white/55">
                            {block.page === null ? "Page —" : `Page ${block.page + 1}`} · {boxed ? "Boxed" : "No box"}
                          </small>
                        </span>
                        <code className="block break-all border-b bg-muted/55 px-3 py-2 font-mono text-[10px] text-muted-foreground">
                          {block.component_id}
                        </code>
                      </button>
                      <RenderedBlockContent block={block} />
                    </article>
                  );
                }) : (
                  <div className="rounded-xl border border-dashed bg-card p-5">
                    <strong className="text-sm">No layout blocks</strong>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {parsing.data.mainText || "Corpus did not return block or main-text content for this document."}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="json" className="min-h-0">
            <ScrollArea className="h-[624px]">
              <pre className="m-3 overflow-x-auto rounded-xl border bg-[#191915] p-4 text-xs leading-relaxed text-[#eee8dc]">
                {JSON.stringify({
                  document: parsing.data.document,
                  processing_run: parsing.data.processingRun,
                  reading_order: parsing.data.readingOrder,
                  blocks: parsing.data.blocks,
                }, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

function ResourceError({ message, onRetry, dark = false }: { message: string; onRetry: () => void; dark?: boolean }) {
  return (
    <div className={cn("grid min-h-[520px] flex-1 place-items-center p-6 text-center", dark && "text-white")}>
      <div className="max-w-sm">
        <p className={cn("text-sm text-destructive", dark && "text-red-200")}>{message}</p>
        <Button className="mt-4" variant={dark ? "secondary" : "outline"} type="button" onClick={onRetry}>
          <RefreshCwIcon data-icon="inline-start" />
          Retry
        </Button>
      </div>
    </div>
  );
}
