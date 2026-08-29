import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useGlobalIngestion } from "../model/GlobalIngestionProvider";
import { UploadIngestionStep } from "./UploadIngestionStep";

export function IngestionDialog() {
  const { closeDialog, dialogOpen } = useGlobalIngestion();
  const [hasFiles, setHasFiles] = useState(false);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-[min(50rem,calc(100vw-3rem))] sm:max-w-[50rem]"
        style={
          hasFiles
            ? {
                width: "min(66rem, calc(100vw - 3rem))",
                maxWidth: "66rem",
                height: "min(52rem, calc(100dvh - 2rem))",
              }
            : {
                width: "min(34rem, calc(100vw - 2rem))",
                maxWidth: "34rem",
              }
        }
      >
        <DialogHeader className="gap-2 border-b px-5 py-5 pr-12 sm:px-7 sm:py-6">
          <DialogTitle>Upload files</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <UploadIngestionStep onHasFilesChange={setHasFiles} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
