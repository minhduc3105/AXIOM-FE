import { useMemo, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BoxesIcon,
  CircleOffIcon,
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
import { Input } from "@/components/ui/input";
import { ToolCard } from "./components/ToolCard";
import { ToolCatalogSkeleton } from "./components/ToolCatalogSkeleton";
import { useToolCatalog } from "./model/useToolCatalog";
import { useToolsState } from "./model/ToolsProvider";
import { formatToolKind } from "./model/toolPresentation";
import type { ToolKind, ToolSummary } from "./model/types";
import { toolKinds } from "./model/types";

type ToolsPageProps = {
  onOpenTool: (toolName: string) => void;
};

function ToolSection({
  title,
  description,
  tools,
  enabled,
  onOpenTool,
  action,
}: {
  title: string;
  description: string;
  tools: ToolSummary[];
  enabled: boolean;
  onOpenTool: (toolName: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${enabled ? "active" : "disabled"}-tools-title`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={
              enabled
                ? "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                : "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-[#d8d0c2] bg-[#ece6da] text-[#777064] dark:border-[#38372f] dark:bg-[#252520] dark:text-[#aaa397]"
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
                className="text-lg font-semibold text-[#191915] dark:text-[#f4efe5]"
              >
                {title}
              </h2>
              <Badge
                variant="outline"
                className="h-5 rounded-full border-[#d8d0c2] bg-[#fffdf8]/70 px-2 text-[10px] tabular-nums text-[#625d53] dark:border-[#49483f] dark:bg-white/5 dark:text-[#c5bcaf]"
              >
                {tools.length}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">
              {description}
            </p>
          </div>
        </div>
        {action}
      </div>

      {tools.length > 0 ? (
        <div
          className={
            enabled
              ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }
        >
          {tools.map((tool) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              enabled={enabled}
              onOpen={onOpenTool}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-[20px] border border-dashed border-[#cfc6b8] bg-[#fffdf8]/45 px-5 text-center dark:border-[#49483f] dark:bg-[#1a1a17]/45">
          <div>
            {enabled ? (
              <CircleOffIcon className="mx-auto size-5 text-[#8a8377]" />
            ) : (
              <ActivityIcon className="mx-auto size-5 text-emerald-600 dark:text-emerald-300" />
            )}
            <p className="mt-2 text-sm font-medium">
              {enabled ? "No active tools" : "All matching tools are active"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function ToolsPage({ onOpenTool }: ToolsPageProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ToolKind | undefined>();
  const { catalog, source, loading, error, refresh } = useToolCatalog({
    kind,
    query,
  });
  const { getToolRevision, isToolEnabled, isToolUpdating, setToolEnabled } =
    useToolsState();
  const initialLoading = loading && !catalog;

  const { activeTools, disabledTools } = useMemo(() => {
    const tools = catalog?.tools ?? [];
    return {
      activeTools: tools.filter((tool) =>
        isToolEnabled(tool.name, tool.kind, tool.enabled),
      ),
      disabledTools: tools.filter(
        (tool) => !isToolEnabled(tool.name, tool.kind, tool.enabled),
      ),
    };
  }, [catalog?.tools, isToolEnabled]);

  const disableAllActiveTools = () => {
    activeTools.forEach((tool) => {
      const revision = getToolRevision(tool.name, tool.revision);
      if (typeof revision === "number" && !isToolUpdating(tool.name)) {
        setToolEnabled(tool.name, false, revision);
      }
    });
  };

  const actionableActiveCount = activeTools.filter(
    (tool) =>
      typeof getToolRevision(tool.name, tool.revision) === "number" &&
      !isToolUpdating(tool.name),
  ).length;

  return (
    <section
      className="relative min-h-screen w-full overflow-x-hidden px-5 pb-12 pt-20 sm:px-8 md:pt-10"
      aria-label="Tools catalog"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_78%_5%,rgba(36,86,232,0.10),transparent_34%)] dark:bg-[radial-gradient(circle_at_78%_5%,rgba(120,149,255,0.10),transparent_34%)]"
        aria-hidden="true"
      />
      <div className="mx-auto grid w-full max-w-[1360px] gap-8">
        <header className="grid gap-5 rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/88 p-5 shadow-[0_18px_54px_rgba(24,24,18,0.07)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-6 rounded-full border-[#2456e8]/30 bg-[#edf2ff] px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]"
                >
                  Tool management
                </Badge>
                <span className="text-xs tabular-nums text-[#6d685e] dark:text-[#aaa397]">
                  {activeTools.length} active · {disabledTools.length} disabled
                </span>
              </div>
              <h1 className="text-2xl font-semibold leading-tight text-[#191915] dark:text-[#f4efe5] sm:text-3xl">
                Tools
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
                Control which methods are available to AXIOM workflows. Open a
                tool card to inspect its read-only details.
              </p>
            </div>

            <Button
              variant="outline"
              className="h-9 w-full justify-start rounded-full border-[#d8d0c2] bg-[#fffdf8]/72 px-4 text-[#25241f] hover:bg-[#f4efe5] sm:w-auto dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#eee8dc]"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCwIcon
                data-icon="inline-start"
                className={loading ? "animate-spin" : undefined}
              />
              Refresh catalog
            </Button>
          </div>

          <div className="grid gap-3 rounded-[18px] border border-[#d8d0c2]/80 bg-[#f4efe5]/62 p-3 dark:border-[#38372f] dark:bg-white/5 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center">
            <div className="relative min-w-0">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8377]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools or capabilities"
                aria-label="Search tools"
                className="h-10 rounded-full border-[#d8d0c2]/80 bg-[#fffdf8]/90 pl-9 pr-3 shadow-sm dark:border-[#49483f] dark:bg-[#20201c]"
              />
            </div>
            <div
              className="flex min-w-0 gap-1 overflow-x-auto rounded-full border border-[#d8d0c2]/70 bg-[#fffdf8]/70 p-1 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/72"
              role="group"
              aria-label="Filter tools by kind"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-active={!kind}
                className="h-8 rounded-full px-3 text-xs text-[#625d53] data-[active=true]:bg-white data-[active=true]:text-[#191915] data-[active=true]:shadow-sm dark:text-[#aaa397] dark:data-[active=true]:bg-[#292923] dark:data-[active=true]:text-[#f4efe5]"
                onClick={() => setKind(undefined)}
              >
                <SlidersHorizontalIcon data-icon="inline-start" />
                All
              </Button>
              {toolKinds.map((toolKind) => (
                <Button
                  key={toolKind}
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-active={kind === toolKind}
                  className="h-8 rounded-full px-3 text-xs text-[#625d53] data-[active=true]:bg-white data-[active=true]:text-[#191915] data-[active=true]:shadow-sm dark:text-[#aaa397] dark:data-[active=true]:bg-[#292923] dark:data-[active=true]:text-[#f4efe5]"
                  onClick={() => setKind(toolKind)}
                >
                  {formatToolKind(toolKind)}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {source === "sample" && error && (
          <Alert className="rounded-[18px] border-amber-300/70 bg-amber-50/80 text-amber-950 shadow-[0_14px_38px_rgba(120,75,18,0.08)] dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
            <AlertTriangleIcon />
            <AlertTitle>Showing sample catalog</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Methods-Hub is not responding. Status changes require a live
              Methods-Hub connection.
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-white/70 dark:bg-[#1a1a17]"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCwIcon className={loading ? "animate-spin" : ""} />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}

        {initialLoading ? (
          <ToolCatalogSkeleton />
        ) : catalog && catalog.tools.length > 0 ? (
          <div className="grid gap-10">
            <ToolSection
              title="Active Tools"
              description="Enabled tools are available to running AXIOM workflows."
              tools={activeTools}
              enabled
              onOpenTool={onOpenTool}
              action={
                activeTools.length > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 w-fit rounded-full px-3"
                    onClick={disableAllActiveTools}
                    disabled={actionableActiveCount === 0}
                  >
                    <PowerOffIcon />
                    Disable all active tools
                  </Button>
                ) : null
              }
            />

            <div className="h-px bg-gradient-to-r from-transparent via-[#cfc6b8] to-transparent dark:via-[#49483f]" />

            <ToolSection
              title="Available / Disabled Tools"
              description="Enable a tool when you want to make it available to workflows."
              tools={disabledTools}
              enabled={false}
              onOpenTool={onOpenTool}
            />
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-[24px] border border-dashed border-[#cfc6b8] bg-[#fffdf8]/70 px-5 text-center dark:border-[#49483f] dark:bg-[#1a1a17]/70">
            <div>
              <BoxesIcon className="mx-auto size-6 text-[#8a8377]" />
              <h2 className="mt-3 text-sm font-semibold">No matching tools</h2>
              <p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">
                Try a different keyword or tool type.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setKind(undefined);
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
