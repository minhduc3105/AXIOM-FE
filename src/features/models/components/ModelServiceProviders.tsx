import { useState } from "react";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  Trash2Icon,
} from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { getModelReadiness, getProviderReadiness } from "../model/readiness";
import type { RegistryLoadError } from "../model/useModelRegistry";
import type {
  ModelCapability,
  ProviderModelView,
  ProviderView,
} from "../model/registryTypes";
import {
  capabilityLabel,
  modelCapabilities,
  modelServiceMutedText,
  modelServiceSection,
  readinessBadgeClass,
  readinessLabel,
} from "./modelServiceUi";

function ReadinessBadge({
  level,
  label,
}: {
  level: ReturnType<typeof getProviderReadiness>["level"];
  label?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs uppercase tracking-wide",
        readinessBadgeClass(level),
      )}
    >
      {label ?? readinessLabel(level)}
    </Badge>
  );
}

function formatCheckedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

type ProviderActions = {
  busy: boolean;
  canManage: boolean;
  testingProviderId: string | null;
  testingModelResourceId: string | null;
  testFailureByTarget: Record<string, string>;
  onAddProvider: () => void;
  onAddModel: () => void;
  onCredential: () => void;
  onEditProvider: () => void;
  onTestProvider: () => void;
  onToggleProvider: () => void;
  onDeleteProvider: () => void;
  onEditModel: (model: ProviderModelView) => void;
  onTestModel: (model: ProviderModelView) => void;
  onToggleModel: (model: ProviderModelView) => void;
  onDeleteModel: (model: ProviderModelView) => void;
};

