import { useId, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  DatabaseIcon,
  FileSpreadsheetIcon,
  Layers3Icon,
  PlugZapIcon,
  SearchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import {
  allChatDataScope,
  chatDataScopeLabel,
  createSelectedChatDataScope,
  type ChatDataResource,
  type ChatDataResourceKind,
  type ChatDataScope,
} from "../model/chatDataScope";

type ChatDataScopeSelectorProps = {
  scope: ChatDataScope;
  resources: ChatDataResource[];
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onChange: (scope: ChatDataScope) => void;
};

export function ChatDataScopeSelector({
  scope,
  resources,
  loading = false,
  error = null,
  disabled = false,
  onChange,
}: ChatDataScopeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftMode, setDraftMode] = useState<ChatDataScope["mode"]>(scope.mode);
  const [draftIds, setDraftIds] = useState<string[]>(scope.resourceIds);
  const inputId = useId();
  const readyResources = useMemo(
    () => resources.filter((resource) => resource.status === "ready"),
    [resources],
  );
  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return resources;
    return resources.filter((resource) =>
      [resource.name, resource.source, resource.detail].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, resources]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) return;
    setDraftMode(scope.mode);
    setDraftIds(scope.resourceIds);
    setQuery("");
  };

  const toggleResource = (resourceId: string, checked: boolean) => {
    setDraftMode("selected");
    setDraftIds((current) =>
      checked
        ? [...new Set([...current, resourceId])]
        : current.filter((id) => id !== resourceId),
    );
  };

  const applyScope = () => {
    onChange(
      draftMode === "all"
        ? allChatDataScope
        : createSelectedChatDataScope(draftIds, resources),
    );
    setOpen(false);
  };

  const scopeLabel = chatDataScopeLabel(scope);
  const applyDisabled = draftMode === "selected" && draftIds.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-10 max-w-[220px] justify-between gap-2 rounded-full border-border bg-secondary px-3 text-secondary-foreground shadow-none hover:bg-muted",
          scope.mode === "selected" &&
            "border-primary/35 bg-primary/8 text-primary hover:bg-primary/12",
        )}
        aria-label={`Select data scope, currently ${scopeLabel}`}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => handleOpenChange(true)}
      >
        <DatabaseIcon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{scopeLabel}</span>
        <ChevronDownIcon className="size-3.5 shrink-0" />
      </Button>

      <DialogContent className="flex max-h-[min(780px,calc(100dvh-2rem))] w-[min(720px,calc(100vw-2rem))] max-w-[min(720px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:max-w-[min(720px,calc(100vw-2rem))]">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-lg font-semibold">
              Choose data for this chat
            </DialogTitle>
            <Badge variant="secondary" className="font-normal">
              Mock catalog
            </Badge>
          </div>
          <DialogDescription className="max-w-2xl leading-5">
            Control which workspace sources AXIOM can retrieve for your next
            questions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-1 gap-3 border-b border-border bg-muted/25 p-5 sm:grid-cols-2 sm:px-6">
          <ScopeChoice
            active={draftMode === "all"}
            description={`${readyResources.length} ready sources in this workspace`}
            icon={<Layers3Icon />}
            label="All workspace data"
            onClick={() => setDraftMode("all")}
          />
          <ScopeChoice
            active={draftMode === "selected"}
            description={
              draftIds.length > 0
                ? `${draftIds.length} ${draftIds.length === 1 ? "source" : "sources"} selected`
                : "Choose one or more sources"
            }
            icon={<DatabaseIcon />}
            label="Selected data"
            onClick={() => setDraftMode("selected")}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col transition-opacity",
            draftMode === "all" && "opacity-55",
          )}
          aria-disabled={draftMode === "all"}
        >
          <div className="shrink-0 px-5 pb-3 pt-4 sm:px-6">
            <label className="sr-only" htmlFor={inputId}>
              Search workspace data
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={inputId}
                className="h-10 bg-background pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files, databases, and connectors"
                disabled={draftMode === "all"}
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-5 sm:px-6">
            <div className="space-y-2 pb-4">
              {loading ? (
                <DataScopeLoading />
              ) : error ? (
                <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              ) : filteredResources.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No data matches your search.
                </p>
              ) : (
                filteredResources.map((resource) => (
                  <DataResourceRow
                    key={resource.id}
                    resource={resource}
                    checked={draftIds.includes(resource.id)}
                    disabled={
                      draftMode === "all" || resource.status !== "ready"
                    }
                    onCheckedChange={(checked) =>
                      toggleResource(resource.id, checked)
                    }
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {draftMode === "all"
              ? "Newly added workspace data will be included automatically."
              : `${draftIds.length} of ${readyResources.length} ready sources selected.`}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={applyDisabled} onClick={applyScope}>
              Apply scope
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScopeChoice({
  active,
  description,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-20 items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/30 hover:bg-accent/50",
      )}
      aria-pressed={active}
      onClick={onClick}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground [&>svg]:size-4",
          active && "bg-primary text-primary-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-4 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

function DataResourceRow({
  resource,
  checked,
  disabled,
  onCheckedChange,
}: {
  resource: ChatDataResource;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const Icon = resourceIcon(resource.kind);

  return (
    <label
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors",
        !disabled && "hover:border-primary/30 hover:bg-accent/35",
        checked && !disabled && "border-primary/35 bg-primary/5",
        disabled && "cursor-not-allowed opacity-65",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(nextChecked) => onCheckedChange(nextChecked === true)}
        aria-label={`Select ${resource.name}`}
      />
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {resource.name}
          </span>
          {resource.status !== "ready" && (
            <Badge variant="outline" className="h-5 shrink-0 font-normal capitalize">
              {resource.status}
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {resource.source} · {resource.detail}
        </span>
      </span>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
        {resource.updatedAt}
      </span>
    </label>
  );
}

function DataScopeLoading() {
  return (
    <div className="space-y-2" aria-label="Loading workspace data">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-[66px] animate-pulse rounded-xl border border-border bg-muted"
        />
      ))}
    </div>
  );
}

function resourceIcon(kind: ChatDataResourceKind) {
  if (kind === "database") return DatabaseIcon;
  if (kind === "connector") return PlugZapIcon;
  return FileSpreadsheetIcon;
}
