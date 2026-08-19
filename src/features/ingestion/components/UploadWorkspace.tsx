import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import DOMPurify from "dompurify";
import {
  FileTextIcon,
  RotateCcwIcon,
  Trash2Icon,
  UploadCloudIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { flexRender } from "@tanstack/react-table";
import {
  getCoreRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from "@tanstack/react-table/legacy";
import ReactMarkdown from "react-markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";
import type { UploadFilesResponse } from "../api/ingestionApi";
import { type AsyncStatus, type IngestionFile } from "../model/types";
import {
  buildUploadDataPreview,
  emptyDataPreview,
  getUploadPreviewKind,
  type DataPreviewState,
} from "../model/uploadPreviewFactory";
import {
  UPLOAD_FILE_ACCEPT,
  UPLOAD_FILE_SUPPORTED_FORMAT_LABEL,
} from "../model/uploadFileRegistry";

type UploadWorkspaceProps = {
  files: IngestionFile[];
  selectedFileId: string | null;
  uploadStatus: AsyncStatus;
  uploadResult: UploadFilesResponse | null;
  onFiles: (files: FileList | File[]) => void;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onUpload: () => void;
  onProcessing: () => void;
  onBack: () => void;
};

export function UploadWorkspace({
  files,
  selectedFileId,
  uploadStatus,
  uploadResult,
  onFiles,
  onSelectFile,
  onRemoveFile,
  onUpload,
  onProcessing,
  onBack,
}: UploadWorkspaceProps) {
  const [dragging, setDragging] = useState(false);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [dataPreview, setDataPreview] =
    useState<DataPreviewState>(emptyDataPreview);
  const inputId = "axiom-upload-more";
  const uploading = uploadStatus === "loading";
  const uploaded = uploadStatus === "success";
  const selected = files.find((file) => file.id === selectedFileId) ?? files[0];
  const selectedPreviewKind = selected
    ? getUploadPreviewKind(selected.name)
    : null;
  const selectedIsPdf = selectedPreviewKind === "pdf";
  const selectedIsImage = selectedPreviewKind === "image";
  const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0);
  const totalSize =
    totalBytes < 1024 * 1024
      ? `${(totalBytes / 1024).toFixed(1)} KB`
      : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  const uploadProgress = uploading
    ? 62
    : uploaded
      ? 100
      : files.length
        ? 16
        : 0;

  useEffect(() => {
    if ((!selectedIsPdf && !selectedIsImage) || !selected) {
      setSourcePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selected.file);
    setSourcePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selected, selectedIsImage, selectedIsPdf]);

  useEffect(() => {
    if (!selected || selectedIsPdf || selectedIsImage) {
      setDataPreview(emptyDataPreview);
      return;
    }

    let cancelled = false;
    setDataPreview({
      ...emptyDataPreview,
      status: "loading",
      title: selected.name,
      description: "Reading preview from the selected upload file.",
    });
    void buildUploadDataPreview(selected)
      .then((preview) => {
        if (!cancelled) setDataPreview(preview);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDataPreview({
          status: "error",
          presentation: "metadata",
          title: selected.name,
          description: "Unable to generate a browser-side preview.",
          columns: ["Property", "Value"],
          rows: [
            ["File name", selected.name],
            ["Size", selected.sizeLabel],
          ],
          metrics: [
            { label: "Type", value: selected.extension.toUpperCase() },
            { label: "Size", value: selected.sizeLabel },
          ],
          error:
            error instanceof Error
              ? error.message
              : "The selected file could not be read.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [selected, selectedIsImage, selectedIsPdf]);

  const dropFiles = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!uploading && event.dataTransfer.files.length) {
      onFiles(event.dataTransfer.files);
    }
  };

  return (
    <div className="grid min-h-[calc(100dvh-var(--app-top-bar-height)-360px)] items-stretch gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="h-full rounded-3xl bg-card/90">
        <CardHeader>
          <CardTitle className="text-2xl">Upload queue</CardTitle>
          <CardDescription>
            Stage files before transfer into AXIOM-managed storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field>
            <FieldLabel
              htmlFor={inputId}
              className={cn(
                "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/60 p-8 text-center transition-colors",
                dragging && "border-primary bg-primary/10",
                uploading && "cursor-not-allowed opacity-60",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                if (!uploading) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={dropFiles}
            >
              <UploadCloudIcon
                className="text-muted-foreground"
                aria-hidden="true"
              />
              <strong>Drop or browse multiple files</strong>
              <span className="max-w-64 text-sm text-muted-foreground">
                {UPLOAD_FILE_SUPPORTED_FORMAT_LABEL} files are supported.
              </span>
              <Input
                id={inputId}
                className="sr-only"
                type="file"
                multiple
                disabled={uploading}
                accept={UPLOAD_FILE_ACCEPT}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  event.target.files && onFiles(event.target.files)
                }
              />
            </FieldLabel>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <QueueMetric value={files.length.toString()} label="Files" />
            <QueueMetric value={totalSize} label="Size" />
          </div>

          <Separator />

          <ScrollArea className="h-[min(280px,34vh)] pr-2">
            <div className="flex flex-col gap-3">
              {files.map((file) => {
                const isSelected = file.id === selected?.id;
                return (
                  <div
                    className={cn(
                      "grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-background p-3 transition-colors hover:bg-muted",
                      isSelected && "border-primary bg-primary/10",
                    )}
                    data-state={isSelected ? "active" : "inactive"}
                    key={file.id}
                  >
                    <Button
                      variant="ghost"
                      type="button"
                      className="grid h-auto min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] justify-stretch gap-3 p-0 text-left hover:bg-transparent"
                      onClick={() => onSelectFile(file.id)}
                    >
                      <Badge
                        variant={isSelected ? "default" : "secondary"}
                        className="size-10 rounded-lg p-0"
                      >
                        {file.extension}
                      </Badge>
                      <span className="grid min-w-0 gap-0.5">
                        <strong className="truncate">{file.name}</strong>
                        <small className="truncate text-muted-foreground">
                          {file.sizeLabel} ·{" "}
                          {uploading
                            ? "uploading"
                            : uploaded
                              ? "stored"
                              : "ready"}
                        </small>
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      title={`Remove ${file.name}`}
                      disabled={uploading || uploaded}
                      onClick={() => onRemoveFile(file.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {uploadResult && <UploadSuccessAlert uploadResult={uploadResult} />}
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={uploading}
            type="button"
          >
            Back
          </Button>
          <Button
            onClick={uploaded ? onProcessing : onUpload}
            disabled={!files.length || uploading}
            type="button"
          >
            {uploading
              ? "Uploading..."
              : uploaded
                ? "View processing"
                : uploadStatus === "error"
                  ? "Retry upload"
                  : "Upload files"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="h-full min-h-[720px] rounded-3xl bg-card/90">
        <CardHeader>
          <CardTitle className="truncate text-2xl">
            {selected?.name ?? "Select a file"}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary">
              {selected?.extension ?? "No file"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-5">
          {!selected ? (
            <EmptyPreview />
          ) : selectedIsPdf ? (
            <PdfPreview
              fileName={selected?.name}
              pdfPreviewUrl={sourcePreviewUrl}
            />
          ) : selectedIsImage ? (
            <ImagePreview
              fileName={selected?.name}
              imagePreviewUrl={sourcePreviewUrl}
            />
          ) : (
            <DataPreview preview={dataPreview} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="grid min-h-[560px] flex-1 place-items-center rounded-xl border bg-muted/30 p-6 text-center text-muted-foreground">
      Add a file to preview it here.
    </div>
  );
}

export function ImagePreview({
  fileName,
  imagePreviewUrl,
}: {
  fileName: string | undefined;
  imagePreviewUrl: string | null;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-auto rounded-xl border bg-foreground p-5">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border bg-card/90 p-1 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={zoom <= 0.5}
          onClick={() => setZoom((current) => Math.max(0.5, current - 0.25))}
        >
          <ZoomOutIcon />
        </Button>
        <span className="min-w-11 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={zoom >= 3}
          onClick={() => setZoom((current) => Math.min(3, current + 0.25))}
        >
          <ZoomInIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Reset zoom"
          disabled={zoom === 1}
          onClick={() => setZoom(1)}
        >
          <RotateCcwIcon />
        </Button>
      </div>
      {imagePreviewUrl ? (
        <img
          className="m-auto max-h-[680px] max-w-full origin-center object-contain shadow-2xl transition-transform duration-200"
          src={imagePreviewUrl}
          alt={fileName ? `Image preview for ${fileName}` : "Image preview"}
          style={{ transform: `scale(${zoom})` }}
        />
      ) : (
        <div className="grid min-h-[560px] flex-1 place-items-center text-muted-foreground">
          Preparing image preview...
        </div>
      )}
    </div>
  );
}

function QueueMetric({ value, label }: { value: string; label: string }) {
  return (
    <Card size="sm" className="bg-muted/60">
      <CardHeader>
        <CardTitle className="text-2xl">{value}</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function PdfPreview({
  fileName,
  pdfPreviewUrl,
}: {
  fileName: string | undefined;
  pdfPreviewUrl: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted/30">
        {pdfPreviewUrl ? (
          <object
            className="h-full min-h-[560px] w-full"
            data={`${pdfPreviewUrl}#view=FitH`}
            type="application/pdf"
            aria-label={
              fileName ? `PDF preview for ${fileName}` : "PDF preview"
            }
          >
            <iframe
              className="h-full min-h-[560px] w-full"
              src={pdfPreviewUrl}
              title={fileName ? `PDF preview for ${fileName}` : "PDF preview"}
            />
          </object>
        ) : (
          <div className="grid min-h-[560px] flex-1 place-items-center p-6 text-center text-muted-foreground">
            Preparing PDF preview...
          </div>
        )}
      </div>
    </div>
  );
}

export function DataPreview({ preview }: { preview: DataPreviewState }) {
  const hasRows = preview.rows.length > 0;
  return (
    <ScrollArea className="flex min-h-0 flex-1 rounded-xl border bg-muted/10">
      <div className="flex min-h-full flex-col gap-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {preview.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {preview.metrics.map((metric) => (
            <Badge key={metric.label} variant="secondary">
              {metric.label}: {metric.value}
            </Badge>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border">
        {preview.status === "loading" ? (
          <div className="grid min-h-[280px] place-items-center p-6 text-center text-muted-foreground">
            Reading file preview...
          </div>
        ) : preview.error ? (
          <Alert className="m-4" variant="destructive">
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>{preview.error}</AlertDescription>
          </Alert>
        ) : preview.presentation === "html" ? (
          <DocxHtmlPreview html={preview.html ?? ""} />
        ) : preview.presentation === "markdown" ? (
          <MarkdownPreview content={preview.content ?? ""} />
        ) : preview.presentation === "document" ? (
          <DocumentPreview content={preview.content ?? ""} />
        ) : (
          <PreviewDataGrid preview={preview} hasRows={hasRows} />
        )}
      </div>
      </div>
    </ScrollArea>
  );
}

type PreviewRow = { values: string[] };

function PreviewDataGrid({
  preview,
  hasRows,
}: {
  preview: DataPreviewState;
  hasRows: boolean;
}) {
  const data = useMemo<PreviewRow[]>(
    () => preview.rows.map((values) => ({ values })),
    [preview.rows],
  );
  const columns = useMemo<LegacyColumnDef<PreviewRow>[]>(
    () =>
      preview.columns.map((column, index) => ({
        id: `${index}-${column}`,
        accessorFn: (row) => row.values[index] ?? "",
        header: column,
        cell: (context) => {
          const value = String(context.getValue() ?? "");
          return (
            <span className="block max-w-[280px] truncate" title={value}>
              {value || "—"}
            </span>
          );
        },
      })),
    [preview.columns],
  );
  const table = useLegacyTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="max-h-[520px] overflow-auto">
      <Table className="min-w-max">
        <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b-2">
              {headerGroup.headers.map((header) => (
                <TableHead className="h-11 px-4 font-semibold text-foreground" key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {hasRows ? (
            table.getRowModel().rows.map((row) => (
              <TableRow className="odd:bg-background even:bg-muted/30 hover:bg-primary/5" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell className="px-4 py-3" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={preview.columns.length} className="h-32 text-center text-muted-foreground">
                No preview rows were found in this file.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function DocxHtmlPreview({ html }: { html: string }) {
  return (
    <ScrollArea className="max-h-[520px]">
      <article
        className="min-h-[280px] space-y-4 p-6 text-sm leading-7 [&_h1]:mb-5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:list-decimal [&_p]:mb-4 [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      />
    </ScrollArea>
  );
}

function DocumentPreview({ content }: { content: string }) {
  const paragraphs = content
    .slice(0, 12_000)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article className="min-h-[280px] space-y-4 p-5 text-sm leading-7">
      {paragraphs.length ? (
        paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
      ) : (
        <p className="text-muted-foreground">No readable text was found.</p>
      )}
    </article>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <article className="min-h-[280px] space-y-3 p-5 text-sm leading-7">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="mb-5 text-2xl font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-6 mb-3 text-xl font-semibold">{children}</h2>,
          p: ({ children }) => <p className="mb-4">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 ml-5 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal">{children}</ol>,
          code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>,
        }}
      >
        {content.slice(0, 12_000)}
      </ReactMarkdown>
    </article>
  );
}

function UploadSuccessAlert({
  uploadResult,
}: {
  uploadResult: UploadFilesResponse;
}) {
  return (
    <Alert className="border-primary/30 bg-primary/10">
      <AlertTitle className="flex items-center justify-between gap-3">
        <span>Upload successful</span>
        <Badge variant="secondary">{uploadResult.status}</Badge>
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>
          {uploadResult.count} object{uploadResult.count === 1 ? "" : "s"}{" "}
          stored in <strong>{uploadResult.bucket}</strong>.
        </span>
        <span className="rounded-lg border bg-card p-3">
          <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
            Transfer job
          </span>
          <strong className="mt-1 block break-all font-mono text-xs">
            {uploadResult.job_id}
          </strong>
        </span>
        <ScrollArea className="max-h-24 rounded-lg border bg-card p-3">
          <ul className="flex flex-col gap-1">
            {uploadResult.files.map((file) => (
              <li className="break-all font-mono text-xs" key={file.key}>
                {file.key}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <span>
          Files are stored. AXIOM is tracking document processing in the next
          step.
        </span>
      </AlertDescription>
    </Alert>
  );
}