export function ModelServiceProviders({
  provider,
  providers,
  models,
  onSelect,
  initialLoading,
  updating,
  error,
  modelLoadError,
  onRetry,
  ...actions
}: {
  provider: ProviderView | null;
  providers: ProviderView[];
  models: ProviderModelView[];
  onSelect: (id: string) => void;
  initialLoading: boolean;
  updating: boolean;
  error: RegistryLoadError | null;
  modelLoadError: RegistryLoadError | null;
  onRetry: () => void;
} & ProviderActions) {
  const [capability, setCapability] = useState<ModelCapability>("llm");
  if (initialLoading) return <ProvidersSkeleton />;
  if (error && !providers.length)
    return <ProvidersErrorState error={error} onRetry={onRetry} />;
  if (!provider)
    return (
      <EmptyState
        canManage={actions.canManage}
        onAddProvider={actions.onAddProvider}
      />
    );

  const editable = actions.canManage && provider.scope === "organization";
  const customProvider = provider.source === "custom";
  const deletable = provider.scope === "organization";
  const testingProvider = actions.testingProviderId === provider.id;
  const readiness = getProviderReadiness(provider, {
    testing: testingProvider,
    failureReason: actions.testFailureByTarget[`provider:${provider.id}`],
  });
  const visibleModels = models.filter(
    (model) => model.capability === capability,
  );

  return (
    <div className="grid min-h-96 lg:grid-cols-4">
      <aside
        className="border-b lg:col-span-1 lg:border-b-0 lg:border-r"
        aria-label="Provider list"
      >
        <div
          className={cn(
            modelServiceSection,
            "flex items-center justify-between",
          )}
        >
          <div>
            <p className="text-sm font-semibold">Providers</p>
            <p className={cn("mt-0.5 text-xs", modelServiceMutedText)}>
              Select one to inspect its models.
            </p>
          </div>
          {actions.canManage && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={actions.onAddProvider}
              aria-label="Add provider"
              title="Add provider"
            >
              <PlusIcon data-icon="inline-start" />
            </Button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto p-2 lg:grid lg:overflow-visible">
          {providers.map((item) => (
            <ProviderListItem
              key={item.resource_id}
              item={item}
              selected={provider.resource_id === item.resource_id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </aside>
      <section
        className="min-w-0 lg:col-span-3"
        aria-labelledby="provider-detail-title"
      >
        {updating && (
          <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-xs text-muted-foreground sm:px-5">
            <RefreshCwIcon data-icon="inline-start" className="animate-spin" />{" "}
            Updating provider inventory. Current configuration remains
            available.
          </div>
        )}
        <div
          className={cn(
            modelServiceSection,
            "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          )}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ServerIcon className="size-3" /> Provider
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2
                id="provider-detail-title"
                className="truncate text-lg font-semibold"
              >
                {provider.display_name}
              </h2>
              <ReadinessBadge level={readiness.level} label={readiness.label} />
              <Badge variant="outline">
                {provider.scope === "system"
                  ? "Platform provider"
                  : customProvider
                    ? "Custom provider"
                    : "Organization provider"}
              </Badge>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              {provider.base_url}
            </p>
            {provider.scope === "system" && actions.canManage && (
              <p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground">
                Platform providers are read-only. Add an organization provider
                from this template to store a credential, test the connection,
                and manage models.
              </p>
            )}
          </div>
          <ProviderActionsMenu
            editable={editable}
            deletable={deletable}
            provider={provider}
            readiness={readiness}
            testing={testingProvider}
            {...actions}
          />
        </div>
        <ReadinessGuidance readiness={readiness} />
        <div className="grid gap-2 border-b px-4 py-3 text-xs sm:grid-cols-4">
          <Detail
            label="Scope"
            value={
              provider.scope === "organization"
                ? "This organization"
                : "Platform"
            }
          />
          <Detail label="Provider status" value={provider.status} />
          <Detail label="Connection" value={provider.connection_status} />
          <Detail
            label="Credential"
            value={
              provider.credential_source === "none"
                ? "Not configured"
                : provider.credential_source === "unknown"
                  ? "Unknown"
                  : provider.credential_source
            }
          />
        </div>
        {modelLoadError && (
          <ModelLoadError
            error={modelLoadError}
            providerName={provider.display_name}
            onRetry={onRetry}
            hasModels={models.length > 0}
          />
        )}
        <Tabs
          value={capability}
          onValueChange={(value) => setCapability(value as ModelCapability)}
          className="gap-0"
        >
          <div
            className={cn(
              modelServiceSection,
              "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
            )}
          >
            <div>
              <h3 className="text-sm font-semibold">Models by capability</h3>
              <p className={cn("mt-0.5 text-xs", modelServiceMutedText)}>
                Models inherit connection readiness and credentials from{" "}
                {provider.display_name}.
              </p>
            </div>
            {editable && (
              <Button
                size="sm"
                onClick={actions.onAddModel}
                disabled={actions.busy}
              >
                <PlusIcon data-icon="inline-start" /> Add model
              </Button>
            )}
          </div>
          <div className="overflow-x-auto border-b px-4 pt-2 sm:px-5">
            <TabsList
              variant="line"
              className="h-auto min-w-max justify-start gap-1 border-0 p-0"
            >
              {modelCapabilities.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="h-9 shrink-0 px-3"
                >
                  {item.label}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    {
                      models.filter((model) => model.capability === item.id)
                        .length
                    }
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {modelCapabilities.map((item) => (
            <TabsContent key={item.id} value={item.id} className="m-0">
              {visibleModels.length ? (
                <div className="divide-y">
                  {visibleModels.map((model) => (
                    <ProviderModelRow
                      key={model.resource_id}
                      model={model}
                      provider={provider}
                      editable={editable}
                      testing={
                        actions.testingModelResourceId === model.resource_id
                      }
                      failureReason={
                        actions.testFailureByTarget[
                          `model:${model.resource_id}`
                        ]
                      }
                      {...actions}
                    />
                  ))}
                </div>
              ) : (
                <Empty className="min-h-48">
                  <EmptyHeader>
                    <EmptyTitle>
                      No {item.label} models registered
                    </EmptyTitle>
                    <EmptyDescription>
                      {editable
                        ? `Add a ${item.label} model, test it, then assign it as default.`
                        : "No models are available for this capability."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
}

function ProvidersSkeleton() {
  return (
    <div
      className="grid min-h-96 lg:grid-cols-4"
      aria-label="Loading providers"
      aria-busy="true"
    >
      <aside className="border-b p-4 lg:border-b-0 lg:border-r">
        <div className="grid gap-3">
          {[1, 2, 3].map((key) => (
            <div key={key} className="grid gap-2 rounded-md border p-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </aside>
      <section className="p-4 lg:col-span-3 sm:p-5">
        <div className="grid gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="mt-6 grid gap-2 border-y py-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className="grid gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {[1, 2].map((key) => (
            <div key={key} className="grid gap-2 border-b pb-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProvidersErrorState({
  error,
  onRetry,
}: {
  error: RegistryLoadError;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-96 place-items-center p-6">
      <Alert variant="destructive" className="max-w-md">
        <CircleAlertIcon />
        <AlertTitle>Providers could not be loaded</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        {error.retryable && (
          <AlertAction>
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
          >
            <RefreshCwIcon data-icon="inline-start" /> Retry
          </Button>
          </AlertAction>
        )}
      </Alert>
    </div>
  );
}

function ModelLoadError({
  error,
  providerName,
  onRetry,
  hasModels,
}: {
  error: RegistryLoadError;
  providerName: string;
  onRetry: () => void;
  hasModels: boolean;
}) {
  return (
    <Alert className="rounded-none border-x-0 border-t-0 border-warning/30 bg-warning/10 px-4 py-3 sm:px-5">
      <CircleAlertIcon />
      <AlertTitle>
        {hasModels
          ? "Model inventory may be out of date."
          : "Models could not be loaded."}
      </AlertTitle>
      <AlertDescription>
        {providerName}: {error.message}
      </AlertDescription>
      {error.retryable && (
        <AlertAction>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCwIcon data-icon="inline-start" /> Retry
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}

function EmptyState({
  canManage,
  onAddProvider,
}: Pick<ProviderActions, "canManage" | "onAddProvider">) {
  return (
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ServerIcon />
        </EmptyMedia>
        <EmptyTitle>No provider configured</EmptyTitle>
        <EmptyDescription>
          {canManage
            ? "Add a provider before registering models."
            : "No provider is currently available to your organization."}
        </EmptyDescription>
      </EmptyHeader>
      {canManage && (
        <EmptyContent>
          <Button size="sm" className="mt-3" onClick={onAddProvider}>
            <PlusIcon data-icon="inline-start" /> Add provider
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

function ProviderListItem({
  item,
  selected,
  onSelect,
}: {
  item: ProviderView;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const readiness = getProviderReadiness(item);
  const color =
    readiness.level === "ready"
      ? "bg-success"
      : readiness.level === "failed"
        ? "bg-destructive"
        : "bg-warning";
  return (
    <Button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={selected ? "true" : undefined}
      variant={selected ? "secondary" : "ghost"}
      className="h-auto min-w-52 shrink-0 flex-col items-stretch gap-1.5 p-3 text-left whitespace-normal lg:min-w-0"
    >
      <span className="flex items-start justify-between gap-2">
        <strong className="truncate text-sm" title={item.display_name}>
          {item.display_name}
        </strong>
        <span className={cn("mt-1 size-2 shrink-0 rounded-full", color)} />
      </span>
      <span className="mt-1 flex gap-1.5 text-xs text-muted-foreground">
        <span>{item.source === "custom" ? "Custom" : "Default"}</span>
        <span>/</span>
        <span>{readiness.label}</span>
      </span>
    </Button>
  );
}

function ProviderActionsMenu({
  editable,
  deletable,
  provider,
  readiness,
  testing,
  busy,
  onCredential,
  onEditProvider,
  onTestProvider,
  onToggleProvider,
  onDeleteProvider,
}: Pick<
  ProviderActions,
  | "busy"
  | "onCredential"
  | "onEditProvider"
  | "onTestProvider"
  | "onToggleProvider"
  | "onDeleteProvider"
> & {
  editable: boolean;
  deletable: boolean;
  provider: ProviderView;
  readiness: ReturnType<typeof getProviderReadiness>;
  testing: boolean;
}) {
  if (!editable)
    return <span className="text-xs text-muted-foreground">Read-only</span>;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={onEditProvider}
        disabled={busy}
      >
        <PencilIcon data-icon="inline-start" /> Edit provider
      </Button>
      {readiness.action === "activate_provider" ? (
        <Button size="sm" onClick={onToggleProvider} disabled={busy}>
          Activate provider
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onTestProvider}
          disabled={busy}
          aria-label={testing ? "Testing connection" : "Test connection"}
        >
          {testing ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : (
            <CheckCircle2Icon data-icon="inline-start" />
          )}
          {testing ? "Testing connection" : "Test connection"}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm" variant="outline" disabled={busy}>
              <MoreHorizontalIcon data-icon="inline-start" /> Manage
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onCredential}>
              <KeyRoundIcon /> Store credential
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleProvider}>
              {provider.status === "active"
                ? "Deactivate provider"
                : "Activate provider"}
            </DropdownMenuItem>
            {deletable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={onDeleteProvider}
                >
                  <Trash2Icon /> Delete provider
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ProviderModelRow({
  model,
  provider,
  editable,
  testing,
  failureReason,
  busy,
  onEditModel,
  onTestModel,
  onToggleModel,
  onDeleteModel,
}: Pick<
  ProviderActions,
  "busy" | "onEditModel" | "onTestModel" | "onToggleModel" | "onDeleteModel"
> & {
  model: ProviderModelView;
  provider: ProviderView;
  editable: boolean;
  testing: boolean;
  failureReason?: string;
}) {
  const readiness = getModelReadiness(provider, model, {
    testing,
    failureReason,
  });
  return (
    <article className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(210px,auto)_auto] sm:items-center sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm" title={model.name}>
            {model.name}
          </strong>
          {model.is_default && <Badge variant="secondary">Default</Badge>}
        </div>
        <p
          className={cn("mt-1 truncate text-xs", modelServiceMutedText)}
          title={model.model_id}
        >
          <code>{model.model_id}</code> / {capabilityLabel(model.capability)}
        </p>
        <p
          className={cn(
            "mt-1 text-xs leading-5",
            readiness.level === "ready"
              ? "text-muted-foreground"
              : "text-warning",
          )}
        >
          {readiness.detail} Next: {readiness.nextAction}
        </p>
      </div>
      <div>
        <ReadinessBadge level={readiness.level} label={readiness.label} />
        <p className="mt-1 text-xs text-muted-foreground">
          Last checked: {formatCheckedAt(model.updated_at)}
        </p>
      </div>
      {editable ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={busy || readiness.action === "resolve_provider"}
            onClick={() =>
              readiness.action === "activate_model"
                ? onToggleModel(model)
                : onTestModel(model)
            }
            aria-label={
              testing
                ? `Testing ${model.name}`
                : readiness.action === "activate_model"
                  ? `Activate ${model.name}`
                  : `Test ${model.name}`
            }
          >
            {testing ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : readiness.action === "activate_model" ? null : (
              <CheckCircle2Icon data-icon="inline-start" />
            )}
            {testing
              ? "Testing"
              : readiness.action === "activate_model"
                ? "Activate"
                : "Test"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Manage ${model.name}`}
                  title={`Manage ${model.name}`}
                  disabled={busy}
                >
                  <MoreHorizontalIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => onEditModel(model)}>
                  <PencilIcon /> Edit model
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleModel(model)}>
                  {model.status === "active"
                    ? "Deactivate model"
                    : "Activate model"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDeleteModel(model)}
                >
                  <Trash2Icon /> Delete model
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Read-only</span>
      )}
    </article>
  );
}

function ReadinessGuidance({
  readiness,
}: {
  readiness: ReturnType<typeof getProviderReadiness>;
}) {
  if (readiness.level === "ready") return null;
  return (
    <Alert
      className={cn(
        "rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-5",
        readiness.level === "testing"
          ? "border-primary/20 bg-primary/5"
          : "border-warning/30 bg-warning/10 text-warning",
      )}
    >
      <CircleAlertIcon />
      <AlertTitle>{readiness.detail}</AlertTitle>
      <AlertDescription>Next: {readiness.nextAction}</AlertDescription>
    </Alert>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-medium">{value}</p>
    </div>
  );
}
