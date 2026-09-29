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
    favoriteState.storageKey === favoriteStorageKey
      ? favoriteState.aliases
      : [];
  const favoriteAliases = useMemo(
    () => new Set(favoriteModelAliases),
    [favoriteModelAliases],
  );
  const favoriteModels = models.filter((model) =>
    favoriteAliases.has(model.alias),
  );
  const providerGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; label: string; models: ChatModelOption[] }
    >();

    for (const model of models) {
      if (favoriteAliases.has(model.alias)) continue;
      const providerId = model.providerId ?? "other";
      const providerLabel =
        model.providerName ?? model.providerId ?? "Other models";
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
    executionModeOptions.find((option) => option.value === executionMode)
      ?.label ?? "Instant";
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
      <div key={model.id} className="flex min-w-0 items-center gap-1">
        <DropdownMenuItem
          className="min-h-10 min-w-0 flex-1 gap-2 py-1.5 pr-1.5"
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
          {isSelected && <CheckIcon aria-hidden="true" />}
        </DropdownMenuItem>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`${isFavorite ? "Unpin" : "Pin"} ${model.label}`}
          aria-pressed={isFavorite}
          title={isFavorite ? "Remove from favorites" : "Pin to favorites"}
          onClick={() => toggleFavorite(model.alias)}
        >
          <StarIcon
            fill={isFavorite ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </Button>
      </div>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-9 max-w-[240px] min-w-0 justify-start gap-1.5 px-2 sm:max-w-[280px]"
            aria-label={accessibleLabel}
            title={`${modelLabel} · ${executionModeLabel}`}
          />
        }
      >
        <span className="min-w-0 truncate">{modelLabel}</span>
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          · {executionModeLabel}
        </span>
        <ChevronDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-80 max-w-[calc(100vw-1rem)] p-1.5"
      >
        <DropdownMenuGroup className="max-h-[min(65vh,30rem)] overflow-x-hidden overflow-y-auto">
          <DropdownMenuLabel>Model</DropdownMenuLabel>
          {favoriteModels.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-1.5 pt-2 [&>svg]:size-3.5">
                <StarIcon fill="currentColor" aria-hidden="true" />
                Favorites
              </DropdownMenuLabel>
              {favoriteModels.map((model) =>
                renderModelItem(model, { showProvider: true }),
              )}
              {providerGroups.length > 0 && <DropdownMenuSeparator />}
            </>
          )}
          {models.length > 0 ? (
            providerGroups.map((group) => (
              <DropdownMenuGroup key={group.id} className="mt-1 first:mt-0">
                <DropdownMenuLabel className="pt-2">
                  {group.label}
                </DropdownMenuLabel>
                {group.models.map((model) => renderModelItem(model))}
              </DropdownMenuGroup>
            ))
          ) : (
            <p className="px-1.5 py-2 text-sm text-muted-foreground">
              No models available
            </p>
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
                key={option.value}
                value={option.value}
                className="items-start py-2 pr-8"
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
