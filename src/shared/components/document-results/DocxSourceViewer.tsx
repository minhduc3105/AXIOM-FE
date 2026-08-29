import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { convertDocxToHtml } from "@/shared/lib/docx-preview";

type DocxPreviewState =
  | { status: "loading"; html: null; error: null }
  | { status: "ready"; html: string; error: null }
  | { status: "error"; html: null; error: string };

type DocxSourceViewerProps = {
  url: string;
  fileName: string;
  onRetry: () => void;
};

export function DocxSourceViewer({
  url,
  fileName,
  onRetry,
}: DocxSourceViewerProps) {
  const [state, setState] = useState<DocxPreviewState>({
    status: "loading",
    html: null,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", html: null, error: null });

    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Document preview failed with HTTP ${response.status}.`);
        }
        return convertDocxToHtml(await response.arrayBuffer());
      })
      .then((html) => {
        if (controller.signal.aborted) return;
        setState({
          status: "ready",
          html: DOMPurify.sanitize(html),
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          html: null,
          error:
            error instanceof Error
              ? error.message
              : "Unable to read this document preview.",
        });
      });

    return () => controller.abort();
  }, [url]);

  if (state.status === "loading") {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <div className="flex w-full max-w-md flex-col gap-3">
          <Skeleton className="h-8" />
          <Skeleton className="h-80" />
          <p className="text-center text-xs text-muted-foreground">
            Loading document preview…
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <Alert variant="destructive" className="max-w-sm">
          <AlertCircleIcon />
          <AlertTitle>Document preview failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
          <Button className="mt-3" type="button" variant="outline" onClick={onRetry}>
            Retry preview
          </Button>
        </Alert>
      </div>
    );
  }

  if (!state.html.trim()) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6 text-center text-sm text-muted-foreground">
        No readable document content was found.
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1 bg-muted/30">
      <article
        className="mx-auto min-h-full max-w-4xl bg-background p-5 text-sm leading-7 [&_h1]:mb-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-4 [&_table]:mb-4 [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2"
        aria-label={`DOCX preview for ${fileName}`}
        dangerouslySetInnerHTML={{ __html: state.html }}
      />
    </ScrollArea>
  );
}

export default DocxSourceViewer;
