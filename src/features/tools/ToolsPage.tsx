import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowDownAZIcon,
  BoxesIcon,
  ChevronDownIcon,
  CircleOffIcon,
  PowerIcon,
  PowerOffIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress, ProgressValue } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ToolCard } from "./components/ToolCard";
import { ToolCatalogSkeleton } from "./components/ToolCatalogSkeleton";
import { useToolCatalog } from "./model/useToolCatalog";
import { useToolsState } from "./model/ToolsProvider";
import { formatToolKind, formatToolName } from "./model/toolPresentation";
import type {
  ToolCatalogSort,
  ToolCatalogViewState,
  ToolKind,
  ToolStatusFilter,
  ToolSummary,
} from "./model/types";
import { toolKinds } from "./model/types";

type ToolsPageProps = {
  onOpenTool: (toolName: string, returnViewState: ToolCatalogViewState) => void;
  viewState: ToolCatalogViewState;
  onViewStateChange: (viewState: ToolCatalogViewState) => void;
  availabilityScope: ToolAvailabilityScope;
};

type BulkToolAction = "enable" | "disable";

type BulkProgress = {
  action: BulkToolAction;
  total: number;
  completed: number;
  succeeded: string[];
  failed: string[];
  running: boolean;
};

type ToolAvailabilityScope = {
  organizationName: string;
  workspaceName: string;
};

function SortDropdown({
  value,
  onValueChange,
}: {
  value: ToolCatalogSort;
  onValueChange: (value: ToolCatalogSort) => void;
}) {
  const options = [
    { value: "name", label: "Name A–Z" },
    { value: "kind", label: "Type A–Z" },
  ] as const;
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Sort tools ascending by"
            className="justify-between"
          >
            <ArrowDownAZIcon data-icon="inline-start" />
            <span>{selected?.label}</span>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) =>
            onValueChange(nextValue as ToolCatalogSort)
          }
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolSection({
  title,
  description,
  tools,
  enabled,
  onOpenTool,
  action,
  availabilityScope,
}: {
  title: string;
  description: string;
  tools: ToolSummary[];
  enabled: boolean;
  onOpenTool: (toolName: string) => void;
  action?: React.ReactNode;
  availabilityScope: ToolAvailabilityScope;
}) {
  return (
    <section aria-labelledby={`${enabled ? "active" : "disabled"}-tools-title`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={
              enabled
                ? "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-success/30 bg-success/10 text-success"
                : "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border bg-muted text-muted-foreground"
            }
          >
            {enabled ? (
              <ActivityIcon className="size-4" />
            ) : (
              <CircleOffIcon className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={`${enabled ? "active" : "disabled"}-tools-title`}
                className="text-lg font-semibold text-foreground"
              >
                {title}
              </h2>
              <Badge
                variant="outline"
                className="h-5 rounded-full bg-card px-2 text-[10px] tabular-nums text-muted-foreground"
              >
                {tools.length}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard
            key={tool.name}
            tool={tool}
            enabled={enabled}
            onOpen={onOpenTool}
            availabilityScope={availabilityScope}
          />
        ))}
      </div>
    </section>
  );
}

