import {
  ArrowLeftIcon,
  ActivityIcon,
  BoxIcon,
  BracesIcon,
  CircleAlertIcon,
  CodeXmlIcon,
  LockKeyholeIcon,
  PowerIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToolKindIcon } from "./components/ToolKindIcon";
import { ToolStatusSwitch } from "./components/ToolStatusSwitch";
import { useToolsState } from "./model/ToolsProvider";
import { formatToolKind, formatToolName } from "./model/toolPresentation";
import { useToolDetail } from "./model/useToolDetail";

type ToolDetailPageProps = {
  toolName: string;
  onBack: () => void;
  availabilityScope: {
    organizationName: string;
    workspaceName: string;
  };
};

function formatDefaultValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

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
      <Skeleton className="h-[520px]" />
    </div>
  );
}

export function ToolDetailPage({
  toolName,
  onBack,
  availabilityScope,
}: ToolDetailPageProps) {
  const { tool, loading, error, errorKind, refresh } = useToolDetail(toolName);
  const {
    isToolEnabled,
    isToolUpdating,
    getToolUpdateError,
    retryToolUpdate,
    setToolEnabled,
  } = useToolsState();

  if (loading && !tool) {
    return (
      <section className="min-h-0 px-4 py-4 sm:px-6 md:p-6">
        <ToolDetailSkeleton />
      </section>
    );
  }

  if (!tool) {
    const toolNotFound = errorKind === "tool_not_found" || !error;
    const methodsHubUnavailable = errorKind === "methods_hub_unavailable";
    return (
      <section className="grid min-h-0 place-items-center px-4 py-8 sm:px-6 md:p-6">
        <div className="max-w-md text-center">
          <CircleAlertIcon className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">
            {toolNotFound
              ? "Tool not found"
              : methodsHubUnavailable
                ? "Methods-Hub is unavailable"
                : "Tool details could not be loaded"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {toolNotFound ? (
              <>
                The catalog does not contain <code>{toolName}</code>.
              </>
            ) : methodsHubUnavailable ? (
              "The live tool detail could not be loaded. Check the Methods-Hub URL and service configuration."
            ) : (
              "Methods-Hub rejected the request. Check your access and service configuration, then try again."
            )}
          </p>
          {!toolNotFound ? (
            <Button variant="outline" className="mt-5" onClick={refresh}>
              <RefreshCwIcon />
              Retry
            </Button>
          ) : null}
          <Button variant="outline" className="mt-5 ml-2" onClick={onBack}>
            <ArrowLeftIcon />
            Back to Tools
          </Button>
        </div>
      </section>
    );
  }

  const displayName = formatToolName(tool.name);
  const enabled = isToolEnabled(tool.name, tool.enabled);
  const updating = isToolUpdating(tool.name);
  const updateError = getToolUpdateError(tool.name);
  const implementation = tool.implementation ?? tool.implementations?.[0];

  return (
    <section
      className="relative min-h-0 w-full overflow-x-hidden px-4 py-4 sm:px-6 md:p-6"
      aria-label={`${displayName} details`}
    >
      <div className="mx-auto grid w-full min-w-0 max-w-[1360px] gap-4">
        <Button
          variant="ghost"
          className="h-9 w-fit rounded-full px-3 text-text-secondary"
          onClick={onBack}
        >
          <ArrowLeftIcon />
          Back to Tools
        </Button>

        <Card className="gap-0 rounded-lg border border-line bg-card p-0 shadow-none">
          <header className="grid min-w-0 gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="flex w-full min-w-0 max-w-full items-start gap-3 sm:gap-4">
              <ToolKindIcon
                kind={tool.kind}
                className="size-10 rounded-lg sm:size-12 [&_svg]:size-5"
              />
              <div className="min-w-0">
                <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
                  <h1 className="min-w-0 max-w-full break-words text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                    {displayName}
                  </h1>
                  <Badge
                    variant="outline"
                    className="h-6 max-w-full rounded-full border-line bg-soft px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary"
                  >
                    {formatToolKind(tool.kind)}
                  </Badge>
                </div>
                <code className="mt-1.5 block break-all text-xs text-muted-foreground">
                  {tool.name}
                </code>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                  {tool.description}
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 border-t border-line pt-3 sm:w-auto sm:min-w-52 sm:border-t-0 sm:pt-0 lg:self-start lg:justify-self-end">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-7 rounded-full border-line bg-soft px-3 text-[10px] font-medium text-text-secondary"
                >
                  <LockKeyholeIcon className="mr-1.5 size-3" />
                  Live catalog
                </Badge>
              </div>
              <ToolStatusSwitch
                checked={enabled}
                label={displayName}
                disabled={updating}
                onCheckedChange={(nextEnabled) =>
                  setToolEnabled(tool.name, nextEnabled)
                }
              />
              <p className="max-w-xs text-xs leading-5 text-muted-foreground sm:text-right">
                Available to{" "}
                <span className="font-medium text-text-secondary">
                  {availabilityScope.organizationName}
                </span>{" "}
                · {availabilityScope.workspaceName}
              </p>
              {updateError ? (
                <div
                  role="alert"
                  className="max-w-xs text-right text-xs leading-5 text-destructive"
                >
                  <p>Update failed. Previous status restored: {updateError}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    className="mt-1 h-auto px-0 text-destructive"
                    onClick={() => void retryToolUpdate(tool.name)}
                  >
                    <RefreshCwIcon /> Retry update
                  </Button>
                </div>
              ) : null}
            </div>
          </header>
        </Card>

        <div className="grid items-start gap-7">
          <main className="min-w-0">
            <section className="overflow-hidden rounded-xl border border-line bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BoxIcon className="size-4 text-brand" />
                <h2 className="text-sm font-semibold">Overview</h2>
              </div>
              <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
                <div className="bg-soft p-3.5">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <BracesIcon className="size-3.5" /> Kind
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold">
                    {formatToolKind(tool.kind)}
                  </dd>
                </div>
                <div className="bg-soft p-3.5">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <ActivityIcon className="size-3.5" /> Status
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold">
                    {enabled ? "Active" : "Disabled"}
                  </dd>
                </div>
                <div className="bg-soft p-3.5">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <PowerIcon className="size-3.5" /> Availability
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold tabular-nums">
                    {availabilityScope.workspaceName}
                  </dd>
                </div>
                <div className="bg-soft p-3.5">
                  <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CodeXmlIcon className="size-3.5" /> Scope
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold">
                    {availabilityScope.organizationName}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Enabling or disabling a tool updates the current Methods-Hub
                process only; the setting resets when it restarts.
              </p>

              {(implementation || tool.supported_dataset_types?.length) && (
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  {implementation && (
                    <div>
                      <span className="text-[11px] text-muted-foreground">
                        Implementation
                      </span>
                      <code className="mt-1 block break-all text-xs text-foreground">
                        {implementation.module ?? "runtime"}.
                        {implementation.class ?? "method"}
                      </code>
                    </div>
                  )}
                  {tool.supported_dataset_types?.length ? (
                    <div>
                      <span className="text-[11px] text-muted-foreground">
                        Supported datasets
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {tool.supported_dataset_types.map((datasetType) => (
                          <Badge
                            key={datasetType}
                            variant="outline"
                            className="rounded-md"
                          >
                            {datasetType}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="mt-6 overflow-hidden rounded-xl border border-line bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CodeXmlIcon className="size-4 text-brand" />
                  <h2 className="text-sm font-semibold">Input parameters</h2>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {tool.params.length} total
                </span>
              </div>
              {tool.params.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-line">
                  <Table className="min-w-[760px] text-xs">
                    <TableHeader className="bg-soft/70">
                      <TableRow>
                        <TableHead className="px-3">Name</TableHead>
                        <TableHead className="px-3">Type</TableHead>
                        <TableHead className="px-3">Required</TableHead>
                        <TableHead className="px-3">Default value</TableHead>
                        <TableHead className="px-3">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tool.params.map((parameter) => (
                        <TableRow key={parameter.name}>
                          <TableCell className="px-3 align-top whitespace-normal">
                            <code className="break-all font-semibold text-foreground">
                              {parameter.name}
                            </code>
                          </TableCell>
                          <TableCell className="px-3 align-top">
                            <Badge
                              variant="outline"
                              className="h-5 rounded-md px-1.5 text-[9px] uppercase"
                            >
                              {parameter.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 align-top">
                            <Badge
                              variant={
                                parameter.required ? "secondary" : "outline"
                              }
                              className="h-5 rounded-md px-1.5 text-[9px]"
                            >
                              {parameter.required ? "Required" : "Optional"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-52 px-3 align-top whitespace-normal">
                            <code className="break-all text-[11px] text-text-secondary">
                              {formatDefaultValue(parameter.default)}
                            </code>
                          </TableCell>
                          <TableCell className="min-w-56 px-3 align-top whitespace-normal text-text-secondary">
                            {parameter.description ||
                              "No parameter description."}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">
                  This tool does not require input parameters.
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </section>
  );
}
