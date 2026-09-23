import { CheckIcon, ChevronDownIcon, StarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatExecutionMode, ChatModelOption } from "../model/types";

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

function readFavoriteModelAliases(storageKey: string) {
  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.filter((alias): alias is string => typeof alias === "string")
      : [];
  } catch {
    return [];
  }
}

function writeFavoriteModelAliases(storageKey: string, aliases: string[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(aliases));
  } catch {
    // Favorites remain usable for this session when storage is unavailable.
  }
}

export function ChatModelReasoningSelector({
  models,
  selectedModelAlias,
  executionMode,
  favoriteStorageKey = "axiom.chat.favorite-models",
  onModelChange,
  onExecutionModeChange,
}: {
  models: ChatModelOption[];
  selectedModelAlias: string | null;
  executionMode: ChatExecutionMode;
  favoriteStorageKey?: string;
  onModelChange: (modelAlias: string | null) => void;
  onExecutionModeChange: (mode: ChatExecutionMode) => void;
  }) {
  const [open, setOpen] = useState(false);
  const [favoriteState, setFavoriteState] = useState(() => ({
    storageKey: favoriteStorageKey,
    aliases: readFavoriteModelAliases(favoriteStorageKey),
  }));

  useEffect(() => {
    if (favoriteState.storageKey !== favoriteStorageKey) {
      setFavoriteState({
        storageKey: favoriteStorageKey,
        aliases: readFavoriteModelAliases(favoriteStorageKey),
      });
      return;
    }

    writeFavoriteModelAliases(favoriteStorageKey, favoriteState.aliases);
  }, [favoriteState, favoriteStorageKey]);

  const selectedModel =
    models.find((model) => model.alias === selectedModelAlias) ?? models[0];
  const favoriteModelAliases =
    favoriteState.storageKey === favoriteStorageKey ? favoriteState.aliases : [];
  const favoriteAliases = useMemo(
    () => new Set(favoriteModelAliases),
    [favoriteModelAliases],
  );
  const favoriteModels = models.filter((model) => favoriteAliases.has(model.alias));
  const providerGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; label: string; models: ChatModelOption[] }
    >();

    for (const model of models) {
      if (favoriteAliases.has(model.alias)) continue;
      const providerId = model.providerId ?? "other";
      const providerLabel = model.providerName ?? model.providerId ?? "Other models";
      const group = groups.get(providerId) ?? {
        id: providerId,
        label: providerLabel,
        models: [],
      };
      group.models.push(model);
      groups.set(providerId, group);
    }

    return [...groups.values()];
  }, [favoriteAliases, models]);
  const modelLabel = selectedModel?.label ?? "No model";
  const executionModeLabel =
    executionModeOptions.find((option) => option.value === executionMode)?.label ??
    "Instant";
  const accessibleLabel = `Chat model: ${modelLabel}; Reasoning: ${executionModeLabel}`;
  const selectModel = (modelAlias: string) => {
    onModelChange(modelAlias || null);
    setOpen(false);
  };
  const toggleFavorite = (modelAlias: string) => {
    setFavoriteState((current) => ({
      ...current,
      aliases: current.aliases.includes(modelAlias)
        ? current.aliases.filter((alias) => alias !== modelAlias)
        : [...current.aliases, modelAlias],
    }));
  };

  const renderModelItem = (
    model: ChatModelOption,
    { showProvider = false }: { showProvider?: boolean } = {},
  ) => {
    const isFavorite = favoriteAliases.has(model.alias);
    const providerLabel = model.providerName ?? model.providerId;
    const isSelected = model.alias === selectedModel?.alias;

    return (
      <DropdownMenuItem
        key={model.id}
        className="group/model-item min-h-10 cursor-pointer gap-2 py-1.5 pr-1.5"
        onClick={() => selectModel(model.alias)}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate">{model.label}</span>
          {showProvider && providerLabel && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {providerLabel}
            </span>
          )}
        </span>
        {isSelected && (
          <CheckIcon className="size-4 shrink-0 text-foreground" aria-hidden="true" />
        )}
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`${isFavorite ? "Unpin" : "Pin"} ${model.label}`}
          title={isFavorite ? "Remove from favorites" : "Pin to favorites"}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleFavorite(model.alias);
          }}
        >
          <StarIcon
            className="size-4"
            fill={isFavorite ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
      </DropdownMenuItem>
    );
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
        className="w-80 max-w-[calc(100vw-1rem)] p-1.5"
      >
        <DropdownMenuGroup className="max-h-[min(65vh,30rem)] overflow-x-hidden overflow-y-auto">
          <DropdownMenuLabel>Model</DropdownMenuLabel>
          {favoriteModels.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-1.5 pt-2 text-foreground">
                <StarIcon className="size-3.5" fill="currentColor" aria-hidden="true" />
                Favorites
              </DropdownMenuLabel>
              {favoriteModels.map((model) =>
                renderModelItem(model, { showProvider: true }),
              )}
              {providerGroups.length > 0 && <DropdownMenuSeparator />}
            </>
          )}
          <div aria-label="Model">
            {models.length > 0 ? (
              providerGroups.map((group) => (
                <div key={group.id} className="mt-1 first:mt-0">
                  <DropdownMenuLabel className="border-b border-border/70 px-1.5 pb-1 pt-2 text-[11px] uppercase tracking-[0.08em]">
                    {group.label}
                  </DropdownMenuLabel>
                  {group.models.map((model) => renderModelItem(model))}
                </div>
              ))
            ) : (
              <p className="px-1.5 py-2 text-sm text-muted-foreground">
                No models available
              </p>
            )}
          </div>
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