export function ToolsPage({
  onOpenTool,
  viewState,
  onViewStateChange,
  availabilityScope,
}: ToolsPageProps) {
  const [filters, setFilters] = useState(() => ({
    query: viewState.query,
    kind: viewState.kind,
    status: viewState.status,
    sort: viewState.sort,
  }));
  const { query, kind, status, sort } = filters;
  const [pendingBulkAction, setPendingBulkAction] =
    useState<BulkToolAction | null>(null);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const { catalog, loading, error, errorKind, refresh } = useToolCatalog({
    kind,
    query,
  });
  const {
    isToolEnabled,
    isToolUpdating,
    reconcileCatalogTools,
    setToolEnabled,
  } = useToolsState();
  const initialLoading = loading && !catalog;
  const isRefreshing = loading && Boolean(catalog);
  const hasActiveFilters = Boolean(query.trim() || kind || status !== "all");
  const filtersRef = useRef(filters);
  const restoreScrollRef = useRef(viewState.scrollY);

  const updateFilters = (nextFilters: typeof filters) => {
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
    onViewStateChange({ ...nextFilters, scrollY: restoreScrollRef.current });
  };

  useEffect(() => {
    if (!restoreScrollRef.current || loading || !catalog) return;

    const outerFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: restoreScrollRef.current, behavior: "auto" });
        restoreScrollRef.current = 0;
      });
    });

    return () => window.cancelAnimationFrame(outerFrame);
  }, [catalog, loading]);

  useEffect(() => {
    if (!catalog || loading || error || kind || query.trim()) return;
    reconcileCatalogTools(catalog.tools);
  }, [catalog, error, kind, loading, query, reconcileCatalogTools]);

  const { activeTools, disabledTools, resultCount } = useMemo(() => {
    const compareTools = (left: ToolSummary, right: ToolSummary) => {
      const byName = () =>
        formatToolName(left.name).localeCompare(formatToolName(right.name));
      if (sort === "kind")
        return (
          formatToolKind(left.kind).localeCompare(formatToolKind(right.kind)) ||
          byName()
        );
      return byName();
    };
    const matchingTools = (catalog?.tools ?? []).filter((tool) => {
      const enabled = isToolEnabled(tool.name, tool.enabled);
      return status === "all" || (status === "active" ? enabled : !enabled);
    });
    return {
      activeTools: matchingTools
        .filter((tool) => isToolEnabled(tool.name, tool.enabled))
        .sort(compareTools),
      disabledTools: matchingTools
        .filter((tool) => !isToolEnabled(tool.name, tool.enabled))
        .sort(compareTools),
      resultCount: matchingTools.length,
    };
  }, [catalog?.tools, isToolEnabled, sort, status]);

  const actionableActiveCount = activeTools.filter(
    (tool) => !isToolUpdating(tool.name),
  ).length;
  const actionableDisabledCount = disabledTools.filter(
    (tool) => !isToolUpdating(tool.name),
  ).length;
  const pendingTools =
    pendingBulkAction === "enable" ? disabledTools : activeTools;
  const pendingActionableCount = pendingTools.filter(
    (tool) => !isToolUpdating(tool.name),
  ).length;
  const isBulkEnable = pendingBulkAction === "enable";
  const bulkBusy = Boolean(bulkProgress?.running);

  const runBulkAction = async (action: BulkToolAction, toolNames: string[]) => {
    setBulkProgress({
      action,
      total: toolNames.length,
      completed: 0,
      succeeded: [],
      failed: [],
      running: true,
    });

    for (const toolName of toolNames) {
      const succeeded = await setToolEnabled(toolName, action === "enable");
      setBulkProgress((current) =>
        current
          ? {
              ...current,
              completed: current.completed + 1,
              succeeded: succeeded
                ? [...current.succeeded, toolName]
                : current.succeeded,
              failed: succeeded
                ? current.failed
                : [...current.failed, toolName],
            }
          : current,
      );
    }

    setBulkProgress((current) =>
      current ? { ...current, running: false } : current,
    );
  };

  const confirmBulkAction = () => {
    if (!pendingBulkAction) return;
    void runBulkAction(
      pendingBulkAction,
      pendingTools
        .filter((tool) => !isToolUpdating(tool.name))
        .map((tool) => tool.name),
    );
  };
  const retryFailedTools = () => {
    if (!bulkProgress || !bulkProgress.failed.length) return;
    void runBulkAction(bulkProgress.action, bulkProgress.failed);
  };
  const bulkProgressPercent =
    bulkProgress && bulkProgress.total
      ? Math.round((bulkProgress.completed / bulkProgress.total) * 100)
      : 0;
  const handleOpenTool = (toolName: string) => {
    const returnViewState = { ...filtersRef.current, scrollY: window.scrollY };
    onViewStateChange(returnViewState);
    window.scrollTo({ top: 0, behavior: "instant" });
    onOpenTool(toolName, returnViewState);
  };
  const clearFilters = () => {
    updateFilters({ query: "", kind: undefined, status: "all", sort: "name" });
  };

  return (
    <section
      className="relative min-h-screen w-full overflow-x-hidden px-5 pb-12 pt-20 sm:px-8 md:pt-10"
      aria-label="Tools catalog"
    >
      <div className="mx-auto grid w-full max-w-[1360px] gap-6">
        <Card className="gap-0 rounded-xl bg-card p-0 shadow-sm">
          <header className="grid gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tool management
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Tools
                  </h1>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full bg-muted px-2.5 text-[10px] font-medium tabular-nums text-muted-foreground"
                  >
                    {activeTools.length} active
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full bg-muted px-2.5 text-[10px] font-medium tabular-nums text-muted-foreground"
                  >
                    {disabledTools.length} disabled
                  </Badge>
                </div>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Control which methods are available to AXIOM workflows. Open a
                  tool card to inspect its read-only details.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Availability scope:{" "}
                  <span className="font-medium text-muted-foreground">
                    {availabilityScope.organizationName}
                  </span>{" "}
                  · {availabilityScope.workspaceName}. Changes apply to the
                  current Methods-Hub process.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-9 w-full rounded-full sm:w-auto"
                onClick={refresh}
                disabled={loading}
                aria-busy={loading || undefined}
              >
                <RefreshCwIcon
                  data-icon="inline-start"
                  className={loading ? "animate-spin" : undefined}
                />{" "}
                {isRefreshing ? "Updating catalog…" : "Refresh"}
              </Button>
            </div>
            <div className="grid gap-3 border-t pt-4 xl:grid-cols-[minmax(240px,1fr)_minmax(390px,auto)] xl:items-center">
              <div className="relative min-w-0">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) =>
                    updateFilters({
                      ...filtersRef.current,
                      query: event.target.value,
                    })
                  }
                  placeholder="Search tools or capabilities"
                  aria-label="Search tools"
                  className="h-9 rounded-full bg-card pl-9 pr-3"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
                <ToggleGroup
                  value={[status]}
                  onValueChange={(values) => {
                    const next = values[0] as ToolStatusFilter | undefined;
                    if (next)
                      updateFilters({ ...filtersRef.current, status: next });
                  }}
                  aria-label="Filter tools by status"
                  variant="outline"
                  size="sm"
                  className="min-w-0 overflow-x-auto rounded-full border-border bg-muted/50 p-1"
                >
                  <ToggleGroupItem
                    value="all"
                    className="rounded-full px-3 text-xs"
                  >
                    All
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="active"
                    className="rounded-full px-3 text-xs"
                  >
                    Active
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="disabled"
                    className="rounded-full px-3 text-xs"
                  >
                    Disabled
                  </ToggleGroupItem>
                </ToggleGroup>
                <SortDropdown
                  value={sort}
                  onValueChange={(value) =>
                    updateFilters({ ...filtersRef.current, sort: value })
                  }
                />
                <Badge
                  variant="outline"
                  className="h-8 justify-center rounded-full bg-card px-3 text-xs font-medium tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  {resultCount} results
                </Badge>
              </div>
            </div>
            <ToggleGroup
              value={[kind ?? "all"]}
              onValueChange={(values) => {
                const next = values[0];
                updateFilters({
                  ...filtersRef.current,
                  kind: next === "all" ? undefined : (next as ToolKind),
                });
              }}
              aria-label="Filter tools by type"
              variant="outline"
              size="sm"
              className="min-w-0 overflow-x-auto rounded-full border-border bg-muted/50 p-1"
            >
              <ToggleGroupItem
                value="all"
                className="rounded-full px-3 text-xs"
              >
                <SlidersHorizontalIcon data-icon="inline-start" /> All types
              </ToggleGroupItem>
              {toolKinds.map((toolKind) => (
                <ToggleGroupItem
                  key={toolKind}
                  value={toolKind}
                  className="rounded-full px-3 text-xs"
                >
                  {formatToolKind(toolKind)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </header>
        </Card>

        <Alert className="border-warning/40 bg-warning/10 text-warning">
          <AlertTriangleIcon />
          <AlertTitle>Process-scoped visibility</AlertTitle>
          <AlertDescription className="text-warning">
            Active only means the tool is exposed by this Methods-Hub process.
            It does not confirm service health, and resets when Methods-Hub
            restarts.
          </AlertDescription>
        </Alert>

        {error ? (
          <Alert className="border-warning/40 bg-warning/10 text-warning">
            <AlertTriangleIcon />
            <AlertTitle>
              {catalog
                ? "Catalog update failed"
                : errorKind === "methods_hub_unavailable"
                  ? "Methods-Hub is unavailable"
                  : "Catalog request failed"}
            </AlertTitle>
            <AlertDescription className="text-warning">
              {catalog
                ? "Showing the most recently loaded catalog. Check Methods-Hub and retry the update."
                : errorKind === "methods_hub_unavailable"
                  ? "The live tool catalog could not be loaded. Check the Methods-Hub URL and service configuration, then try again."
                  : "Methods-Hub rejected the catalog request. Check your access and service configuration, then try again."}
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-card"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCwIcon className={loading ? "animate-spin" : ""} />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        {initialLoading ? (
          <ToolCatalogSkeleton />
        ) : catalog && resultCount > 0 ? (
          <div className="grid gap-10">
            {status !== "disabled" ? (
              <ToolSection
                title="Active Tools"
                description="Active tools are exposed by the current Methods-Hub process."
                tools={activeTools}
                enabled
                onOpenTool={handleOpenTool}
                availabilityScope={availabilityScope}
                action={
                  activeTools.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-fit rounded-full px-3"
                      onClick={() => {
                        setBulkProgress(null);
                        setPendingBulkAction("disable");
                      }}
                      disabled={actionableActiveCount === 0 || bulkBusy}
                    >
                      <PowerOffIcon />
                      Disable all active tools
                    </Button>
                  ) : null
                }
              />
            ) : null}
            {status === "all" ? <div className="h-px bg-border" /> : null}
            {status !== "active" ? (
              <ToolSection
                title="Disabled Tools"
                description="Disabled tools are not exposed by the current Methods-Hub process."
                tools={disabledTools}
                enabled={false}
                onOpenTool={handleOpenTool}
                availabilityScope={availabilityScope}
                action={
                  disabledTools.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-fit rounded-full px-3"
                      onClick={() => {
                        setBulkProgress(null);
                        setPendingBulkAction("enable");
                      }}
                      disabled={actionableDisabledCount === 0 || bulkBusy}
                    >
                      <PowerIcon />
                      Enable all disabled tools
                    </Button>
                  ) : null
                }
              />
            ) : null}
          </div>
        ) : catalog && !hasActiveFilters && catalog.tools.length === 0 ? (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card px-5 text-center">
            <div>
              <BoxesIcon className="mx-auto size-6 text-muted-foreground" />
              <h2 className="mt-3 text-sm font-semibold">
                No tools registered
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Methods-Hub returned an empty catalog. Add or register a tool,
                then refresh this page.
              </p>
            </div>
          </div>
        ) : catalog ? (
          <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card px-5 text-center">
            <div>
              <BoxesIcon className="mx-auto size-6 text-muted-foreground" />
              <h2 className="mt-3 text-sm font-semibold">No matching tools</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different keyword, status, or tool type.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <Dialog
        open={pendingBulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !bulkBusy) {
            setPendingBulkAction(null);
            setBulkProgress(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkProgress
                ? bulkProgress.running
                  ? `${bulkProgress.action === "enable" ? "Enabling" : "Disabling"} ${bulkProgress.completed} of ${bulkProgress.total} tools`
                  : bulkProgress.failed.length
                    ? `${bulkProgress.succeeded.length} updated, ${bulkProgress.failed.length} failed`
                    : `${bulkProgress.succeeded.length} tools updated`
                : isBulkEnable
                  ? `Enable ${pendingActionableCount} disabled tools?`
                  : `Disable ${pendingActionableCount} active tools?`}
            </DialogTitle>
            <DialogDescription>
              {bulkProgress ? (
                bulkProgress.running ? (
                  "Updating tools one at a time. You can keep this dialog open while progress is reported."
                ) : bulkProgress.failed.length ? (
                  "Successful updates were kept. Retry only the tools that failed."
                ) : (
                  "All selected tools were updated successfully."
                )
              ) : (
                <>
                  {isBulkEnable
                    ? "The selected tools will become available to AXIOM workflows."
                    : "The selected tools will no longer be available to AXIOM workflows."}{" "}
                  These visibility changes apply only until Methods-Hub
                  restarts.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {bulkProgress ? (
            <div className="grid gap-3 rounded-lg border bg-muted/50 p-3">
              <Progress
                value={bulkProgressPercent}
                aria-label="Bulk tool update progress"
              >
                <ProgressValue>
                  {() => `${bulkProgress.completed} / ${bulkProgress.total}`}
                </ProgressValue>
              </Progress>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{bulkProgress.succeeded.length} succeeded</span>
                {bulkProgress.failed.length ? (
                  <span className="text-destructive">
                    {bulkProgress.failed.length} failed
                  </span>
                ) : null}
              </div>
              {!bulkProgress.running && bulkProgress.failed.length ? (
                <p className="text-xs leading-5 text-destructive">
                  Failed: {bulkProgress.failed.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            {bulkProgress?.running ? (
              <Button type="button" variant="outline" disabled>
                Updating tools…
              </Button>
            ) : bulkProgress ? (
              <>
                {bulkProgress.failed.length ? (
                  <Button type="button" onClick={retryFailedTools}>
                    Retry failed tools
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPendingBulkAction(null);
                    setBulkProgress(null);
                  }}
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingBulkAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={isBulkEnable ? "default" : "destructive"}
                  onClick={confirmBulkAction}
                  disabled={pendingActionableCount === 0}
                >
                  {isBulkEnable
                    ? `Enable ${pendingActionableCount} tools`
                    : `Disable ${pendingActionableCount} tools`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
