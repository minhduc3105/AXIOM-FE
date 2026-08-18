import { useEffect, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { FileTextIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import * as XLSX from "xlsx";
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
import {
  UPLOAD_FILE_ACCEPT,
  type AsyncStatus,
  type IngestionFile,
} from "../model/types";

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

type DataPreviewState = {
  status: "idle" | "loading" | "ready" | "error";
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
  metrics: Array<{ label: string; value: string }>;
  error?: string;
};

const emptyDataPreview: DataPreviewState = {
  status: "idle",
  title: "Select a data file",
  description: "File metadata and sample rows will appear here.",
  columns: ["Property", "Value"],
  rows: [],
  metrics: [],
};

function getStatusLabel(status: AsyncStatus, isSelected: boolean) {
  if (status === "loading") return "Uploading";
  if (status === "success") return "Stored";
  if (status === "error") return "Failed";
  return isSelected ? "Selected" : "Queued";
}

function getStatusVariant(status: AsyncStatus, isSelected: boolean) {
  if (status === "success") return "default";
  if (status === "error") return "destructive";
  return isSelected ? "secondary" : "outline";
}

function isPdfFile(file: IngestionFile | undefined) {
  return (
    file?.extension.toUpperCase() === "PDF" ||
    file?.file.type === "application/pdf"
  );
}

function isImageFile(file: IngestionFile | undefined) {
  const extension = file?.extension.toUpperCase();
  return (
    extension === "PNG" ||
    extension === "JPG" ||
    extension === "JPEG" ||
    file?.file.type === "image/png" ||
    file?.file.type === "image/jpeg"
  );
}

function isWorkbookFile(file: IngestionFile | undefined) {
  return file?.extension.toUpperCase() === "XLSX";
}

function isTextPreviewFile(file: IngestionFile | undefined) {
  const extension = file?.extension.toLowerCase();
  return (
    extension === "csv" ||
    extension === "json" ||
    extension === "txt" ||
    extension === "md" ||
    extension === "markdown" ||
    file?.file.type.startsWith("text/") ||
    file?.file.type === "application/json"
  );
}

function parseDelimitedLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeTableRows(rows: string[][], width: number) {
  return rows.map((row) =>
    Array.from({ length: width }, (_, index) => row[index] ?? ""),
  );
}

async function buildTextDataPreview(
  file: IngestionFile,
): Promise<DataPreviewState> {
  const sample = await file.file.slice(0, 128 * 1024).text();
  const extension = file.extension.toLowerCase();
  const metrics = [
    { label: "Type", value: file.extension.toUpperCase() },
    { label: "Size", value: file.sizeLabel },
  ];

  if (extension === "json") {
    try {
      const parsed = JSON.parse(sample) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "object" && item !== null)
      ) {
        const records = parsed.slice(0, 8) as Array<Record<string, unknown>>;
        const columns = Array.from(
          new Set(records.flatMap((record) => Object.keys(record))),
        ).slice(0, 8);
        return {
          status: "ready",
          title: file.name,
          description: "JSON preview generated from the selected upload file.",
          columns: columns.length ? columns : ["Value"],
          rows: records.map((record) =>
            (columns.length ? columns : ["Value"]).map((column) =>
              typeof record[column] === "object"
                ? JSON.stringify(record[column])
                : String(record[column] ?? ""),
            ),
          ),
          metrics: [
            ...metrics,
            { label: "Sample", value: `${records.length} records` },
          ],
        };
      }
      if (typeof parsed === "object" && parsed !== null) {
        const entries = Object.entries(parsed as Record<string, unknown>).slice(
          0,
          10,
        );
        return {
          status: "ready",
          title: file.name,
          description:
            "JSON object preview generated from the selected upload file.",
          columns: ["Key", "Value"],
          rows: entries.map(([key, value]) => [
            key,
            typeof value === "object"
              ? JSON.stringify(value)
              : String(value ?? ""),
          ]),
          metrics: [
            ...metrics,
            { label: "Keys", value: String(entries.length) },
          ],
        };
      }
    } catch {
      // Fall through to text sample when the uploaded JSON is incomplete or invalid.
    }
  }

  const lines = sample
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 9);
  if (extension === "csv" && lines.length > 0) {
    const parsedRows = lines.map(parseDelimitedLine);
    const header = parsedRows[0] ?? [];
    const width = Math.max(...parsedRows.map((row) => row.length), 1);
    const columns = header.some(Boolean)
      ? normalizeTableRows([header], width)[0]
      : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
    return {
      status: "ready",
      title: file.name,
      description: "CSV preview generated from the selected upload file.",
      columns,
      rows: normalizeTableRows(parsedRows.slice(1, 8), columns.length),
      metrics: [
        ...metrics,
        { label: "Sample", value: `${Math.max(lines.length - 1, 0)} rows` },
      ],
    };
  }

  return {
    status: "ready",
    title: file.name,
    description: "Text preview generated from the selected upload file.",
    columns: ["Line", "Content"],
    rows: lines.slice(0, 10).map((line, index) => [String(index + 1), line]),
    metrics: [...metrics, { label: "Sample", value: `${lines.length} lines` }],
  };
}

