import {
  ArrowLeftIcon,
  BoxIcon,
  BracesIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  CodeXmlIcon,
  RefreshCwIcon,
  UserRoundIcon,
} from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolConfigurationPanel } from "./components/ToolConfigurationPanel";
import { ToolKindIcon } from "./components/ToolKindIcon";
import { ToolStatusSwitch } from "./components/ToolStatusSwitch";
import { useToolsState } from "./model/ToolsProvider";
import {
  formatToolKind,
  formatToolName,
  getToolPresentation,
} from "./model/toolPresentation";
import { useToolDetail } from "./model/useToolDetail";

type ToolDetailPageProps = {
  toolName: string;
  onBack: () => void;
};

function ToolDetailSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-[1320px] gap-6">
      <Skeleton className="h-9 w-36" />
      <div className="flex gap-4">
        <Skeleton className="size-14" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-[520px] max-w-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-[520px]" />
      </div>
    </div>
  );
}

export function ToolDetailPage({ toolName, onBack }: ToolDetailPageProps) {
  const { tool, source, loading, error, refresh } = useToolDetail(toolName);
  const { isToolEnabled, setToolEnabled } = useToolsState();

  if (loading && !tool) {
    return (
      <section className="min-h-screen px-5 pb-10 pt-20 sm:px-8 md:pt-10">
        <ToolDetailSkeleton />
      </section>
    );
  }

  if (!tool) {
    return (
      <section className="grid min-h-screen place-items-center px-5 py-20">
        <div className="max-w-md text-center">
          <CircleAlertIcon className="mx-auto size-8 text-[#8a8377]" />
          <h1 className="mt-4 text-xl font-semibold">Tool not found</h1>
          <p className="mt-2 text-sm text-[#6d685e] dark:text-[#aaa397]">
            The catalog does not contain <code>{toolName}</code>.
          </p>
          <Button variant="outline" className="mt-5" onClick={onBack}>
            <ArrowLeftIcon />
            Back to Tools
          </Button>
        </div>
      </section>
    );
  }

  const presentation = getToolPresentation(tool.name, tool.kind);
  const displayName = formatToolName(tool.name);
  const enabled = isToolEnabled(tool.name, tool.kind);
  const implementation = tool.implementation ?? tool.implementations?.[0];

  return (
    <section
      className="min-h-screen w-full overflow-x-hidden px-5 pb-10 pt-20 sm:px-8 md:pt-10"
      aria-label={`${displayName} details`}
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1320px] gap-5">
        <Button
          variant="ghost"
          className="h-9 w-fit rounded-lg px-2 text-[#625d53] hover:bg-[#e9e2d5] hover:text-[#191915] dark:text-[#c5bcaf] dark:hover:bg-[#292923] dark:hover:text-[#f4efe5]"
          onClick={onBack}
        >
          <ArrowLeftIcon />
          Back to Tools
        </Button>

        {source === "sample" && error && (
          <Alert className="min-w-0 max-w-full overflow-hidden border-amber-300/70 bg-amber-50/90 pr-3 text-amber-950 sm:pr-24 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
            <CircleAlertIcon />
            <AlertTitle>Showing sample tool details</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Methods-Hub is not responding. Configuration remains available locally.
            </AlertDescription>
            <AlertAction className="hidden sm:block">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/70 dark:bg-[#1a1a17]"
                onClick={refresh}
              >
                <RefreshCwIcon />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}

        <header className="flex min-w-0 max-w-full flex-col gap-5 overflow-hidden border-b border-[#d8d0c2] pb-6 dark:border-[#38372f] sm:flex-row sm:items-start sm:justify-between">
          <div className="flex w-full min-w-0 max-w-full items-start gap-3 sm:gap-4">
            <ToolKindIcon kind={tool.kind} className="size-12 rounded-xl sm:size-14 [&_svg]:size-6" />
            <div className="min-w-0">
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                <h1 className="min-w-0 max-w-full break-words text-xl font-semibold leading-tight text-[#191915] dark:text-[#f4efe5] sm:text-3xl">
                  {displayName}
                </h1>
                <Badge
                  variant="outline"
                  className="h-6 max-w-full rounded-md border-[#d8d0c2] bg-[#fffdf8]/75 text-[10px] text-[#625d53] dark:border-[#49483f] dark:bg-[#20201c] dark:text-[#c5bcaf]"
                >
                  {formatToolKind(tool.kind)}
                </Badge>
              </div>
              <code className="mt-1.5 block break-all text-xs text-[#777064] dark:text-[#aaa397]">
                {tool.name}
              </code>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
                {tool.description}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center rounded-lg border border-[#d8d0c2] bg-[#fffdf8]/88 px-3 py-1.5 dark:border-[#38372f] dark:bg-[#1a1a17]/88">
            <ToolStatusSwitch
              checked={enabled}
              label={displayName}
              onCheckedChange={(checked) => setToolEnabled(tool.name, checked)}
            />
          </div>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0">
            <section className="border-b border-[#d8d0c2] pb-6 dark:border-[#38372f]">
              <div className="mb-4 flex items-center gap-2">
                <BoxIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
                <h2 className="text-sm font-semibold">Overview</h2>
              </div>
              <dl className="grid gap-px overflow-hidden rounded-lg border border-[#d8d0c2] bg-[#d8d0c2] sm:grid-cols-3 dark:border-[#38372f] dark:bg-[#38372f]">
                <div className="bg-[#fffdf8] p-3.5 dark:bg-[#1a1a17]">
                  <dt className="flex items-center gap-1.5 text-[11px] text-[#777064] dark:text-[#aaa397]">
                    <BracesIcon className="size-3.5" /> Version
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold tabular-nums">v{presentation.version}</dd>
                </div>
                <div className="bg-[#fffdf8] p-3.5 dark:bg-[#1a1a17]">
                  <dt className="flex items-center gap-1.5 text-[11px] text-[#777064] dark:text-[#aaa397]">
                    <CalendarDaysIcon className="size-3.5" /> Updated
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold">
                    {new Intl.DateTimeFormat("en", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(`${presentation.updatedAt}T00:00:00`))}
                  </dd>
                </div>
                <div className="bg-[#fffdf8] p-3.5 dark:bg-[#1a1a17]">
                  <dt className="flex items-center gap-1.5 text-[11px] text-[#777064] dark:text-[#aaa397]">
                    <UserRoundIcon className="size-3.5" /> Owner
                  </dt>
                  <dd className="mt-1.5 truncate text-sm font-semibold">{presentation.author}</dd>
                </div>
              </dl>

              {(implementation || tool.supported_dataset_types?.length) && (
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  {implementation && (
                    <div>
                      <span className="text-[11px] text-[#777064] dark:text-[#aaa397]">Implementation</span>
                      <code className="mt-1 block break-all text-xs text-[#25241f] dark:text-[#eee8dc]">
                        {implementation.module ?? "runtime"}.{implementation.class ?? "method"}
                      </code>
                    </div>
                  )}
                  {tool.supported_dataset_types?.length ? (
                    <div>
                      <span className="text-[11px] text-[#777064] dark:text-[#aaa397]">Supported datasets</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {tool.supported_dataset_types.map((datasetType) => (
                          <Badge key={datasetType} variant="outline" className="rounded-md">
                            {datasetType}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CodeXmlIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
                  <h2 className="text-sm font-semibold">Input parameters</h2>
                </div>
                <span className="text-xs tabular-nums text-[#777064] dark:text-[#aaa397]">
                  {tool.params.length} total
                </span>
              </div>
              {tool.params.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-[#d8d0c2] bg-[#fffdf8]/80 dark:border-[#38372f] dark:bg-[#1a1a17]/80">
                  {tool.params.map((parameter) => (
                    <div
                      key={parameter.name}
                      className="grid gap-2 border-b border-[#e1dacc] px-4 py-3.5 last:border-b-0 sm:grid-cols-[minmax(150px,0.42fr)_1fr] dark:border-[#38372f]"
                    >
                      <div className="min-w-0">
                        <code className="break-all text-xs font-semibold text-[#25241f] dark:text-[#eee8dc]">
                          {parameter.name}
                        </code>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[9px] uppercase">
                            {parameter.type}
                          </Badge>
                          {parameter.required && (
                            <Badge className="h-5 rounded-md bg-rose-100 px-1.5 text-[9px] text-rose-700 dark:bg-rose-400/15 dark:text-rose-200">
                              Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs leading-5 text-[#625d53] dark:text-[#c5bcaf]">
                          {parameter.description || "No parameter description."}
                        </p>
                        {parameter.default !== null && parameter.default !== undefined && (
                          <p className="mt-1 text-[11px] text-[#777064] dark:text-[#aaa397]">
                            Default: <code>{JSON.stringify(parameter.default)}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#cfc6b8] px-4 py-8 text-center text-sm text-[#777064] dark:border-[#49483f] dark:text-[#aaa397]">
                  This tool does not require input parameters.
                </div>
              )}
            </section>
          </main>

          <ToolConfigurationPanel tool={tool} />
        </div>
      </div>
    </section>
  );
}
