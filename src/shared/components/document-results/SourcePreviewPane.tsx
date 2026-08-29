import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AlertCircleIcon, FileSearchIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSourcePreviewKind,
  type InlinePreview,
  type InspectorResource,
  type LayoutBlock,
  type ProcessingFile,
} from "@/shared/types/document-results";
import { SourceBlockOverlay } from "./SourceBlockOverlay";
import { SourceViewerToolbar } from "./SourceViewerToolbar";

const DocxSourceViewer = lazy(() => import("./DocxSourceViewer"));
const PdfSourceViewer = lazy(() => import("./PdfSourceViewer"));
const SpreadsheetSourceViewer = lazy(() => import("./SpreadsheetSourceViewer"));

export type SourcePreviewPaneProps = {
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

function getDisplayName(file: ProcessingFile) {
  return file.filename ?? file.key.split("/").filter(Boolean).pop() ?? file.key;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollElementWithin(
  viewport: HTMLElement,
  target: HTMLElement,
  behavior: ScrollBehavior,
) {
  const scrollViewport =
    viewport.closest<HTMLElement>("[data-slot='scroll-area-viewport']") ?? viewport;
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

export function SourcePreviewPane(props: SourcePreviewPaneProps) {
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
            Browser preview is available for PDF, PNG, JPEG, XLSX, and DOCX files. Parsed content remains available.
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
  const fileName = getDisplayName(props.file);

  if (kind === "pdf") {
    return (
      <Suspense fallback={<SourceLoadingState label="Loading PDF viewer…" />}>
        <PdfSourceViewer
          url={props.preview.data.url}
          fileName={fileName}
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
      <Suspense fallback={<SourceLoadingState label="Loading spreadsheet viewer…" />}>
        <SpreadsheetSourceViewer
          url={props.preview.data.url}
          fileName={fileName}
          onRetry={props.onRetry}
        />
      </Suspense>
    );
  }

  if (kind === "docx") {
    return (
      <Suspense fallback={<SourceLoadingState label="Loading document viewer…" />}>
        <DocxSourceViewer
          url={props.preview.data.url}
          fileName={fileName}
          onRetry={props.onRetry}
        />
      </Suspense>
    );
  }

  return <ImageSourceViewer {...props} url={props.preview.data.url} fileName={fileName} />;
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
}: SourcePreviewPaneProps & { url: string; fileName: string }) {
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
        onZoomOut={() => onZoomChange(Math.max(0.65, Number((zoom - 0.15).toFixed(2))))}
        onZoomIn={() => onZoomChange(Math.min(1.75, Number((zoom + 0.15).toFixed(2))))}
        onFitWidth={() => onZoomChange(1)}
        onResetZoom={() => onZoomChange(1)}
        showBoxes={showBoxes}
        onShowBoxesChange={onShowBoxesChange}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div ref={viewportRef} className="min-w-0 p-4">
          <div
            className="relative mx-auto w-fit max-w-none overflow-hidden border bg-background shadow-sm"
            style={{ width: `${zoom * 100}%`, minWidth: zoom > 1 ? "100%" : undefined }}
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

export function SourceLoadingState({ label }: { label: string }) {
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

export function ResourceError({
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
        <Button className="mt-3" variant="outline" type="button" onClick={onRetry}>
          <RefreshCwIcon data-icon="inline-start" />
          Retry
        </Button>
      </Alert>
    </div>
  );
}
