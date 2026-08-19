import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LayoutBlock } from "@/shared/types/document-results";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(640);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState<{
    url: string;
    message: string;
  } | null>(null);
  const [renderVersion, setRenderVersion] = useState(0);

  useLayoutEffect(() => {
    const element = widthRef.current;
    if (!element) return;
    const updateWidth = () =>
      setContainerWidth(Math.max(280, element.clientWidth - 32));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (pageCount > 0 && pageIndex >= pageCount)
      onPageIndexChange(pageCount - 1);
  }, [onPageIndexChange, pageCount, pageIndex]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport || !activeComponentId) return;
    const target = Array.from(
      viewport.querySelectorAll<HTMLElement>("[data-block-id]"),
    ).find((element) => element.dataset.blockId === activeComponentId);
    if (!target) return;
    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    viewport.scrollTo({
      top:
        viewport.scrollTop +
        targetRect.top -
        viewportRect.top -
        viewport.clientHeight / 2 +
        targetRect.height / 2,
      left:
        viewport.scrollLeft +
        targetRect.left -
        viewportRect.left -
        viewport.clientWidth / 2 +
        targetRect.width / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [activeComponentId, pageIndex, renderVersion]);

  const pageBlocks = blocks.filter((block) => block.page === pageIndex);
  const renderedWidth = Math.round(containerWidth * zoom);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/30" ref={widthRef}>
      <SourceViewerToolbar
        positionLabel={pageCount ? `${pageIndex + 1} / ${pageCount}` : "… / …"}
        previousDisabled={pageIndex <= 0}
        nextDisabled={!pageCount || pageIndex >= pageCount - 1}
        onPrevious={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
        onNext={() =>
          onPageIndexChange(Math.min(pageCount - 1, pageIndex + 1))
        }
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
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-4">
        {loadError?.url === url ? (
          <div className="grid min-h-[480px] place-items-center p-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircleIcon />
              <AlertTitle>PDF preview failed</AlertTitle>
              <AlertDescription>{loadError.message}</AlertDescription>
              <Button className="mt-3" variant="outline" onClick={onRetry}>
                Retry preview
              </Button>
            </Alert>
          </div>
        ) : (
          <Document
            file={url}
            loading={<PdfLoadingState label="Loading PDF..." />}
            onLoadSuccess={(pdf) => {
              setPageCount(pdf.numPages);
              setLoadError(null);
            }}
            onLoadError={(error) =>
              setLoadError({ url, message: error.message })
            }
          >
            <div
              className="relative mx-auto w-fit overflow-hidden bg-white shadow-2xl"
              aria-label={`PDF page for ${fileName}`}
            >
              <Page
                pageNumber={pageIndex + 1}
                width={renderedWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={<PdfLoadingState label="Rendering page..." />}
                onRenderSuccess={() => setRenderVersion((value) => value + 1)}
              />
              <SourceBlockOverlay
                blocks={pageBlocks}
                allBlocks={blocks}
                activeComponentId={activeComponentId}
                visible={showBoxes}
                onActivate={onActivate}
              />
            </div>
          </Document>
        )}
      </div>
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
