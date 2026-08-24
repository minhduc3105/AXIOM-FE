import { useState } from "react";
import type { ProcessEvent } from "../model/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FolderOpenIcon,
  ImageIcon,
} from "lucide-react";
import {
  extractWorkspaceFiles,
  workspaceFileFromArtifact,
  workspaceFileIdentity,
  type WorkspaceFile,
} from "./ProcessStepPanel";

export function AnswerActions({
  markdown,
  events,
  artifacts,
}: {
  markdown: string;
  events: ProcessEvent[];
  artifacts: string[];
}) {
  const [copied, setCopied] = useState(false);
  const files = mergeGeneratedFiles(extractWorkspaceFiles(events), artifacts);

  async function handleCopy() {
    await copyText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#6d685e] dark:text-[#aaa397]">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="h-7 px-1.5 text-[#6d685e] hover:text-[#191915] dark:text-[#aaa397] dark:hover:text-[#eee8dc]"
        onClick={handleCopy}
      >
        <ClipboardIcon data-icon="inline-start" />
        {copied ? "Copied" : "Copy"}
      </Button>
      {files.length > 0 && <GeneratedFilesDialog files={files} />}
    </div>
  );
}

function GeneratedFilesDialog({ files }: { files: WorkspaceFile[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="h-7 px-1.5 text-[#2456e8] hover:text-[#1d48c7] dark:text-[#7895ff] dark:hover:text-[#9aafff]"
        onClick={() => setOpen(true)}
      >
        <FolderOpenIcon data-icon="inline-start" />
        View Files ({files.length})
      </Button>
      <DialogContent className="max-h-[min(860px,calc(100dvh-2rem))] max-w-[min(920px,calc(100vw-2rem))] gap-5 overflow-hidden rounded-2xl border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17] sm:max-w-[min(920px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Generated Files ({files.length})
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(100dvh-140px)] overflow-y-auto pr-1">
          <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
            {files.map((file) => (
              <GeneratedFileCard file={file} key={`${file.url}:${file.name}`} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GeneratedFileCard({ file }: { file: WorkspaceFile }) {
  if (file.type !== "image") {
    return (
      <a
        className="flex min-h-14 w-[min(340px,82vw)] shrink-0 items-center gap-3 rounded-xl bg-[#f7f3eb] px-3 py-2.5 text-left transition-colors hover:bg-[#f0e9dc] dark:bg-[#20201c] dark:hover:bg-[#292923]"
        href={file.url}
        rel="noreferrer"
        target="_blank"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#6d685e] dark:bg-[#292923] dark:text-[#aaa397]">
          <FileTextIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-medium text-[#191915] dark:text-[#eee8dc]">
            {file.name}
          </strong>
          <span className="block truncate text-xs text-[#6d685e] dark:text-[#aaa397]">
            {file.type || "file"}
          </span>
        </span>
        <ExternalLinkIcon className="size-3.5 shrink-0 text-[#6d685e] dark:text-[#aaa397]" />
      </a>
    );
  }

  return (
    <a
      className="w-[min(340px,82vw)] shrink-0 overflow-hidden rounded-xl border border-[#d8d0c2] bg-white text-left transition-colors hover:border-[#2456e8]/35 dark:border-[#38372f] dark:bg-[#20201c] dark:hover:border-[#7895ff]/35"
      href={file.url}
      rel="noreferrer"
      target="_blank"
    >
      <div className="border-b border-[#d8d0c2]/80 px-3 py-2 dark:border-[#38372f]/80">
        <strong className="block truncate text-sm font-medium text-[#191915] dark:text-[#eee8dc]">
          {file.name}
        </strong>
        <span className="flex items-center gap-1 text-xs text-[#6d685e] dark:text-[#aaa397]">
          <ImageIcon className="size-3" />
          Image
        </span>
      </div>
      <div className="grid aspect-[16/9] place-items-center bg-[#f7f3eb] dark:bg-[#11110f]">
        <img
          alt={file.name}
          className="h-full w-full object-contain"
          loading="lazy"
          src={file.url}
        />
      </div>
    </a>
  );
}

function mergeGeneratedFiles(
  eventFiles: WorkspaceFile[],
  artifacts: string[],
): WorkspaceFile[] {
  const files = new Map<string, WorkspaceFile>();
  for (const file of eventFiles) files.set(workspaceFileIdentity(file), file);
  for (const artifact of artifacts) {
    const file = workspaceFileFromArtifact(artifact);
    if (file) files.set(workspaceFileIdentity(file), file);
  }
  return [...files.values()];
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Use the legacy path below when clipboard permissions are blocked.
  }
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}
