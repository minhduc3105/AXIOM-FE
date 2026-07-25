import { FormEvent, KeyboardEvent, useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

export function ChatComposer({
  onSubmit,
  placeholder = "Ask AXIOM to review, analyze, or generate...",
  disabled = false,
  sendDisabled = disabled,
  className,
}: {
  onSubmit: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() && !sendDisabled) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  const submitFromKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || sendDisabled) return;
    event.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  return (
    <form
      className={cn(
        "flex min-h-16 w-full items-end gap-3 rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/95 p-2 pl-5 shadow-[0_24px_70px_rgba(24,24,18,0.13)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/95",
        className,
      )}
      onSubmit={submit}
    >
      <Textarea
        className="max-h-40 min-h-12 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-3 text-base leading-6 text-[#191915] shadow-none [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] placeholder:text-[#8a8275] focus-visible:ring-0 dark:bg-transparent dark:text-[#eee8dc] dark:placeholder:text-[#aaa397] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-[#c7bdad] dark:[&::-webkit-scrollbar-thumb]:hover:bg-[#4a493f]"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={submitFromKeyboard}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Ask AXIOM"
      />
      <Button
        className="size-12 shrink-0 rounded-full bg-[#2456e8] text-white shadow-[0_12px_28px_rgba(36,86,232,0.32)] hover:bg-[#1d48c7]"
        type="submit"
        aria-label="Send"
        disabled={sendDisabled}
      >
        <SendIcon className="size-5" />
      </Button>
    </form>
  );
}
