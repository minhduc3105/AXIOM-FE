import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircleIcon,
  FileSearchIcon,
  RefreshCwIcon,
  ScanSearchIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
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
  const [activeComponentId, setActiveComponentId] = useState<string | null>(
    null,
  );
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
    if (
      !activeComponentId ||
      !blocks.some((block) => block.component_id === activeComponentId)
    ) {
      setActiveComponentId(blocks[0].component_id);
      if (blocks[0].page !== null) setPageIndex(blocks[0].page);
    }
  }, [activeComponentId, blocks]);

  const activateFromSource = useCallback((componentId: string) => {
    setActiveComponentId(componentId);
    cardRefs.current
      .get(componentId)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const activateFromCard = useCallback((block: LayoutBlock) => {
    setActiveComponentId(block.component_id);
    if (block.page !== null) setPageIndex(block.page);
  }, []);

  if (!file) {
    return (
      <Card className="min-h-[520px] xl:col-span-2 xl:min-h-0">
        <CardContent className="grid flex-1 place-items-center p-8 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <span className="grid size-12 place-items-center rounded-lg bg-muted text-primary">
              <FileSearchIcon />
            </span>
            <div>
              <h3 className="text-lg font-semibold">
                No indexed result selected
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Select an indexed file to compare its source with parsed
                content.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sourceKind = getSourcePreviewKind(file);

  return (
    <>
      <Card
        className="h-full min-h-[620px] min-w-0 gap-0 py-0 xl:min-h-0"
        aria-label="Source document inspector"
      >
        <CardHeader className="min-h-16 border-b py-3">
          <CardTitle className="truncate">{getDisplayName(file)}</CardTitle>
          <CardAction className="flex flex-wrap items-center justify-end gap-2">
            {sourceKind === "image" && (
              <Toggle
                variant="outline"
                size="sm"
                pressed={showBoxes}
                onPressedChange={setShowBoxes}
                aria-label="Toggle parsed layout boxes"
              >
                <ScanSearchIcon />
                Boxes
              </Toggle>
            )}
            <Badge variant="secondary">{blocks.length} blocks</Badge>
            <Badge>Indexed</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
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
        </CardContent>
      </Card>

      <Card
        className="h-full min-h-[620px] min-w-0 gap-0 py-0 xl:min-h-0"
        aria-label="Parsed content inspector"
      >
        <ParsedPane
          parsing={parsing}
          activeComponentId={activeComponentId}
          cardRefs={cardRefs}
          onActivate={activateFromCard}
          onRetry={onRetryParsing}
        />
      </Card>
    </>
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-foreground">
      {kind === "unsupported" ? (
        <div className="grid min-h-[420px] flex-1 place-items-center p-8">
          <Alert className="max-w-md">
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>
              Source preview is available for PDF, PNG, JPEG, and XLSX files.
              Parsed content remains available beside it.
            </AlertDescription>
          </Alert>
        </div>
      ) : props.preview.status === "loading" && !props.preview.data ? (
        <div className="grid min-h-[420px] flex-1 place-items-center p-6">
          <div className="flex w-full max-w-md flex-col gap-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-[360px]" />
          </div>
        </div>
      ) : props.preview.status === "error" && !props.preview.data ? (
        <ResourceError message={props.preview.error} onRetry={props.onRetry} />
      ) : props.preview.data && kind === "pdf" ? (
        <Suspense
          fallback={<SourceLoadingState label="Loading PDF viewer..." />}
        >
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
      ) : props.preview.data && kind === "xlsx" ? (
        <SpreadsheetSourceViewer
          url={props.preview.data.url}
          fileName={getDisplayName(props.file)}
        />
      ) : props.preview.data && imageError ? (
        <ResourceError
          message="The signed image preview could not be loaded."
          onRetry={props.onRetry}
        />
      ) : props.preview.data ? (
        <div className="min-h-[420px] flex-1 overflow-auto p-4">
          <div className="relative mx-auto w-fit max-w-full overflow-hidden bg-white shadow-2xl">
            <img
              className="block h-auto max-h-[calc(100dvh-180px)] max-w-full"
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

type SpreadsheetPreviewState =
  | { status: "loading"; data: null; error: null }
  | {
      status: "ready";
      data: {
        sheetName: string;
        sheetCount: number;
        columns: string[];
        rows: string[][];
      };
      error: null;
    }
  | { status: "error"; data: null; error: string };

function normalizeSheetRows(rows: string[][], width: number) {
  return rows.map((row) =>
    Array.from({ length: width }, (_, index) => row[index] ?? ""),
  );
}

async function parseSpreadsheetPreview(
  url: string,
  signal: AbortSignal,
): Promise<Extract<SpreadsheetPreviewState, { status: "ready" }>["data"]> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Workbook preview failed with HTTP ${response.status}.`);
  }
  const workbook = XLSX.read(await response.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName)
    throw new Error("The workbook does not contain a visible sheet.");
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<
    Array<string | number | boolean | Date | null>
  >(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
  const sampleRows = rawRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .slice(0, 30);
  const width = Math.min(
    Math.max(...sampleRows.map((row) => row.length), 1),
    16,
  );
  return {
    sheetName,
    sheetCount: workbook.SheetNames.length,
    columns: Array.from({ length: width }, (_, index) =>
      XLSX.utils.encode_col(index),
    ),
    rows: normalizeSheetRows(
      sampleRows.map((row) =>
        row
          .slice(0, width)
          .map((cell) =>
            cell instanceof Date ? cell.toLocaleString() : String(cell ?? ""),
          ),
      ),
      width,
    ),
  };
}

function SpreadsheetSourceViewer({
  url,
  fileName,
}: {
  url: string;
  fileName: string;
}) {
  const [state, setState] = useState<SpreadsheetPreviewState>({
    status: "loading",
    data: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });
    void parseSpreadsheetPreview(url, controller.signal)
      .then((data) => {
        setState({ status: "ready", data, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Unable to parse workbook preview.",
        });
      });
    return () => controller.abort();
  }, [url]);

  if (state.status === "loading") {
    return <SourceLoadingState label="Loading spreadsheet preview..." />;
  }
  if (state.status === "error") {
    return (
      <div className="grid min-h-[420px] flex-1 place-items-center p-6">
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircleIcon />
          <AlertTitle>Spreadsheet preview unavailable</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { columns, rows, sheetName, sheetCount } = state.data;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Badge>{sheetName}</Badge>
        <Badge variant="secondary">
          {sheetCount} sheet{sheetCount === 1 ? "" : "s"}
        </Badge>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {fileName}
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="min-w-max p-4">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length ? (
                  rows.map((row, rowIndex) => (
                    <TableRow key={`${sheetName}-${rowIndex}`}>
                      {columns.map((column, columnIndex) => (
                        <TableCell
                          key={`${column}-${columnIndex}`}
                          className="max-w-[280px] truncate"
                          title={row[columnIndex] ?? ""}
                        >
                          {row[columnIndex] || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No populated cells were found in this sheet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ParsedPane({
  parsing,
  activeComponentId,
  cardRefs,
  onActivate,
  onRetry,
}: ParsedPaneProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {parsing.status === "loading" && !parsing.data ? (
        <>
          <CardHeader className="min-h-14 border-b py-3">
            <CardTitle>Parsed content</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-40" />
            <Skeleton className="h-28" />
          </CardContent>
        </>
      ) : parsing.status === "error" && !parsing.data ? (
        <>
          <CardHeader className="min-h-14 border-b py-3">
            <CardTitle>Parsed content</CardTitle>
          </CardHeader>
          <CardContent className="grid flex-1 place-items-center p-6">
            <ResourceError message={parsing.error} onRetry={onRetry} />
          </CardContent>
        </>
      ) : parsing.data ? (
        <Tabs
          defaultValue="rendered"
          className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
        >
          <CardHeader className="min-h-14 border-b py-3">
            <CardTitle>Parsed content</CardTitle>
            <CardAction>
              <TabsList>
                <TabsTrigger value="rendered">Rendered</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
            </CardAction>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <TabsContent
              value="rendered"
              className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <ScrollArea className="min-h-0 flex-1">
                <div className="grid gap-3 p-3">
                  {parsing.data.blocks.length ? (
                    parsing.data.blocks.map((block, index) => (
                      <ParsedBlockCard
                        key={block.component_id}
                        block={block}
                        index={index}
                        active={activeComponentId === block.component_id}
                        cardRefs={cardRefs}
                        onActivate={onActivate}
                      />
                    ))
                  ) : (
                    <Alert>
                      <AlertTitle>No layout blocks</AlertTitle>
                      <AlertDescription className="whitespace-pre-wrap">
                        {parsing.data.mainText ||
                          "Corpus did not return block or main-text content for this document."}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent
              value="json"
              className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <ScrollArea className="min-h-0 flex-1">
                <pre className="m-3 overflow-x-auto rounded-xl bg-foreground p-4 text-xs leading-relaxed text-background">
                  {JSON.stringify(
                    {
                      document: parsing.data.document,
                      processing_run: parsing.data.processingRun,
                      reading_order: parsing.data.readingOrder,
                      blocks: parsing.data.blocks,
                    },
                    null,
                    2,
                  )}
                </pre>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      ) : null}
    </div>
  );
}

function ParsedBlockCard({
  block,
  index,
  active,
  cardRefs,
  onActivate,
}: {
  block: LayoutBlock;
  index: number;
  active: boolean;
  cardRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  onActivate: (block: LayoutBlock) => void;
}) {
  const boxed = Boolean(block.bbox && block.page_bbox);
  const pageLabel = block.page === null ? "Page -" : `Page ${block.page + 1}`;

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
        "cursor-pointer gap-0 py-0 transition hover:ring-primary/45 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "ring-primary",
      )}
      onMouseEnter={() => onActivate(block)}
      onClick={() => onActivate(block)}
      onKeyDown={handleKeyDown}
    >
      <CardHeader className="gap-2 bg-muted/40 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge>{(index + 1).toString().padStart(2, "0")}</Badge>
          <Badge variant="outline">{block.type}</Badge>
          <Badge variant="secondary">{pageLabel}</Badge>
          <Badge variant={boxed ? "secondary" : "outline"}>
            {boxed ? "Boxed" : "No box"}
          </Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <code className="block break-all bg-muted/55 px-3 py-2 font-mono text-[10px] text-muted-foreground">
          {block.component_id}
        </code>
        <Separator />
        <RenderedBlockContent block={block} />
      </CardContent>
    </Card>
  );
}

function SourceLoadingState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[420px] flex-1 place-items-center p-6">
      <div className="flex w-full max-w-md flex-col gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-[360px]" />
        <p className="text-center text-xs text-background/70">{label}</p>
      </div>
    </div>
  );
}

function ResourceError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[420px] flex-1 place-items-center p-6">
      <Alert variant="destructive" className="max-w-sm">
        <AlertCircleIcon />
        <AlertTitle>Resource unavailable</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
        <Button
          className="mt-4"
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
