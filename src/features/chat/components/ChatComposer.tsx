import { FormEvent, KeyboardEvent, useState } from "react";
import { ChevronDownIcon, SendIcon } from "lucide-react";
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
  onSubmit: (message: string, engine: ChatEngine) => void;
  engine: ChatEngine;
  onEngineChange: (engine: ChatEngine) => void;
  placeholder?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [engineMenuOpen, setEngineMenuOpen] = useState(false);
  const selectedEngineLabel =
    engineOptions.find((option) => option.value === engine)?.label || "Auto";
  const selectEngine = (nextEngine: string) => {
    onEngineChange(nextEngine as ChatEngine);
    setEngineMenuOpen(false);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() && !sendDisabled) {
      onSubmit(value.trim(), engine);
      setValue("");
    }
  };

  const submitFromKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || sendDisabled) return;
    event.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim(), engine);
      setValue("");
    }
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
      <div className="flex min-w-0 items-center justify-between gap-3">
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
