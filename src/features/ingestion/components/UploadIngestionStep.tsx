import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { FileTextIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { useGlobalIngestion } from "../model/GlobalIngestionProvider";
import type { IngestionFile } from "../model/types";
import {
  UPLOAD_FILE_SUPPORTED_FORMAT_LABEL,
  isSupportedUploadFile,
} from "../model/uploadFileRegistry";
import { UploadFilePreview } from "./UploadFilePreview";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toIngestionFiles(files: FileList | File[]) {
  const accepted: IngestionFile[] = [];
  const rejected: string[] = [];

  Array.from(files).forEach((file) => {
    if (!isSupportedUploadFile(file.name)) {
      rejected.push(file.name);
      return;
    }
    const extension = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
    accepted.push({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      name: file.name,
      extension: extension === "MARKDOWN" ? "MD" : extension,
      sizeLabel: formatFileSize(file.size),
    });
  });

  return { accepted, rejected };
}

export function UploadIngestionStep() {
  const { startUpload } = useGlobalIngestion();
  const [files, setFiles] = useState<IngestionFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const selectedFile =
    files.find((file) => file.id === selectedFileId) ?? files[0] ?? null;
  const totalSize = useMemo(
    () =>
      formatFileSize(files.reduce((total, file) => total + file.file.size, 0)),
    [files],
  );

  const addFiles = (nextFiles: FileList | File[]) => {
    const { accepted, rejected } = toIngestionFiles(nextFiles);
    if (accepted.length) {
      setFiles((current) => {
        const merged = new Map(current.map((file) => [file.id, file]));
        accepted.forEach((file) => merged.set(file.id, file));
        return [...merged.values()];
      });
      setSelectedFileId((current) => current ?? accepted[0].id);
    }
    setSelectionError(
      rejected.length
        ? `Unsupported file${rejected.length === 1 ? "" : "s"}: ${rejected.join(", ")}.`
        : null,
    );
  };

  const dropFiles = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
    setSelectedFileId((current) => (current === id ? null : current));
  };

  return (
    <div
      className="grid min-h-[30rem] min-w-0 grid-cols-1 gap-0 lg:grid-cols-[18rem_minmax(0,1fr)]"
      data-testid="upload-ingestion-layout"
    >
      <section className="flex min-h-0 min-w-0 flex-col gap-4 pb-6 lg:pr-6 lg:pb-0">
        <Field>
          <FieldLabel
            htmlFor="ingestion-upload-files"
            className={cn(
              "flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 p-5 text-center transition-colors",
              dragging && "border-primary bg-primary/10",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={dropFiles}
          >
            <UploadCloudIcon aria-hidden="true" />
            <span className="font-medium">Drop files here</span>
            <span className="text-sm text-muted-foreground">
              or choose files from your computer
            </span>
            <span className="sr-only">Choose files</span>
            <Input
              id="ingestion-upload-files"
              aria-label="Choose files"
              className="sr-only"
              type="file"
              multiple
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </FieldLabel>
        </Field>

        {selectionError ? (
          <Alert variant="destructive">
            <AlertTitle>Some files were not added</AlertTitle>
            <AlertDescription>{selectionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-sm font-medium">Upload queue</p>
          <Badge variant="secondary">
            {files.length} files · {totalSize}
          </Badge>
        </div>
        <ScrollArea className="min-h-28 flex-1 rounded-xl border bg-card">
          <div className="flex flex-col ">
            {files.length ? (
              files.map((file) => {
                const selected = file.id === selectedFile?.id;
                return (
                  <div className="flex items-center gap-2 px-2" key={file.id}>
                    <Button
                      className="min-w-0 flex-1 justify-start"
                      variant={selected ? "secondary" : "ghost"}
                      type="button"
                      onClick={() => setSelectedFileId(file.id)}
                    >
                      <FileTextIcon data-icon="inline-start" />
                      <span className="truncate">{file.name}</span>
                    </Button>
                    <Button
                      aria-label={`Remove ${file.name}`}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                Add one or more files to begin.
              </p>
            )}
          </div>
        </ScrollArea>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col gap-3 pt-6 lg:pl-7 lg:pt-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">File preview</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Review the selected file before it enters processing.
            </p>
          </div>
          {selectedFile ? (
            <Badge variant="outline">{selectedFile.extension}</Badge>
          ) : null}
        </div>
        <div className="min-h-0 flex-1">
          <UploadFilePreview file={selectedFile} />
        </div>
      </section>

      <div className="sticky bottom-0 flex justify-end bg-popover pt-5 lg:col-span-2">
        <Button
          size="lg"
          type="button"
          disabled={!files.length}
          onClick={() => void startUpload(files)}
        >
          Start ingestion
        </Button>
      </div>
    </div>
  );
}
