import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatExecutionMode, ChatModelOption } from "../model/types";

const primaryModelLimit = 3;

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

export function ChatModelReasoningSelector({
  models,
  selectedModelAlias,
  executionMode,
  onModelChange,
  onExecutionModeChange,
}: {
  models: ChatModelOption[];
  selectedModelAlias: string | null;
  executionMode: ChatExecutionMode;
  onModelChange: (modelAlias: string | null) => void;
  onExecutionModeChange: (mode: ChatExecutionMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedModel =
    models.find((model) => model.alias === selectedModelAlias) ?? models[0];
  const primaryModels = models.slice(0, primaryModelLimit);
  const overflowModels = models.slice(primaryModelLimit);
  const modelLabel = selectedModel?.label ?? "No model";
  const executionModeLabel =
    executionModeOptions.find((option) => option.value === executionMode)?.label ??
    "Instant";
  const accessibleLabel = `Chat model: ${modelLabel}; Reasoning: ${executionModeLabel}`;
  const selectModel = (modelAlias: string) => {
    onModelChange(modelAlias || null);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-9 max-w-[240px] min-w-0 cursor-pointer justify-start gap-1.5 px-2 text-sm font-medium text-foreground hover:bg-muted/70 sm:max-w-[280px]"
            aria-label={accessibleLabel}
            title={`${modelLabel} · ${executionModeLabel}`}
          />
        }
      >
        <span className="min-w-0 truncate">{modelLabel}</span>
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          · {executionModeLabel}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-w-[calc(100vw-1rem)] p-1.5"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Model</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            aria-label="Model"
            value={selectedModel?.alias ?? ""}
            onValueChange={selectModel}
          >
            {models.length > 0 ? (
              primaryModels.map((model) => (
                <DropdownMenuRadioItem
                  className="cursor-pointer py-2 pr-8"
                  key={model.id}
                  value={model.alias}
                >
                  <span className="min-w-0 truncate">{model.label}</span>
                </DropdownMenuRadioItem>
              ))
            ) : (
              <p className="px-1.5 py-2 text-sm text-muted-foreground">
                No models available
              </p>
            )}
          </DropdownMenuRadioGroup>
          {overflowModels.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer py-2">
                  More models
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64 max-w-[calc(100vw-1rem)] p-1.5">
                  <DropdownMenuRadioGroup
                    aria-label="More models"
                    value={selectedModel?.alias ?? ""}
                    onValueChange={selectModel}
                  >
                    {overflowModels.map((model) => (
                      <DropdownMenuRadioItem
                        className="cursor-pointer py-2 pr-8"
                        key={model.id}
                        value={model.alias}
                      >
                        <span className="min-w-0 truncate">
                          {model.label}
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Reasoning</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            aria-label="Reasoning"
            value={executionMode}
            onValueChange={(mode) => {
              onExecutionModeChange(mode as ChatExecutionMode);
              setOpen(false);
            }}
          >
            {executionModeOptions.map((option) => (
              <DropdownMenuRadioItem
                className="cursor-pointer items-start py-2 pr-8"
                key={option.value}
                value={option.value}
              >
                <span className="flex min-w-0 flex-col">
                  <span>{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
