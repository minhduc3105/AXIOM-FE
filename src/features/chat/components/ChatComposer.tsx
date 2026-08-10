import { ChangeEvent, FormEvent, KeyboardEvent, useId, useState } from "react";
import { ChevronDownIcon, PaperclipIcon, SendIcon, XIcon } from "lucide-react";
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
  onSubmit: (message: string, engine: ChatEngine, files: File[]) => void;
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
        "grid min-h-[116px] w-full gap-2 rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/95 p-2 shadow-[0_24px_70px_rgba(24,24,18,0.13)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/95",
        className,
      )}
      onSubmit={submit}
    >
      <Textarea
        className="max-h-40 min-h-12 w-full resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-base leading-6 text-[#191915] shadow-none [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] placeholder:text-[#8a8275] focus-visible:ring-0 dark:bg-transparent dark:text-[#eee8dc] dark:placeholder:text-[#aaa397] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-[#c7bdad] dark:[&::-webkit-scrollbar-thumb]:hover:bg-[#4a493f]"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={submitFromKeyboard}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Ask AXIOM"
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2" aria-label="Selected files">
          {files.map((file, index) => (
            <span
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#d8d0c2]/80 bg-[#f4efe5]/80 px-3 py-1.5 text-xs text-[#4f4a42] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1]"
              key={`${file.name}-${file.size}-${index}`}
            >
              <span className="max-w-[220px] truncate">{file.name}</span>
              <span className="shrink-0 text-[#8a8275] dark:text-[#aaa397]">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                className="grid size-5 shrink-0 place-items-center rounded-full text-[#6d685e] hover:bg-[#d8d0c2]/70 hover:text-[#191915] dark:text-[#aaa397] dark:hover:bg-white/10 dark:hover:text-[#eee8dc]"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => removeFile(index)}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <input
            id={fileInputId}
            type="file"
            multiple
            className="hidden"
            disabled={disabled}
            onChange={addFiles}
          />
          <Button
            type="button"
            variant="outline"
            className="size-10 rounded-full border-[#d8d0c2]/80 bg-[#f4efe5]/70 p-0 text-[#4f4a42] shadow-none hover:bg-[#ebe4d8] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1] dark:hover:bg-white/10"
            aria-label="Attach files"
            disabled={disabled}
            onClick={() => document.getElementById(fileInputId)?.click()}
          >
            <PaperclipIcon />
          </Button>
          <DropdownMenu open={engineMenuOpen} onOpenChange={setEngineMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-w-[128px] justify-between rounded-full border-[#d8d0c2]/80 bg-[#f4efe5]/70 px-3 text-[#4f4a42] shadow-none hover:bg-[#ebe4d8] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1] dark:hover:bg-white/10"
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
        <Button
          className="size-12 shrink-0 rounded-full bg-[#2456e8] text-white shadow-[0_12px_28px_rgba(36,86,232,0.32)] hover:bg-[#1d48c7]"
          type="submit"
          aria-label="Send"
          disabled={sendDisabled}
        >
          <SendIcon />
        </Button>
      </div>
    </form>
  );
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}
