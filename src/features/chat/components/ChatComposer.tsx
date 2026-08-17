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
import type {
  ChatEngine,
  ChatExecutionMode,
  ChatModelOption,
} from "../model/types";

const engineOptions: Array<{ value: ChatEngine; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "general", label: "General" },
  { value: "reason", label: "Reason" },
  { value: "report", label: "Report" },
];

const executionModeOptions = [
  { value: "instant", label: "Instant", description: "Run immediately" },
  {
    value: "thinking",
    label: "Thinking",
    description: "Review plan before running",
  },
] satisfies Array<{
  value: ChatExecutionMode;
  label: string;
  description: string;
}>;

export function ChatComposer({
  onSubmit,
  engine,
  executionMode,
  onEngineChange,
  onExecutionModeChange,
  models,
  selectedModelAlias,
  onModelChange,
  placeholder = "Ask AXIOM to review, analyze, or generate...",
  disabled = false,
  sendDisabled = disabled,
  className,
}: {
  onSubmit: (
    message: string,
    engine: ChatEngine,
    files: File[],
    modelAlias?: string | null,
    executionMode?: ChatExecutionMode,
  ) => void;
  engine: ChatEngine;
  executionMode: ChatExecutionMode;
  models: ChatModelOption[];
  selectedModelAlias: string | null;
  onEngineChange: (engine: ChatEngine) => void;
  onExecutionModeChange: (mode: ChatExecutionMode) => void;
  onModelChange: (modelAlias: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [engineMenuOpen, setEngineMenuOpen] = useState(false);
  const [executionModeMenuOpen, setExecutionModeMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const fileInputId = useId();
  const selectedEngineLabel =
    engineOptions.find((option) => option.value === engine)?.label || "Auto";
  const selectedExecutionModeLabel =
    executionModeOptions.find((option) => option.value === executionMode)
      ?.label || "Thinking";
  const selectedModel =
    models.find((model) => model.alias === selectedModelAlias) ?? models[0];
  const selectedModelLabel = selectedModel?.label ?? "Model";
  const selectEngine = (nextEngine: string) => {
    onEngineChange(nextEngine as ChatEngine);
    setEngineMenuOpen(false);
  };
  const selectModel = (modelAlias: string) => {
    onModelChange(modelAlias || null);
    setModelMenuOpen(false);
  };
  const selectExecutionMode = (nextMode: string) => {
    onExecutionModeChange(nextMode as ChatExecutionMode);
    setExecutionModeMenuOpen(false);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() && !sendDisabled) {
      onSubmit(
        value.trim(),
        engine,
        files,
        selectedModel?.alias ?? null,
        executionMode,
      );
      setValue("");
      setFiles([]);
    }
  };

  const submitFromKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || sendDisabled) return;
    event.preventDefault();
    if (value.trim()) {
      onSubmit(
        value.trim(),
        engine,
        files,
        selectedModel?.alias ?? null,
        executionMode,
      );
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
      {files.length > 0 && (
        <div
          className="flex min-w-0 gap-2 overflow-x-auto px-2 pb-1 [scrollbar-color:#c7bca9_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c7bca9] dark:[scrollbar-color:#4a4438_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-[#4a4438]"
          aria-label="Selected files"
        >
          {files.map((file, index) => {
            const FileTypeIcon = isSpreadsheetFile(file.name)
              ? SheetIcon
              : FileIcon;
            return (
              <Badge
                variant="outline"
                className="h-8 max-w-[320px] shrink-0 gap-2 rounded-full border-[#d8d0c2]/80 bg-[#f4efe5]/80 px-3 text-[#4f4a42] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1]"
                key={`${file.name}-${file.size}-${index}`}
              >
                <FileTypeIcon className="size-3.5 shrink-0 text-[#2456e8] dark:text-[#7895ff]" />
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
        className="max-h-40 min-h-12 w-full resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-base leading-6 text-[#191915] shadow-none [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] placeholder:text-[#8a8275] focus-visible:ring-0 dark:bg-transparent dark:text-[#eee8dc] dark:placeholder:text-[#aaa397] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-[#c7bdad] dark:[&::-webkit-scrollbar-thumb]:hover:bg-[#4a493f]"
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
            className="size-10 rounded-full border-[#d8d0c2]/80 bg-[#f4efe5]/70 p-0 text-[#4f4a42] shadow-none hover:bg-[#ebe4d8] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1] dark:hover:bg-white/10"
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
          <DropdownMenu
            open={executionModeMenuOpen}
            onOpenChange={setExecutionModeMenuOpen}
          >
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-w-[128px] justify-between rounded-full border-[#d8d0c2]/80 bg-[#f4efe5]/70 px-3 text-[#4f4a42] shadow-none hover:bg-[#ebe4d8] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1] dark:hover:bg-white/10"
                  aria-label="Select execution mode"
                  disabled={disabled}
                />
              }
            >
              {selectedExecutionModeLabel}
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
              <DropdownMenuRadioGroup
                value={executionMode}
                onValueChange={selectExecutionMode}
              >
                {executionModeOptions.map((option) => {
                  const instantUnavailable =
                    option.value === "instant" && engine !== "report";
                  return (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      disabled={instantUnavailable}
                      className="items-start py-2"
                    >
                      <span className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {instantUnavailable
                            ? "Instant currently supports Report"
                            : option.description}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <DropdownMenu open={modelMenuOpen} onOpenChange={setModelMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 max-w-[220px] min-w-[132px] justify-between rounded-full border-[#d8d0c2]/80 bg-[#f4efe5]/70 px-3 text-[#4f4a42] shadow-none hover:bg-[#ebe4d8] dark:border-[#38372f] dark:bg-white/5 dark:text-[#d5cec1] dark:hover:bg-white/10"
                  aria-label="Select LLM model"
                  disabled={disabled || models.length === 0}
                />
              }
            >
              <span className="truncate">{selectedModelLabel}</span>
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuRadioGroup
                value={selectedModel?.alias ?? ""}
                onValueChange={selectModel}
              >
                {models.map((model) => (
                  <DropdownMenuRadioItem key={model.id} value={model.alias}>
                    {model.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="size-12 shrink-0 rounded-full bg-[#2456e8] text-white shadow-[0_12px_28px_rgba(36,86,232,0.32)] hover:bg-[#1d48c7]"
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
