import { useEffect, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { FileTextIcon, UploadCloudIcon } from "lucide-react";
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
import type { AsyncStatus, IngestionFile } from "../model/types";

type UploadWorkspaceProps = {
  files: IngestionFile[];
  selectedFileId: string | null;
  uploadStatus: AsyncStatus;
  uploadResult: UploadFilesResponse | null;
  onFiles: (files: FileList | File[]) => void;
  onSelectFile: (id: string) => void;
  onUpload: () => void;
  onProcessing: () => void;
  onBack: () => void;
};

const previewRows = [
  ["C-1001", "Northstar Labs", "ops@northstar.co", "Enterprise", "$124K"],
  ["C-1002", "Packet Foundry", "missing", "Mid-market", "$48K"],
  ["C-1003", "Vector Works", "finance@vector.io", "Enterprise", "$171K"],
  ["C-1005", "Lattice Bank", "missing", "Enterprise", "$210K"],
];

function getPreviewMetrics(extension: string) {
  if (extension === "PDF") {
    return [
      ["PDF", "Viewer"],
      ["Local", "Source"],
      ["0", "Parser warnings"],
      ["Ready", "Preflight"],
      ["100%", "Preview quality"],
    ];
  }
  if (extension === "MD") {
    return [
      ["4", "Chunks"],
      ["7", "Headings"],
      ["0", "Parser errors"],
      ["2", "Governed terms"],
      ["100%", "Completeness"],
    ];
  }
  if (extension === "JSON") {
    return [
      ["421", "Events"],
      ["18", "Fields"],
      ["11", "Missing values"],
      ["3", "Nested objects"],
      ["98.2%", "Completeness"],
    ];
  }
  return [
    ["1,248", "Rows"],
    ["12", "Fields"],
    ["27", "Missing cells"],
    ["2", "Governed fields"],
    ["97.8%", "Completeness"],
  ];
}

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

export function UploadWorkspace({
  files,
  selectedFileId,
  uploadStatus,
  uploadResult,
  onFiles,
  onSelectFile,
  onUpload,
  onProcessing,
  onBack,
}: UploadWorkspaceProps) {
  const [dragging, setDragging] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const inputId = "axiom-upload-more";
  const uploading = uploadStatus === "loading";
  const uploaded = uploadStatus === "success";
  const selected = files.find((file) => file.id === selectedFileId) ?? files[0];
  const selectedIsPdf = isPdfFile(selected);
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
    if (!selectedIsPdf || !selected) {
      setPdfPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selected.file);
    setPdfPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selected, selectedIsPdf]);

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
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/60 p-8 text-center transition-colors",
              dragging && "border-primary bg-primary/10",
              uploading && "cursor-not-allowed opacity-60",
            )}
            htmlFor={inputId}
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
              CSV, JSON, TXT/MD, PDF, and Parquet are supported.
            </span>
            <Input
              id={inputId}
              className="sr-only"
              type="file"
              multiple
              disabled={uploading}
              accept=".csv,.json,.pdf,.txt,.md,.markdown,.parquet"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                event.target.files && onFiles(event.target.files)
              }
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <QueueMetric value={files.length.toString()} label="Files" />
            <QueueMetric value={typeCount.toString()} label="Types" />
            <QueueMetric value={totalSize} label="Size" />
          </div>

          <Separator />

          <ScrollArea className="h-[min(280px,34vh)] pr-2">
            <div className="flex flex-col gap-3">
              {files.map((file) => {
                const isSelected = file.id === selected?.id;
                return (
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      "grid h-auto min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 p-3 text-left",
                      isSelected && "border-primary bg-primary/10",
                    )}
                    data-state={isSelected ? "active" : "inactive"}
                    key={file.id}
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
                    <Badge variant={getStatusVariant(uploadStatus, isSelected)}>
                      {getStatusLabel(uploadStatus, isSelected)}
                    </Badge>
                  </Button>
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
              {selected?.extension ?? "FILE"} selected
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-5">
          {selectedIsPdf ? (
            <PdfPreview
              fileName={selected?.name}
              pdfPreviewUrl={pdfPreviewUrl}
            />
          ) : (
            <DataPreview />
          )}
        </CardContent>
      </Card>
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

function DataPreview() {
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>customer_id</TableHead>
              <TableHead>customer_name</TableHead>
              <TableHead>email</TableHead>
              <TableHead>segment</TableHead>
              <TableHead>revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row) => (
              <TableRow key={row[0]}>
                {row.map((cell) => (
                  <TableCell key={cell}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card size="sm" className="bg-muted/60">
          <CardHeader>
            <CardTitle>Detected schema</CardTitle>
            <CardDescription>
              Identifier: customer_id · Money: revenue · Timestamp: renewal_date
              · PII: email
            </CardDescription>
          </CardHeader>
        </Card>
        <Card size="sm" className="bg-muted/60">
          <CardHeader>
            <CardTitle>Upload preflight</CardTitle>
            <CardDescription>
              No parser errors · 2 missing email fields · approval required
              before searchable activation.
            </CardDescription>
          </CardHeader>
        </Card>
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
