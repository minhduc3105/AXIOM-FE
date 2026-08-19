import { useState } from "react";
import { ArrowRightIcon, CloudIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGlobalIngestion } from "../model/GlobalIngestionProvider";
import { S3IngestionStep } from "./S3IngestionStep";
import { UploadIngestionStep } from "./UploadIngestionStep";

type IngestionSource = "upload" | "s3" | null;

export function IngestionDialog() {
  const { closeDialog, dialogOpen } = useGlobalIngestion();
  const [source, setSource] = useState<IngestionSource>(null);

  const close = () => {
    setSource(null);
    closeDialog();
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-[min(66rem,calc(100vw-3rem))] sm:max-w-[66rem]">
        <DialogHeader className="gap-2 border-b px-5 py-5 pr-12 sm:px-7 sm:py-6">
          <DialogTitle>
            {source === "upload"
              ? "Upload files"
              : source === "s3"
                ? "Import from Amazon S3"
                : "Add data for ingestion"}
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            {source
              ? "Choose the files to place in AXIOM's processing queue."
              : "Choose where AXIOM should retrieve the files you want to parse."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {source === "upload" ? (
            <UploadIngestionStep onBack={() => setSource(null)} />
          ) : source === "s3" ? (
            <S3IngestionStep onBack={() => setSource(null)} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Button
                aria-label="Upload files"
                className="group h-auto min-h-36 justify-start gap-4 rounded-xl border-border bg-card px-5 py-5 text-left whitespace-normal hover:border-primary/35 hover:bg-accent"
                variant="outline"
                type="button"
                onClick={() => setSource("upload")}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted text-foreground transition-transform duration-200 group-hover:scale-105">
                  <UploadIcon aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                  <span className="font-medium">Upload files</span>
                  <span className="text-sm leading-5 font-normal text-muted-foreground">
                    Add local documents, review them in the browser, then start a batch.
                  </span>
                  <span className="text-xs font-medium text-foreground/70">
                    Preview before ingesting
                  </span>
                </span>
                <ArrowRightIcon
                  className="mt-1 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                  data-icon="inline-end"
                />
              </Button>
              <Button
                aria-label="Amazon S3"
                className="group h-auto min-h-36 justify-start gap-4 rounded-xl border-border bg-card px-5 py-5 text-left whitespace-normal hover:border-primary/35 hover:bg-accent"
                variant="outline"
                type="button"
                onClick={() => setSource("s3")}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted text-foreground transition-transform duration-200 group-hover:scale-105">
                  <CloudIcon aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                  <span className="font-medium">Amazon S3</span>
                  <span className="text-sm leading-5 font-normal text-muted-foreground">
                    Connect a bucket, browse its objects, and choose what to import.
                  </span>
                  <span className="text-xs font-medium text-foreground/70">
                    Browse objects securely
                  </span>
                </span>
                <ArrowRightIcon
                  className="mt-1 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                  data-icon="inline-end"
                />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
