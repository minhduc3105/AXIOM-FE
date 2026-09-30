import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ChevronDownIcon,
  DatabaseIcon,
  FileIcon,
  PaperclipIcon,
  ReplyIcon,
  SendIcon,
  SquareIcon,
  SheetIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import type {
  ChatEngine,
  PendingUserInput,
  UserInputAnswer,
} from "../model/types";
import type { ChatDataResource, ChatDataScope } from "../model/chatDataScope";
import { AskUserQuestion } from "./AskUserQuestion";

const engineOptions: Array<{ value: ChatEngine; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "general", label: "General" },
  // { value: "reason", label: "Reason" },
  { value: "report", label: "Report" },
];

export function ChatComposer({
  onSubmit,
  engine,
  onEngineChange,
  placeholder = "Ask AXIOM to review, analyze, or generate...",
  disabled = false,
  sendDisabled = disabled,
  className,
  autoFocus = false,
  focusRequest = 0,
  onStop,
  dataScope,
  onDataScopeOpen,
  pendingUserInput = null,
  onUserInputSubmit,
  onUserInputCancel,
  userInputError = null,
  replyContext = null,
  onClearReplyContext,
}: {
  onSubmit: (
    message: string,
    engine: ChatEngine,
    files: File[],
    replyContext?: string,
  ) => void;
  engine: ChatEngine;
  onEngineChange: (engine: ChatEngine) => void;
  placeholder?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  focusRequest?: number;
  onStop?: () => void;
  dataScope?: ChatDataScope;
  dataResources?: ChatDataResource[];
  dataResourcesLoading?: boolean;
  dataResourcesError?: string | null;
  onDataScopeChange?: (scope: ChatDataScope) => void;
  onDataResourcesRefresh?: () => void;
  onDataScopeOpen?: () => void;
  pendingUserInput?: PendingUserInput | null;
  onUserInputSubmit?: (answer: UserInputAnswer) => void;
  onUserInputCancel?: () => void;
  userInputError?: string | null;
  replyContext?: string | null;
  onClearReplyContext?: () => void;
}) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [engineMenuOpen, setEngineMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputId = useId();
  const selectedEngineLabel =
    engineOptions.find((option) => option.value === engine)?.label || "Auto";
  const visibleUserInput = disabled || sendDisabled ? null : pendingUserInput;
  const composerDisabled = disabled || Boolean(visibleUserInput);
  const effectiveSendDisabled = sendDisabled || Boolean(visibleUserInput);
  useEffect(() => {
    if (!autoFocus && focusRequest === 0) return;
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, focusRequest]);
  const focusComposer = () => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const selectEngine = (nextEngine: string) => {
    onEngineChange(nextEngine as ChatEngine);
    setEngineMenuOpen(false);
  };
  const submitMessage = () => {
    const message = value.trim();
    if (!message || effectiveSendDisabled) return;

    if (replyContext) {
      onSubmit(message, engine, files, replyContext);
      onClearReplyContext?.();
    } else {
      onSubmit(message, engine, files);
    }
    setValue("");
    setFiles([]);
    focusComposer();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    submitMessage();
  };

  const submitFromKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || effectiveSendDisabled)
      return;
    event.preventDefault();
    submitMessage();
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;
    setFiles((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  return (
    <form
      className={cn(
        "grid min-h-0 w-full gap-0 sm:min-h-[100px]",
        !visibleUserInput &&
          "rounded-[18px] border border-border bg-card p-2 shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/10 sm:rounded-[20px]",
        className,
      )}
      onSubmit={submit}
    >
      {visibleUserInput ? (
        <AskUserQuestion
          interaction={visibleUserInput}
          submitting={disabled || sendDisabled}
          error={userInputError}
          onSubmit={(answer) => onUserInputSubmit?.(answer)}
          onCancel={() => onUserInputCancel?.()}
        />
      ) : (
        <>
          {files.length > 0 && (
            <div
              className="flex min-w-0 items-center gap-2 overflow-x-auto px-2 pb-1"
              aria-label="Selected files"
            >
              {files.map((file, index) => {
                const FileTypeIcon = isSpreadsheetFile(file.name)
                  ? SheetIcon
                  : FileIcon;
                return (
                  <div
                    className="flex max-w-[320px] shrink-0 items-center gap-1"
                    key={`${file.name}-${file.size}-${index}`}
                  >
                    <Badge
                      variant="secondary"
                      className="max-w-[280px] rounded-full"
                    >
                      <FileTypeIcon aria-hidden="true" />
                      <span className="max-w-[240px] truncate">
                        {file.name}
                      </span>
                    </Badge>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      className="shrink-0 rounded-full"
                      aria-label={`Remove ${file.name}`}
                      disabled={composerDisabled}
                      onClick={() => removeFile(index)}
                    >
                      <XIcon />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {replyContext && (
            <div
              className="mx-2 mb-1 flex min-w-0 items-center gap-2 border-l-2 border-muted-foreground/30 pl-3"
              data-reply-context-preview
              role="group"
              aria-label="Reply context"
            >
              <ReplyIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div
                className="min-w-0 flex-1 truncate py-2 text-sm text-foreground"
                title={replyContext}
              >
                {replyContext}
              </div>
              {onClearReplyContext && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 rounded-full text-muted-foreground"
                  aria-label="Clear reply context"
                  onClick={onClearReplyContext}
                >
                  <XIcon />
                </Button>
              )}
            </div>
          )}
          <Textarea
            ref={textareaRef}
            className="max-h-40 min-h-11 w-full resize-none border-0 bg-transparent px-3 py-2.5 text-base leading-6 shadow-none placeholder:text-muted-foreground focus-visible:ring-0 sm:min-h-12 sm:px-4 sm:py-3"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={submitFromKeyboard}
            placeholder={placeholder}
            disabled={composerDisabled}
            rows={1}
            aria-label="Ask AXIOM"
          />
          <div
            className="flex min-w-0 flex-nowrap items-center gap-2 px-1 pt-2 sm:justify-between sm:gap-3"
            data-chat-composer-actions
          >
            <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
              <input
                id={fileInputId}
                type="file"
                multiple
                className="hidden"
                disabled={composerDisabled}
                onChange={addFiles}
              />
              <Button
                render={<label htmlFor={fileInputId} />}
                nativeButton={false}
                variant="outline"
                className="size-10 rounded-full p-0"
                aria-label="Attach files"
                disabled={composerDisabled}
              >
                <PaperclipIcon />
              </Button>
              <DropdownMenu
                open={engineMenuOpen}
                onOpenChange={setEngineMenuOpen}
              >
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 w-[92px] shrink-0 justify-between rounded-full px-2 sm:min-w-[128px] sm:px-3"
                      aria-label="Select response type"
                      disabled={composerDisabled}
                    />
                  }
                >
                  {selectedEngineLabel}
                  <ChevronDownIcon data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[128px]">
                  <DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                      value={engine}
                      onValueChange={selectEngine}
                    >
                      {engineOptions.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {dataScope && onDataScopeOpen ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="size-10 shrink-0 rounded-full !p-0 sm:w-auto sm:!px-3"
                  aria-label="Open chat files"
                  title="Open chat files"
                  disabled={composerDisabled}
                  onClick={onDataScopeOpen}
                >
                  <DatabaseIcon data-icon="inline-start" />
                  <span className="hidden sm:inline">Files</span>
                </Button>
              ) : null}
            </div>
            <Button
              className="size-10 shrink-0 rounded-full shadow-sm"
              type="submit"
              aria-label={effectiveSendDisabled && onStop ? "Stop" : "Send"}
              disabled={effectiveSendDisabled && !onStop}
              onClick={effectiveSendDisabled && onStop ? onStop : undefined}
            >
              {effectiveSendDisabled && onStop ? <SquareIcon /> : <SendIcon />}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

function isSpreadsheetFile(name: string) {
  return /\.(csv|tsv|xls|xlsx|ods)$/i.test(name);
}
