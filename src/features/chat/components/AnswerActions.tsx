import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
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
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { RememberSkillAction } from "./RememberSkillAction";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createPortal } from "react-dom";
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
  onRemember,
  answerContentRef,
  onReply,
}: {
  markdown: string;
  events: ProcessEvent[];
  artifacts: string[];
  onRemember?: (markdown: string) => void;
  answerContentRef?: RefObject<HTMLElement | null>;
  onReply?: (selectedText: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "unhelpful" | null>(
    null,
  );
  const [selectedReply, setSelectedReply] =
    useState<AnswerTextSelection | null>(null);
  const selectionGestureActiveRef = useRef(false);
  const selectionCompletedRef = useRef(false);
  const pendingSelectionRef = useRef<AnswerTextSelection | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const files = mergeGeneratedFiles(extractWorkspaceFiles(events), artifacts);

  useEffect(() => {
    if (!answerContentRef || !onReply) return;

    const isInsideAnswer = (target: EventTarget | null) =>
      target instanceof Node &&
      Boolean(answerContentRef.current?.contains(target));
    const refreshSelection = () => {
      const selection = window.getSelection();
      const answerSelection = getAnswerTextSelection(answerContentRef);
      if (answerSelection) {
        pendingSelectionRef.current = answerSelection;
        setSelectedReply(
          selectionGestureActiveRef.current || !selectionCompletedRef.current
            ? null
            : answerSelection,
        );
        return;
      }

      if (
        selection?.isCollapsed &&
        document.activeElement?.hasAttribute("data-selection-reply-action")
      ) {
        return;
      }

      pendingSelectionRef.current = null;
      selectionCompletedRef.current = false;
      setSelectedReply(null);
    };
    const startPointerSelection = (event: Event) => {
      if (!isInsideAnswer(event.target)) return;
      selectionGestureActiveRef.current = true;
      selectionCompletedRef.current = false;
      pendingSelectionRef.current = null;
      setSelectedReply(null);
    };
    const startKeyboardSelection = (event: KeyboardEvent) => {
      if (!event.shiftKey) return;
      const selection = window.getSelection();
      const answerContent = answerContentRef.current;
      const selectionStartsInAnswer = Boolean(
        answerContent &&
        selection?.anchorNode &&
        selection.focusNode &&
        answerContent.contains(selection.anchorNode) &&
        answerContent.contains(selection.focusNode),
      );
      if (!isInsideAnswer(event.target) && !selectionStartsInAnswer) return;
      selectionGestureActiveRef.current = true;
      selectionCompletedRef.current = false;
      pendingSelectionRef.current = null;
      setSelectedReply(null);
    };
    const finishSelection = () => {
      if (!selectionGestureActiveRef.current) return;
      selectionGestureActiveRef.current = false;
      selectionCompletedRef.current = true;
      const answerSelection = getAnswerTextSelection(answerContentRef);
      pendingSelectionRef.current = answerSelection;
      setSelectedReply(answerSelection);
    };

    document.addEventListener("selectionchange", refreshSelection);
    document.addEventListener("mousedown", startPointerSelection);
    document.addEventListener("mouseup", finishSelection);
    document.addEventListener("touchstart", startPointerSelection);
    document.addEventListener("touchend", finishSelection);
    document.addEventListener("keydown", startKeyboardSelection);
    document.addEventListener("keyup", finishSelection);
    window.addEventListener("resize", refreshSelection);
    window.addEventListener("scroll", refreshSelection, true);

    return () => {
      document.removeEventListener("selectionchange", refreshSelection);
      document.removeEventListener("mousedown", startPointerSelection);
      document.removeEventListener("mouseup", finishSelection);
      document.removeEventListener("touchstart", startPointerSelection);
      document.removeEventListener("touchend", finishSelection);
      document.removeEventListener("keydown", startKeyboardSelection);
      document.removeEventListener("keyup", finishSelection);
      window.removeEventListener("resize", refreshSelection);
      window.removeEventListener("scroll", refreshSelection, true);
    };
  }, [answerContentRef, onReply]);

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
  const feedbackMessage =
    feedback === "helpful"
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
      {answerContentRef && onReply && selectedReply
        ? createPortal(
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Ask AXIOM"
              data-selection-reply-action
              className="fixed z-50 h-9 rounded-full border-border bg-popover px-4 text-sm font-medium text-popover-foreground shadow-lg"
              style={{ top: selectedReply.top, left: selectedReply.left }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const selectedText =
                  getAnswerTextSelection(answerContentRef)?.text ??
                  pendingSelectionRef.current?.text ??
                  selectedReply.text;
                setSelectedReply(null);
                pendingSelectionRef.current = null;
                selectionCompletedRef.current = false;
                if (selectedText) onReply(selectedText);
                window.getSelection()?.removeAllRanges();
              }}
            >
              Ask AXIOM
            </Button>,
            document.body,
          )
        : null}
      <span className="sr-only" aria-live="polite">
        {copied ? "Response copied" : feedbackMessage}
      </span>
      <FeedbackAction
        active={feedback === "helpful"}
        icon={<ThumbsUpIcon />}
        label={
          feedback === "helpful"
            ? "Remove helpful rating"
            : "Mark response as helpful"
        }
        onClick={() =>
          setFeedback((current) => (current === "helpful" ? null : "helpful"))
        }
        tooltip="Good response"
      />
      <FeedbackAction
        active={feedback === "unhelpful"}
        icon={<ThumbsDownIcon />}
        label={
          feedback === "unhelpful"
            ? "Remove unhelpful rating"
            : "Mark response as unhelpful"
        }
        onClick={() =>
          setFeedback((current) =>
            current === "unhelpful" ? null : "unhelpful",
          )
        }
        tooltip="Bad response"
      />
      {onRemember && (
        <RememberSkillAction onRemember={() => onRemember(markdown)} />
      )}
      {files.length > 0 && <GeneratedFilesDialog files={files} />}
    </div>
  );
}

