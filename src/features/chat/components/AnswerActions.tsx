import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ProcessEvent } from "../model/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckIcon,
  ClipboardIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FolderOpenIcon,
  ImageIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [feedback, setFeedback] = useState<"helpful" | "unhelpful" | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const files = mergeGeneratedFiles(extractWorkspaceFiles(events), artifacts);

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  async function handleCopy() {
    await copyText(markdown);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    setCopied(true);
    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      resetTimerRef.current = null;
    }, 1400);
  }

  const copyLabel = copied ? "Response copied" : "Copy response";
  const feedbackMessage = feedback === "helpful"
    ? "Marked response as helpful"
    : feedback === "unhelpful"
      ? "Marked response as unhelpful"
      : "";

  return (
    <div
      className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
      data-answer-actions
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={copyLabel}
              className="-ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => void handleCopy()}
            />
          }
        >
          {copied ? <CheckIcon /> : <ClipboardIcon />}
        </TooltipTrigger>
        <TooltipContent>{copyLabel}</TooltipContent>
      </Tooltip>
      <span className="sr-only" aria-live="polite">
        {copied ? "Response copied" : feedbackMessage}
      </span>
      <FeedbackAction
        active={feedback === "helpful"}
        icon={<ThumbsUpIcon />}
        label={feedback === "helpful" ? "Remove helpful rating" : "Mark response as helpful"}
        onClick={() => setFeedback((current) => current === "helpful" ? null : "helpful")}
        tooltip="Helpful"
      />
      <FeedbackAction
        active={feedback === "unhelpful"}
        icon={<ThumbsDownIcon />}
        label={feedback === "unhelpful" ? "Remove unhelpful rating" : "Mark response as unhelpful"}
        onClick={() => setFeedback((current) => current === "unhelpful" ? null : "unhelpful")}
        tooltip="Not helpful"
      />
      {files.length > 0 && <GeneratedFilesDialog files={files} />}
    </div>
  );
}

function FeedbackAction({
  active,
  icon,
  label,
  onClick,
  tooltip,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-pressed={active}
            className={active ? "text-primary hover:text-brand-strong" : "text-muted-foreground hover:text-foreground"}
            onClick={onClick}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
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
        className="h-7 px-1.5 text-primary hover:text-brand-strong"
        onClick={() => setOpen(true)}
      >
        <FolderOpenIcon data-icon="inline-start" />
        View Files ({files.length})
      </Button>
      <DialogContent className="max-h-[min(860px,calc(100dvh-2rem))] max-w-[min(920px,calc(100vw-2rem))] gap-5 overflow-hidden rounded-2xl border-border bg-card p-5 sm:max-w-[min(920px,calc(100vw-2rem))]">
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
        className="flex min-h-14 w-[min(340px,82vw)] shrink-0 items-center gap-3 rounded-xl bg-secondary px-3 py-2.5 text-left transition-colors hover:bg-muted"
        href={file.url}
        rel="noreferrer"
        target="_blank"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-muted-foreground">
          <FileTextIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-medium text-foreground">
            {file.name}
          </strong>
          <span className="block truncate text-xs text-muted-foreground">
            {file.type || "file"}
          </span>
        </span>
        <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </a>
    );
  }

  return (
    <a
      className="w-[min(340px,82vw)] shrink-0 overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary/35"
      href={file.url}
      rel="noreferrer"
      target="_blank"
    >
      <div className="border-b border-border px-3 py-2">
        <strong className="block truncate text-sm font-medium text-foreground">
          {file.name}
        </strong>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ImageIcon className="size-3" />
          Image
        </span>
      </div>
      <div className="grid aspect-[16/9] place-items-center bg-secondary">
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
