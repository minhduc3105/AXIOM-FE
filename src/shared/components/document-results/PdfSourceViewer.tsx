import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ScanSearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import type { LayoutBlock } from "@/shared/types/document-results";
import { SourceBlockOverlay } from "./SourceBlockOverlay";

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
}: PdfSourceViewerProps) {
  const widthRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(640);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const pageBlocks = blocks.filter((block) => block.page === pageIndex);
  const renderedWidth = Math.round(containerWidth * zoom);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-foreground" ref={widthRef}>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 bg-foreground px-3 py-2 text-background">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-background hover:bg-background/10 hover:text-background"
            type="button"
            disabled={pageIndex <= 0}
            aria-label="Previous PDF page"
            onClick={() => onPageIndexChange(Math.max(0, pageIndex - 1))}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-20 text-center text-xs font-semibold">
            {pageCount ? `${pageIndex + 1} / ${pageCount}` : "Loading..."}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-background hover:bg-background/10 hover:text-background"
            type="button"
            disabled={!pageCount || pageIndex >= pageCount - 1}
            aria-label="Next PDF page"
            onClick={() =>
              onPageIndexChange(Math.min(pageCount - 1, pageIndex + 1))
            }
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-background hover:bg-background/10 hover:text-background"
            type="button"
            disabled={zoom <= 0.65}
            aria-label="Zoom out PDF"
            onClick={() =>
              onZoomChange(Math.max(0.65, Number((zoom - 0.15).toFixed(2))))
            }
          >
            <ZoomOutIcon />
          </Button>
          <span className="min-w-12 text-center text-xs">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-background hover:bg-background/10 hover:text-background"
            type="button"
            disabled={zoom >= 1.6}
            aria-label="Zoom in PDF"
            onClick={() =>
              onZoomChange(Math.min(1.6, Number((zoom + 0.15).toFixed(2))))
            }
          >
            <ZoomInIcon />
          </Button>
          <Toggle
            variant="outline"
            size="sm"
            className="text-background hover:bg-background/10 hover:text-background data-[state=on]:bg-background data-[state=on]:text-foreground"
            pressed={showBoxes}
            onPressedChange={onShowBoxesChange}
            aria-label="Toggle parsed layout boxes"
          >
            <ScanSearchIcon />
            Boxes
          </Toggle>
        </div>
      </div>
      <Separator />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loadError ? (
          <div className="grid min-h-[480px] place-items-center p-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircleIcon />
              <AlertTitle>PDF preview unavailable</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
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
            onLoadError={(error) => setLoadError(error.message)}
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
        <p className="text-center text-xs text-background/70">{label}</p>
      </div>
    </div>
  );
}
