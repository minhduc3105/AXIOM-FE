import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IngestionFile } from "../model/types";
import {
  buildUploadDataPreview,
  emptyDataPreview,
  getUploadPreviewKind,
  type DataPreviewState,
} from "../model/uploadPreviewFactory";

type UploadFilePreviewProps = {
  file: IngestionFile | null;
};

export function UploadFilePreview({ file }: UploadFilePreviewProps) {
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [dataPreview, setDataPreview] =
    useState<DataPreviewState>(emptyDataPreview);
  const previewKind = file ? getUploadPreviewKind(file.name) : null;
  const isSourcePreview = previewKind === "pdf" || previewKind === "image";

  useEffect(() => {
    if (!file || !isSourcePreview) {
      setSourcePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file.file);
    setSourcePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isSourcePreview]);

  useEffect(() => {
    if (!file || isSourcePreview) {
      setDataPreview(emptyDataPreview);
      return;
    }

    let cancelled = false;
    setDataPreview({
      ...emptyDataPreview,
      status: "loading",
      title: file.name,
      description: "Reading preview from the selected upload file.",
    });
    void buildUploadDataPreview(file)
      .then((preview) => {
        if (!cancelled) setDataPreview(preview);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDataPreview({
          status: "error",
          presentation: "metadata",
          title: file.name,
          description: "Unable to generate a browser-side preview.",
          columns: ["Property", "Value"],
          rows: [
            ["File name", file.name],
            ["Size", file.sizeLabel],
          ],
          metrics: [
            { label: "Type", value: file.extension },
            { label: "Size", value: file.sizeLabel },
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
  }, [file, isSourcePreview]);

  if (!file) {
    return (
      <div className="grid h-full min-h-72 place-items-center rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Add a file to preview it here.
      </div>
    );
  }

  if (previewKind === "pdf") {
    return <PdfPreview fileName={file.name} url={sourcePreviewUrl} />;
  }
  if (previewKind === "image") {
    return <ImagePreview fileName={file.name} url={sourcePreviewUrl} />;
  }
  return <DataFilePreview preview={dataPreview} />;
}

function PdfPreview({ fileName, url }: { fileName: string; url: string | null }) {
  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg border bg-muted/30">
      {url ? (
        <object
          className="h-full w-full"
          data={`${url}#view=FitH`}
          type="application/pdf"
          aria-label={`PDF preview for ${fileName}`}
        >
          <iframe
            className="h-full w-full"
            src={url}
            title={`PDF preview for ${fileName}`}
          />
        </object>
      ) : (
        <PreviewLoading />
      )}
    </div>
  );
}

function ImagePreview({
  fileName,
  url,
}: {
  fileName: string;
  url: string | null;
}) {
  if (!url) return <PreviewLoading />;
  return (
    <div className="grid h-full min-h-0 place-items-center overflow-auto rounded-lg border bg-foreground p-4">
      <img
        className="max-h-[34rem] max-w-full object-contain"
        src={url}
        alt={`Image preview for ${fileName}`}
      />
    </div>
  );
}

function PreviewLoading() {
  return (
    <div className="flex min-h-72 flex-col justify-center gap-3 p-5">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

function DataFilePreview({ preview }: { preview: DataPreviewState }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
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
      <div className="min-h-0 flex-1">
        {preview.status === "loading" ? (
          <PreviewLoading />
        ) : preview.error ? (
          <Alert variant="destructive">
            <AlertTitle>Preview unavailable</AlertTitle>
            <AlertDescription>{preview.error}</AlertDescription>
          </Alert>
        ) : preview.presentation === "html" ? (
          <HtmlPreview html={preview.html ?? ""} />
        ) : preview.presentation === "markdown" ? (
          <MarkdownPreview content={preview.content ?? ""} />
        ) : preview.presentation === "document" ? (
          <TextPreview content={preview.content ?? ""} />
        ) : (
          <TablePreview preview={preview} />
        )}
      </div>
    </div>
  );
}

function TablePreview({ preview }: { preview: DataPreviewState }) {
  return (
    <ScrollArea aria-label="Upload file preview" className="h-full min-h-0 rounded-md border bg-card">
      <Table className="min-w-max">
        <TableHeader className="sticky top-0 bg-muted/90">
          <TableRow>
            {preview.columns.map((column) => (
              <TableHead className="px-4 font-semibold text-foreground" key={column}>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.rows.length ? (
            preview.rows.map((row, rowIndex) => (
              <TableRow key={`${preview.title}-${rowIndex}`}>
                {preview.columns.map((column, columnIndex) => (
                  <TableCell className="max-w-[280px] truncate px-4" key={column}>
                    {row[columnIndex] || "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                className="h-32 text-center text-muted-foreground"
                colSpan={Math.max(preview.columns.length, 1)}
              >
                No preview rows were found in this file.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

function HtmlPreview({ html }: { html: string }) {
  return (
    <ScrollArea aria-label="Upload file preview" className="h-full min-h-0 rounded-md border bg-card">
      <article
        className="min-w-0 break-words p-5 text-sm leading-7 [&_h1]:mb-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-4 [&_table]:mb-4 [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      />
    </ScrollArea>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <ScrollArea aria-label="Upload file preview" className="h-full min-h-0 rounded-md border bg-card">
      <article className="p-5 text-sm leading-7 [&_h1]:mb-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mb-4">
        <ReactMarkdown>{content.slice(0, 12_000)}</ReactMarkdown>
      </article>
    </ScrollArea>
  );
}

function TextPreview({ content }: { content: string }) {
  const paragraphs = content
    .slice(0, 12_000)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <ScrollArea aria-label="Upload file preview" className="h-full min-h-0 rounded-md border bg-card">
      <article className="flex flex-col gap-4 p-5 text-sm leading-7">
        {paragraphs.length ? (
          paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        ) : (
          <p className="text-muted-foreground">No readable text was found.</p>
        )}
      </article>
    </ScrollArea>
  );
}