type AnswerTextSelection = {
  text: string;
  top: number;
  left: number;
};

function getAnswerTextSelection(
  answerContentRef: RefObject<HTMLElement | null>,
): AnswerTextSelection | null {
  const answerContent = answerContentRef.current;
  const selection = window.getSelection();
  if (
    !answerContent ||
    !selection ||
    selection.isCollapsed ||
    selection.rangeCount !== 1
  ) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (
    !answerContent.contains(range.startContainer) ||
    !answerContent.contains(range.endContainer)
  ) {
    return null;
  }

  const selectedText = selection.toString();
  if (!selectedText.trim()) return null;

  const bounds = range.getBoundingClientRect?.();
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const popoverWidth = 128;
  const popoverHeight = 36;
  const margin = 8;
  const left = Math.min(
    Math.max(bounds?.left ?? margin, margin),
    Math.max(margin, viewportWidth - popoverWidth - margin),
  );
  const aboveSelection = (bounds?.top ?? margin) - popoverHeight - margin;
  const top =
    aboveSelection >= margin
      ? aboveSelection
      : Math.min(
          (bounds?.bottom ?? margin) + margin,
          Math.max(margin, viewportHeight - popoverHeight - margin),
        );

  return { text: selectedText, top, left };
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
            className={
              active
                ? "text-primary hover:text-brand-strong"
                : "text-muted-foreground hover:text-foreground"
            }
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
  const imageFiles = files.filter((file) => file.type === "image");
  const otherFiles = files.filter((file) => file.type !== "image");
  const renderCards = (items: WorkspaceFile[]) =>
    items.map((file) => (
      <GeneratedFileCard file={file} key={`${file.url}:${file.name}`} />
    ));

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
      <DialogContent className="flex max-h-[min(860px,calc(100dvh-2rem))] min-h-0 max-w-[min(920px,calc(100vw-2rem))] flex-col gap-5 overflow-hidden rounded-2xl border-border bg-card p-5 sm:max-w-[min(920px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Generated Files ({files.length})
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="min-w-0 space-y-3 pb-2">
            {imageFiles.length > 0 && (
              <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-2">
                {renderCards(imageFiles)}
              </div>
            )}
            {otherFiles.length > 0 && (
              <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-2">
                {renderCards(otherFiles)}
              </div>
            )}
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
        className="flex min-h-14 w-full min-w-0 items-center gap-3 rounded-xl bg-secondary px-3 py-2.5 text-left transition-colors hover:bg-muted"
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
        </span>
        <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </a>
    );
  }

  return (
    <a
      className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary/35"
      href={file.url}
      rel="noreferrer"
      target="_blank"
    >
      <div className="border-b border-border px-3 py-2">
        <strong className="block truncate text-sm font-medium text-foreground">
          {file.name}
        </strong>
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
