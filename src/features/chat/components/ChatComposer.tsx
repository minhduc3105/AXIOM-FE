import { ChangeEvent, FormEvent, KeyboardEvent, useId, useState } from "react";
import {
  ChevronDownIcon,
  FileIcon,
  PaperclipIcon,
  SendIcon,
  SheetIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/lib/utils";
import type { ChatEngine } from "../model/types";

const engineOptions: Array<{ value: ChatEngine; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "general", label: "General" },
  { value: "reason", label: "Reason" },
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
}: {
  onSubmit: (
    message: string,
    engine: ChatEngine,
    files: File[],
  ) => void;
  engine: ChatEngine;
  onEngineChange: (engine: ChatEngine) => void;
  placeholder?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [engineMenuOpen, setEngineMenuOpen] = useState(false);
  const fileInputId = useId();
  const selectedEngineLabel =
    engineOptions.find((option) => option.value === engine)?.label || "Auto";
  const selectEngine = (nextEngine: string) => {
    onEngineChange(nextEngine as ChatEngine);
    setEngineMenuOpen(false);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() && !sendDisabled) {
      onSubmit(value.trim(), engine, files);
      setValue("");
      setFiles([]);
    }
  };

  const submitFromKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || sendDisabled) return;
    event.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim(), engine, files);
      setValue("");
      setFiles([]);
    }
  };

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;
    setFiles((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <form
      className={cn(
        "grid min-h-[100px] w-full gap-2 rounded-[20px] border border-border bg-card p-2 shadow-sm",
        className,
      )}
      onSubmit={submit}
    >
      {files.length > 0 && (
        <div
          className="flex min-w-0 gap-2 overflow-x-auto px-2 pb-1"
          aria-label="Selected files"
        >
          {files.map((file, index) => {
            const FileTypeIcon = isSpreadsheetFile(file.name)
              ? SheetIcon
              : FileIcon;
            return (
              <Badge
                variant="outline"
                className="h-8 max-w-[320px] shrink-0 gap-2 rounded-full border-border bg-secondary px-3 text-secondary-foreground"
                key={`${file.name}-${file.size}-${index}`}
              >
                <FileTypeIcon className="size-3.5 shrink-0 text-primary" />
                <span className="max-w-[240px] truncate">{file.name}</span>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="-mr-1 rounded-full"
                  aria-label={`Remove ${file.name}`}
                  disabled={disabled}
                  onClick={() => removeFile(index)}
                >
                  <XIcon />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
      <Textarea
        className="max-h-40 min-h-12 w-full resize-none border-0 bg-transparent px-4 py-3 text-base leading-6 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={submitFromKeyboard}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Ask AXIOM"
      />
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <input
            id={fileInputId}
            type="file"
            multiple
            className="hidden"
            disabled={disabled}
            onChange={addFiles}
          />
          <Button
            render={<label htmlFor={fileInputId} />}
            nativeButton={false}
            variant="outline"
            className="size-10 rounded-full border-border bg-secondary p-0 text-secondary-foreground shadow-none hover:bg-muted"
            aria-label="Attach files"
            disabled={disabled}
          >
            <PaperclipIcon />
          </Button>
          <DropdownMenu open={engineMenuOpen} onOpenChange={setEngineMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-w-[128px] justify-between rounded-full border-border bg-secondary px-3 text-secondary-foreground shadow-none hover:bg-muted"
                  aria-label="Select response type"
                  disabled={disabled}
                />
              }
            >
              {selectedEngineLabel}
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[128px]">
              <DropdownMenuRadioGroup value={engine} onValueChange={selectEngine}>
                {engineOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            className="size-10 shrink-0 rounded-full shadow-sm"
            type="submit"
            aria-label="Send"
            disabled={sendDisabled}
          >
            <SendIcon />
          </Button>
        </div>
      </div>
    </form>
  );
}

function isSpreadsheetFile(name: string) {
  return /\.(csv|tsv|xls|xlsx|ods)$/i.test(name);
}