async function buildWorkbookPreview(
  file: IngestionFile,
): Promise<DataPreviewState> {
  const workbook = XLSX.read(await file.file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      status: "error",
      title: file.name,
      description: "Unable to inspect this workbook.",
      columns: ["Property", "Value"],
      rows: [
        ["File", file.name],
        ["Size", file.sizeLabel],
      ],
      metrics: [
        { label: "Type", value: "XLSX" },
        { label: "Size", value: file.sizeLabel },
      ],
      error: "The workbook does not contain any visible sheets.",
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<
    Array<string | number | boolean | Date | null>
  >(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });
  const nonEmptyRows = rawRows.filter((row) =>
    row.some((cell) => String(cell ?? "").trim()),
  );
  const sampleRows = nonEmptyRows.slice(0, 10);
  const width = Math.min(
    Math.max(...sampleRows.map((row) => row.length), 1),
    12,
  );
  const columns = Array.from({ length: width }, (_, index) =>
    XLSX.utils.encode_col(index),
  );
  const rows = normalizeTableRows(
    sampleRows.map((row) =>
      row
        .slice(0, width)
        .map((cell) =>
          cell instanceof Date ? cell.toLocaleString() : String(cell ?? ""),
        ),
    ),
    width,
  );

  return {
    status: "ready",
    title: file.name,
    description: `SheetJS preview from sheet "${firstSheetName}".`,
    columns,
    rows,
    metrics: [
      { label: "Sheets", value: String(workbook.SheetNames.length) },
      { label: "Active sheet", value: firstSheetName },
      { label: "Sample", value: `${rows.length} rows` },
      { label: "Size", value: file.sizeLabel },
    ],
  };
}

async function buildDataPreview(
  file: IngestionFile,
): Promise<DataPreviewState> {
  if (isWorkbookFile(file)) return buildWorkbookPreview(file);
  if (isTextPreviewFile(file)) return buildTextDataPreview(file);
  return {
    status: "ready",
    title: file.name,
    description: "Binary file selected for upload.",
    columns: ["Property", "Value"],
    rows: [
      ["File name", file.name],
      ["Type", file.extension.toUpperCase()],
      ["Browser MIME type", file.file.type || "Not provided"],
      ["Size", file.sizeLabel],
    ],
    metrics: [
      { label: "Type", value: file.extension.toUpperCase() },
      { label: "Size", value: file.sizeLabel },
    ],
  };
}

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
  const selectedIsPdf = isPdfFile(selected);
  const selectedIsImage = isImageFile(selected);
  const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0);
  const totalSize =
    totalBytes < 1024 * 1024
      ? `${(totalBytes / 1024).toFixed(1)} KB`
      : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  const typeCount = new Set(files.map((file) => file.extension)).size;
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
    void buildDataPreview(selected)
      .then((preview) => {
        if (!cancelled) setDataPreview(preview);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDataPreview({
          status: "error",
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
    <div className="grid min-h-[calc(100vh-360px)] items-stretch gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
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
                PDF, PNG/JPEG, CSV, JSON, TXT/MD, Excel, and Parquet are
                supported.
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

function ImagePreview({
  fileName,
  imagePreviewUrl,
}: {
  fileName: string | undefined;
  imagePreviewUrl: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 overflow-auto rounded-xl border bg-foreground p-5">
      {imagePreviewUrl ? (
        <img
          className="m-auto max-h-[680px] max-w-full object-contain shadow-2xl"
          src={imagePreviewUrl}
          alt={fileName ? `Image preview for ${fileName}` : "Image preview"}
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

function PreviewMetric({ value, label }: { value: string; label: string }) {
  return (
    <Card size="sm" className="bg-muted/60">
      <CardHeader>
        <CardTitle className="text-xl">{value}</CardTitle>
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

function DataPreview({ preview }: { preview: DataPreviewState }) {
  const hasRows = preview.rows.length > 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-xl border">
        {preview.status === "loading" ? (
          <div className="grid min-h-[280px] place-items-center p-6 text-center text-muted-foreground">
            Reading file preview...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {preview.columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasRows ? (
                preview.rows.map((row, rowIndex) => (
                  <TableRow key={`${preview.title}-${rowIndex}`}>
                    {preview.columns.map((column, columnIndex) => (
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
                    colSpan={preview.columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No preview rows were found in this file.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
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
