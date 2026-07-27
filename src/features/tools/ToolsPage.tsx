import { useState } from "react";
import {
  AlertTriangleIcon,
  BoxesIcon,
  LayersIcon,
  RefreshCwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  WrenchIcon,
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
import { formatToolKind } from "./model/toolPresentation";
import type { ToolKind } from "./model/types";
import { toolKinds } from "./model/types";

type ToolsPageProps = {
  onOpenTool: (toolName: string) => void;
};

export function ToolsPage({ onOpenTool }: ToolsPageProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ToolKind | undefined>();
  const { catalog, source, loading, error, refresh } = useToolCatalog({
    kind,
    query,
  });
  const initialLoading = loading && !catalog;
  const categoryCount = toolKinds.length;

  return (
    <section
      className="relative min-h-screen w-full overflow-x-hidden px-5 pb-12 pt-20 sm:px-8 md:pt-10"
      aria-label="Tools catalog"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_78%_8%,rgba(36,86,232,0.12),transparent_34%),radial-gradient(circle_at_10%_38%,rgba(120,75,18,0.10),transparent_36%)] dark:bg-[radial-gradient(circle_at_78%_8%,rgba(120,149,255,0.12),transparent_34%)]"
        aria-hidden="true"
      />
      <div className="mx-auto grid w-full max-w-[1360px] gap-6">
        <header className="overflow-hidden rounded-[28px] border border-[#d8d0c2]/80 bg-[#fffdf8]/88 shadow-[0_24px_70px_rgba(24,24,18,0.09)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88">
          <div className="grid gap-6 p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-6 rounded-full border-[#2456e8]/30 bg-[#edf2ff] px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]"
                  >
                    Methods-Hub catalog
                  </Badge>
                  <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                    {catalog?.count ?? 0} indexed tools
                  </span>
                </div>
                <h1 className="text-3xl font-semibold leading-tight text-[#191915] dark:text-[#f4efe5] sm:text-4xl">
                  Tools catalog
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
                  Browse, filter, and configure the methods available to AXIOM
                  workflows.
                </p>
              </div>

              <Button
                variant="outline"
                className="h-10 w-full justify-start rounded-full border-[#d8d0c2] bg-[#fffdf8]/72 px-4 text-[#25241f] hover:bg-[#f4efe5] sm:w-auto dark:border-[#38372f] dark:bg-[#20201c] dark:text-[#eee8dc]"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCwIcon
                  data-icon="inline-start"
                  className={loading ? "animate-spin" : undefined}
                />
                Refresh
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-[#d8d0c2]/80 bg-[#f4efe5]/72 p-4 dark:border-[#38372f] dark:bg-white/5">
                <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                  Available tools
                </span>
                <strong className="mt-2 flex min-w-0 items-center gap-2 text-sm">
                  <WrenchIcon className="size-4 shrink-0 text-[#2456e8] dark:text-[#9aafff]" />
                  <span className="truncate tabular-nums">
                    {catalog?.count ?? 0} methods
                  </span>
                </strong>
              </div>
              <div className="rounded-[18px] border border-[#d8d0c2]/80 bg-[#f4efe5]/72 p-4 dark:border-[#38372f] dark:bg-white/5">
                <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                  Tool categories
                </span>
                <strong className="mt-2 flex items-center gap-2 text-sm">
                  <LayersIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
                  {categoryCount} types available
                </strong>
              </div>
              <div className="rounded-[18px] border border-[#d8d0c2]/80 bg-[#f4efe5]/72 p-4 dark:border-[#38372f] dark:bg-white/5">
                <span className="text-xs text-[#6d685e] dark:text-[#aaa397]">
                  Catalog source
                </span>
                <strong className="mt-2 flex items-center gap-2 text-sm">
                  <BoxesIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
                  {source === "sample" ? "Sample fallback" : "Methods-Hub"}
                </strong>
              </div>
            </div>

            <div className="grid gap-3 rounded-[18px] border border-[#d8d0c2]/80 bg-[#f4efe5]/62 p-3 dark:border-[#38372f] dark:bg-white/5 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center">
              <div className="relative min-w-0">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8377]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tools, parameters, or capabilities"
                  aria-label="Search tools"
                  className="h-11 rounded-full border-[#d8d0c2]/80 bg-[#fffdf8]/90 pl-9 pr-3 shadow-sm dark:border-[#49483f] dark:bg-[#20201c]"
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
                  className="h-9 rounded-full px-3 text-xs text-[#625d53] data-[active=true]:bg-white data-[active=true]:text-[#191915] data-[active=true]:shadow-sm dark:text-[#aaa397] dark:data-[active=true]:bg-[#292923] dark:data-[active=true]:text-[#f4efe5]"
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
                    className="h-9 rounded-full px-3 text-xs text-[#625d53] data-[active=true]:bg-white data-[active=true]:text-[#191915] data-[active=true]:shadow-sm dark:text-[#aaa397] dark:data-[active=true]:bg-[#292923] dark:data-[active=true]:text-[#f4efe5]"
                    onClick={() => setKind(toolKind)}
                  >
                    {formatToolKind(toolKind)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {source === "sample" && error && (
          <Alert className="rounded-[18px] border-amber-300/70 bg-amber-50/80 text-amber-950 shadow-[0_14px_38px_rgba(120,75,18,0.08)] dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
            <AlertTriangleIcon />
            <AlertTitle>Showing sample catalog</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Methods-Hub is not responding. Tool browsing remains available
              with sample data.
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.tools.map((tool) => (
              <ToolCard key={tool.name} tool={tool} onOpen={onOpenTool} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-[24px] border border-dashed border-[#cfc6b8] bg-[#fffdf8]/70 px-5 text-center shadow-[0_18px_52px_rgba(24,24,18,0.06)] backdrop-blur-xl dark:border-[#49483f] dark:bg-[#1a1a17]/70">
            <div>
              <SearchIcon className="mx-auto size-6 text-[#8a8377]" />
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
