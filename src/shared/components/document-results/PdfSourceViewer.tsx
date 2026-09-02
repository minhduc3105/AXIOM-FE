import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircleIcon } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBlockOverlayDiagnostic,
  type LayoutBlock,
} from "@/shared/types/document-results";
import { SourceBlockOverlay } from "./SourceBlockOverlay";
import { SourceViewerToolbar } from "./SourceViewerToolbar";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PdfSourceViewerProps = {
  url: string;
  fileName: string;
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

type PageDimensions = {
  width: number;
  height: number;
};

type PdfPageLike = {
  getViewport: (options: { scale: number }) => PageDimensions;
};

type PdfDocumentLike = {
  numPages: number;
};

const getScrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

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

export default function PdfSourceViewer({
  url,
  fileName,
  blocks,
  activeComponentId,
  pageIndex,
  showBoxes,
  zoom,
  onActivate,
  onPageIndexChange,
  onShowBoxesChange,
  onZoomChange,
  onRetry,
}: PdfSourceViewerProps) {
  const widthRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(640);
  const [pageCount, setPageCount] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<
    Record<number, PageDimensions>
  >({});
  const [loadError, setLoadError] = useState<{
    url: string;
    message: string;
  } | null>(null);

  useLayoutEffect(() => {
    const element = widthRef.current;
    if (!element) return;
    const update = () =>
      setContainerWidth(Math.max(280, element.clientWidth - 32));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const activePage = pageCount
    ? Math.min(Math.max(pageIndex, 0), pageCount - 1)
    : 0;
  const activeBlockPage =
    blocks.find((block) => block.component_id === activeComponentId)?.page ??
    null;
  const activeBlockDimensions =
    activeBlockPage === null ? undefined : pageDimensions[activeBlockPage];
  const renderedWidth = Math.round(containerWidth * zoom);
  const coordinateDiagnostics = useMemo(
    () =>
      Object.fromEntries(
        blocks.map((block) => [
          block.component_id,
          getBlockOverlayDiagnostic(
            block,
            block.page === null ? undefined : pageDimensions[block.page],
          ),
        ]),
      ),
    [blocks, pageDimensions],
  );

  useEffect(() => {
    if (pageCount && pageIndex !== activePage) onPageIndexChange(activePage);
  }, [activePage, onPageIndexChange, pageCount, pageIndex]);
  useEffect(() => {
    const content = contentRef.current;
    const viewport = content?.closest<HTMLElement>(
      "[data-slot='scroll-area-viewport']",
    );
    if (!viewport || !pageCount || typeof viewport.scrollTo !== "function") {
      return;
    }
    viewport.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activePage, pageCount, zoom]);
  useEffect(() => {
    const content = contentRef.current;
    const viewport = content?.closest<HTMLElement>(
      "[data-slot='scroll-area-viewport']",
    );
    if (!content || !viewport || !activeComponentId) return;
    const target = Array.from(
      content.querySelectorAll<HTMLElement>("[data-block-id]"),
    ).find((element) => element.dataset.blockId === activeComponentId);
    if (!target) return;
    scrollElementWithin(viewport, target, getScrollBehavior());
  }, [activeBlockDimensions, activeComponentId, activePage, zoom]);
  const goToPage = (next: number) =>
    pageCount && onPageIndexChange(Math.min(Math.max(next, 0), pageCount - 1));

  const loadDocument = useCallback((pdf: PdfDocumentLike) => {
    setPageCount(pdf.numPages);
    setLoadError(null);
    setPageDimensions({});
  }, []);

  const loadPageDimensions = useCallback((index: number, page: PdfPageLike) => {
    const dimensions = page.getViewport({ scale: 1 });
    setPageDimensions((current) => {
      const previous = current[index];
      if (
        previous?.width === dimensions.width &&
        previous.height === dimensions.height
      ) {
        return current;
      }
      return { ...current, [index]: dimensions };
    });
  }, []);
  const dimensions = pageDimensions[activePage];
  const pageHeight = dimensions
    ? Math.round((renderedWidth * dimensions.height) / dimensions.width)
    : undefined;

  return (
    <div
      ref={widthRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30"
    >
      <SourceViewerToolbar
        positionLabel={pageCount ? `${activePage + 1} / ${pageCount}` : "… / …"}
        previousDisabled={activePage <= 0}
        nextDisabled={!pageCount || activePage >= pageCount - 1}
        onPrevious={() => goToPage(activePage - 1)}
        onNext={() => goToPage(activePage + 1)}
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
        <div ref={contentRef} className="min-w-0 space-y-4 p-4">
          {loadError?.url === url ? (
            <PdfError message={loadError.message} onRetry={onRetry} />
          ) : (
            <Document
              file={url}
              loading={<PdfLoadingState label="Loading PDF..." />}
              onLoadSuccess={loadDocument}
              onLoadError={(error) =>
                setLoadError({ url, message: error.message })
              }
            >
              <div
                className="mx-auto w-fit overflow-hidden border bg-white shadow-sm"
                data-page-index={activePage}
                key={activePage}
                aria-label={`PDF page ${activePage + 1} for ${fileName}`}
              >
                <div
                  className="relative"
                  data-testid={`pdf-page-frame-${activePage}`}
                  style={{
                    width: `${renderedWidth}px`,
                    ...(pageHeight ? { height: `${pageHeight}px` } : {}),
                  }}
                >
                  <Page
                    key={activePage}
                    pageNumber={activePage + 1}
                    width={renderedWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    loading={<PdfLoadingState label="Rendering page..." />}
                    onLoadSuccess={(page) =>
                      loadPageDimensions(activePage, page)
                    }
                  />
                  {dimensions ? (
                    <SourceBlockOverlay
                      blocks={blocks.filter(
                        (block) => block.page === activePage,
                      )}
                      allBlocks={blocks}
                      activeComponentId={activeComponentId}
                      visible={showBoxes}
                      coordinateDiagnostics={coordinateDiagnostics}
                      onActivate={onActivate}
                    />
                  ) : null}
                </div>
              </div>
            </Document>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PdfError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[480px] place-items-center p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>PDF preview failed</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
        <Button
          className="mt-3"
          type="button"
          variant="outline"
          onClick={onRetry}
        >
          Retry preview
        </Button>
      </Alert>
    </div>
  );
}
function PdfLoadingState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[480px] place-items-center p-6">
      <div className="flex w-full max-w-md flex-col gap-3">
        <Skeleton className="h-8" />
        <Skeleton className="h-[420px]" />
        <p className="text-center text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
