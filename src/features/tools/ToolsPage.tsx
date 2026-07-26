import { useState } from "react";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  SearchIcon,
  WrenchIcon,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  return (
    <section
      className="min-h-screen w-full overflow-x-hidden px-5 pb-10 pt-20 sm:px-8 md:pt-10"
      aria-label="Tools catalog"
    >
      <div className="mx-auto grid w-full max-w-[1320px] gap-5">
        <header className="flex flex-col gap-5 border-b border-[#d8d0c2] pb-5 dark:border-[#38372f] lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#2456e8] dark:text-[#9aafff]">
              <WrenchIcon className="size-4" />
              Methods-Hub catalog
            </div>
            <h1 className="text-2xl font-semibold leading-tight text-[#191915] dark:text-[#f4efe5] sm:text-3xl">
              Tools
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
              Browse and configure the methods available to AXIOM workflows.
            </p>
          </div>
          <div className="flex items-baseline gap-2 text-sm text-[#6d685e] dark:text-[#aaa397]">
            <strong className="text-2xl font-semibold tabular-nums text-[#191915] dark:text-[#f4efe5]">
              {catalog?.count ?? 0}
            </strong>
            {catalog?.count === 1 ? "tool" : "tools"}
          </div>
        </header>

        <div className="grid gap-3 rounded-lg border border-[#d8d0c2] bg-[#fffdf8]/88 p-3 shadow-[0_8px_24px_rgba(25,25,21,0.04)] dark:border-[#38372f] dark:bg-[#1a1a17]/88 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center">
          <div className="relative min-w-0">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8377]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools, parameters, or capabilities"
              aria-label="Search tools"
              className="h-10 rounded-lg border-[#d8d0c2] bg-white pl-9 pr-3 dark:border-[#49483f] dark:bg-[#20201c]"
            />
          </div>
          <div
            className="flex min-w-0 gap-1 overflow-x-auto rounded-lg bg-[#eee8dc] p-1 dark:bg-[#292923]"
            role="group"
            aria-label="Filter tools by kind"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-active={!kind}
              className="h-8 rounded-md px-3 text-xs text-[#625d53] data-[active=true]:bg-white data-[active=true]:text-[#191915] data-[active=true]:shadow-sm dark:text-[#aaa397] dark:data-[active=true]:bg-[#1a1a17] dark:data-[active=true]:text-[#f4efe5]"
              onClick={() => setKind(undefined)}
            >
              All
            </Button>
            {toolKinds.map((toolKind) => (
              <Button
                key={toolKind}
                type="button"
                variant="ghost"
                size="sm"
                data-active={kind === toolKind}
                className="h-8 rounded-md px-3 text-xs text-[#625d53] data-[active=true]:bg-white data-[active=true]:text-[#191915] data-[active=true]:shadow-sm dark:text-[#aaa397] dark:data-[active=true]:bg-[#1a1a17] dark:data-[active=true]:text-[#f4efe5]"
                onClick={() => setKind(toolKind)}
              >
                {formatToolKind(toolKind)}
              </Button>
            ))}
          </div>
        </div>

        {source === "sample" && error && (
          <Alert className="border-amber-300/70 bg-amber-50/90 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
            <AlertTriangleIcon />
            <AlertTitle>Showing sample catalog</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Methods-Hub is not responding. Tool browsing remains available with sample data.
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/70 dark:bg-[#1a1a17]"
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
          <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-[#cfc6b8] bg-[#fffdf8]/55 px-5 text-center dark:border-[#49483f] dark:bg-[#1a1a17]/55">
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
