import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRightIcon,
  BinaryIcon,
  BotIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  EyeIcon,
  KeyRoundIcon,
  ListFilterIcon,
  LoaderCircleIcon,
  MessageSquareTextIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
  ShieldAlertIcon,
  Trash2Icon,
  TriangleAlertIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/features/auth/model/types";
import { cn } from "@/shared/lib/utils";
import {
  createProvider,
  createProviderModel,
  deleteProvider,
  deleteProviderModel,
  listProviderCatalog,
  testProvider,
  testProviderModel,
  updateProvider,
  updateProviderModel,
  upsertProviderCredential,
  type ModelRegistryContext,
} from "../api/modelServiceApi";
import {
  getModelReadiness,
  getProviderReadiness,
  type ReadinessLevel,
} from "../model/readiness";
import type {
  ModelCapability,
  ProviderCatalogItem,
  ProviderModelView,
  ProviderView,
  ResourceStatus,
} from "../model/registryTypes";
import { useModelRegistry } from "../model/useModelRegistry";

const panelClass =
  "rounded-2xl border border-[#d8d0c2]/90 bg-[#fffdf8]/90 shadow-[0_16px_46px_rgba(24,24,18,0.055)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/90";
const inputClass =
  "h-10 border-[#d8d0c2]/80 bg-[#f7f3eb] shadow-none dark:border-[#49483f] dark:bg-[#20201c]";

type View = "assignments" | "catalog" | "providers";
type DialogMode = "provider" | "model" | "credential" | null;
type CapabilityFilter = ModelCapability | "all";
type StatusFilter = ResourceStatus | "all";
type ModelOption = { model: ProviderModelView; provider: ProviderView };

const capabilities: Array<{
  id: ModelCapability;
  label: string;
  detail: string;
  icon: LucideIcon;
}> = [
  { id: "llm", label: "LLM", detail: "Chat and reasoning", icon: MessageSquareTextIcon },
  { id: "vlm", label: "VLM", detail: "Images and documents", icon: EyeIcon },
  { id: "embedding", label: "Embedding", detail: "Search and indexing", icon: BinaryIcon },
  { id: "reranker", label: "Reranker", detail: "Evidence relevance", icon: ListFilterIcon },
];

function providerId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function statusClass(status: string) {
  if (status === "active" || status === "available" || status === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200";
  }
  if (status === "unavailable" || status === "needs_attention") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200";
  }
  return "border-[#d8d0c2] bg-[#f8f4eb] text-[#625d53] dark:border-[#49483f] dark:bg-white/5 dark:text-[#c5bcaf]";
}

function capabilityLabel(capability: ModelCapability) {
  return capabilities.find((item) => item.id === capability)?.label ?? capability;
}

export function OrganizationModelRegistry({ user }: { user: AuthUser }) {
  const context = useMemo<ModelRegistryContext | null>(
    () =>
      user.org_role === "org_admin"
        ? {
            userId: user.id,
            organizationId: user.organization_id,
            orgRole: user.org_role,
          }
        : null,
    [user],
  );
  const registry = useModelRegistry(context);
  const [view, setView] = useState<View>("assignments");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingProvider, setEditingProvider] = useState<ProviderView | null>(null);
  const [editingModel, setEditingModel] = useState<ProviderModelView | null>(null);
  const [pendingCapability, setPendingCapability] = useState<ModelCapability>("llm");
  const [assignmentPicker, setAssignmentPicker] = useState<ModelCapability | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<ModelOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<ProviderCatalogItem[]>([]);

  const organizationProviders = registry.providers.filter(
    (provider) => provider.scope === "organization",
  );
  const selectedProvider =
    registry.providers.find((provider) => provider.id === selectedProviderId) ??
    organizationProviders[0] ??
    registry.providers[0] ??
    null;
  const selectedModels = selectedProvider
    ? registry.modelsByProvider[selectedProvider.id] ?? []
    : [];
  const modelOptions = useMemo(
    () =>
      registry.providers.flatMap((provider) =>
        (registry.modelsByProvider[provider.id] ?? []).map((model) => ({
          model,
          provider,
        })),
      ),
    [registry.modelsByProvider, registry.providers],
  );

  async function runAction(
    action: () => Promise<unknown>,
    success: string,
    closeDialog = false,
  ) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      if (closeDialog) setDialogMode(null);
      await registry.refresh();
      return true;
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Model registry action failed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function loadCatalog() {
    if (!context || catalog.length) return;
    try {
      setCatalog(await listProviderCatalog(context));
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to load provider catalog.",
      );
    }
  }

  function openProviderDialog(provider?: ProviderView) {
    setEditingProvider(provider ?? null);
    setDialogMode("provider");
    void loadCatalog();
  }

  function openModelDialog(model?: ProviderModelView, capability?: ModelCapability) {
    setEditingModel(model ?? null);
    setPendingCapability(model?.capability ?? capability ?? "llm");
    setDialogMode("model");
  }

  function openProviderWorkspace(providerId?: string) {
    if (providerId) setSelectedProviderId(providerId);
    setView("providers");
  }

  function addModelForCapability(capability: ModelCapability = "llm") {
    const provider = organizationProviders[0];
    if (!provider) {
      openProviderDialog();
      return;
    }
    setSelectedProviderId(provider.id);
    setView("providers");
    openModelDialog(undefined, capability);
  }

  async function submitProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) return;
    const form = new FormData(event.currentTarget);
    const id = providerId(String(form.get("provider-id") ?? ""));
    const input = {
      display_name: String(form.get("provider-name") ?? "").trim(),
      source: String(form.get("provider-source") ?? "cloud"),
      base_url: String(form.get("provider-url") ?? "").trim(),
      protocol: String(form.get("provider-protocol") ?? "openai_compatible"),
    };
    if (!input.display_name || !input.base_url || (!editingProvider && !id)) return;
    await runAction(
      async () => {
        if (editingProvider) return updateProvider(context, editingProvider.id, input);
        const provider = await createProvider(context, { id, ...input });
        setSelectedProviderId(provider.id);
        setView("providers");
        return provider;
      },
      editingProvider ? "Provider updated." : "Provider added.",
      true,
    );
  }

  async function submitModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context || !selectedProvider || selectedProvider.scope !== "organization") return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("model-name") ?? "").trim();
    const modelId = String(form.get("model-id") ?? "").trim();
    if (!name || (!editingModel && !modelId)) return;
    const input = {
      name,
      capability: String(form.get("model-capability")) as ModelCapability,
      max_tokens: Number(form.get("max-tokens")) || undefined,
      max_context_length: Number(form.get("context-length")) || undefined,
    };
    await runAction(
      () =>
        editingModel
          ? updateProviderModel(context, editingModel.resource_id, input)
          : createProviderModel(context, selectedProvider.id, {
              model_id: modelId,
              ...input,
            }),
      editingModel ? "Model updated." : "Model registered. Test it before routing production work.",
      true,
    );
  }

  async function submitCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context || !selectedProvider) return;
    const apiKey = String(
      new FormData(event.currentTarget).get("api-key") ?? "",
    ).trim();
    if (apiKey) {
      await runAction(
        () => upsertProviderCredential(context, selectedProvider.id, apiKey),
        "Credential stored.",
        true,
      );
    }
  }

  async function confirmSwitch() {
    if (!context || !pendingSwitch) return;
    const success = await runAction(
      () =>
        updateProviderModel(context, pendingSwitch.model.resource_id, {
          is_default: true,
          status: "active",
        }),
      `${pendingSwitch.model.name} is now the default for ${pendingSwitch.provider.display_name} / ${capabilityLabel(pendingSwitch.model.capability)}.`,
    );
    if (success) setPendingSwitch(null);
  }

  if (!context) {
    return (
      <Alert className="border-[#d8d0c2] bg-[#f8f4eb] text-[#625d53] dark:border-[#49483f] dark:bg-white/5 dark:text-[#c5bcaf]">
        <ShieldAlertIcon />
        <AlertTitle>Model configuration is restricted</AlertTitle>
        <AlertDescription>Only organization admins can manage models.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="grid gap-4" aria-labelledby="organization-models-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#777064] dark:text-[#aaa397]">
            Organization model control plane
          </p>
          <h2 id="organization-models-title" className="mt-1 text-xl font-semibold tracking-tight">
            Providers, models and routing defaults
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
            Configure each provider, validate its models, then choose a default per provider and workload.
          </p>
        </div>
        <Button
          className="h-9 w-full shrink-0 rounded-lg bg-[#2456e8] text-white hover:bg-[#1d48c7] sm:w-auto dark:bg-[#7895ff] dark:text-[#0e142c]"
          onClick={() => openProviderDialog()}
        >
          <PlusIcon /> Add provider
        </Button>
      </header>

      {registry.error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Model registry unavailable</AlertTitle>
          <AlertDescription>{registry.error}</AlertDescription>
        </Alert>
      )}
      {registry.warning && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
          <TriangleAlertIcon />
          <AlertTitle>Partial model inventory</AlertTitle>
          <AlertDescription>{registry.warning}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as View)}
        className={cn(panelClass, "gap-0 overflow-hidden")}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e1dacc] p-2 sm:px-5 dark:border-[#38372f]">
          <TabsList className="h-10 max-w-full justify-start gap-1 overflow-x-auto bg-[#f4efe5] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:bg-white/5">
            <TabsTrigger value="assignments" className="h-8 flex-none px-3">
              Model assignments
            </TabsTrigger>
            <TabsTrigger value="catalog" className="h-8 flex-none px-3">
              Model catalog
              <span className="ml-1 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] text-[#625d53] dark:bg-white/10 dark:text-[#c5bcaf]">
                {modelOptions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="providers" className="h-8 flex-none px-3">
              Providers
              <span className="ml-1 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] text-[#625d53] dark:bg-white/10 dark:text-[#c5bcaf]">
                {registry.providers.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => void registry.refresh()}
            disabled={registry.loading}
            aria-label="Refresh model registry"
          >
            <RefreshCwIcon className={cn(registry.loading && "animate-spin")} />
          </Button>
        </div>
        <TabsContent value="assignments" className="m-0">
          <AssignmentWorkspace
            options={modelOptions}
            loading={registry.loading}
            onChoose={setAssignmentPicker}
            onOpenProvider={openProviderWorkspace}
            onAddModel={addModelForCapability}
          />
        </TabsContent>
        <TabsContent value="catalog" className="m-0">
          <ModelCatalogWorkspace
            options={modelOptions}
            loading={registry.loading}
            busy={busy}
            onReviewSwitch={setPendingSwitch}
            onOpenProvider={openProviderWorkspace}
            onEditModel={(option) => {
              setSelectedProviderId(option.provider.id);
              openModelDialog(option.model);
            }}
            onTestModel={(option) =>
              void runAction(
                () => testProviderModel(context, option.model.resource_id),
                `${option.model.name} tested.`,
              )
            }
            onToggleModel={(option) =>
              void runAction(
                () =>
                  updateProviderModel(context, option.model.resource_id, {
                    status: option.model.status === "active" ? "inactive" : "active",
                  }),
                `${option.model.name} ${option.model.status === "active" ? "deactivated" : "activated"}.`,
              )
            }
            onDeleteModel={(option) =>
              window.confirm(`Delete ${option.model.name}?`) &&
              void runAction(
                () => deleteProviderModel(context, option.model.resource_id),
                "Model deleted.",
              )
            }
            onAddModel={() => addModelForCapability()}
          />
        </TabsContent>
        <TabsContent value="providers" className="m-0">
          <WorkflowOverview
            providers={organizationProviders}
            options={modelOptions.filter((option) => option.provider.scope === "organization")}
            onAddProvider={() => openProviderDialog()}
            onProviderSetup={() => openProviderWorkspace(organizationProviders[0]?.id)}
            onModels={() => openProviderWorkspace(organizationProviders[0]?.id)}
            onRouting={() => setView("assignments")}
          />
          <ProviderWorkspace
            provider={selectedProvider}
            providers={registry.providers}
            models={selectedModels}
            modelCounts={Object.fromEntries(
              registry.providers.map((provider) => [
                provider.id,
                (registry.modelsByProvider[provider.id] ?? []).length,
              ]),
            )}
            busy={busy}
            onSelect={setSelectedProviderId}
            onAddProvider={() => openProviderDialog()}
            onAddModel={() => openModelDialog()}
            onCredential={() => setDialogMode("credential")}
            onEditProvider={() => selectedProvider && openProviderDialog(selectedProvider)}
            onTestProvider={() =>
              selectedProvider &&
              void runAction(
                () => testProvider(context, selectedProvider.id),
                "Provider connection tested.",
              )
            }
            onToggleProvider={() =>
              selectedProvider &&
              void runAction(
                () =>
                  updateProvider(context, selectedProvider.id, {
                    status: selectedProvider.status === "active" ? "inactive" : "active",
                  }),
                `Provider ${selectedProvider.status === "active" ? "deactivated" : "activated"}.`,
              )
            }
            onDeleteProvider={() =>
              selectedProvider &&
              window.confirm(`Delete ${selectedProvider.display_name} and its models?`) &&
              void runAction(
                () => deleteProvider(context, selectedProvider.id),
                "Provider deleted.",
              )
            }
            onEditModel={(model) => openModelDialog(model)}
            onTestModel={(model) =>
              void runAction(
                () => testProviderModel(context, model.resource_id),
                `${model.name} tested.`,
              )
            }
            onToggleModel={(model) =>
              void runAction(
                () =>
                  updateProviderModel(context, model.resource_id, {
                    status: model.status === "active" ? "inactive" : "active",
                  }),
                `${model.name} ${model.status === "active" ? "deactivated" : "activated"}.`,
              )
            }
            onDeleteModel={(model) =>
              window.confirm(`Delete ${model.name}?`) &&
              void runAction(
                () => deleteProviderModel(context, model.resource_id),
                "Model deleted.",
              )
            }
          />
        </TabsContent>
      </Tabs>

      <ProviderDialog
        open={dialogMode === "provider"}
        editingProvider={editingProvider}
        catalog={catalog}
        busy={busy}
        onOpenChange={(open) => !open && setDialogMode(null)}
        onSubmit={submitProvider}
      />
      <CredentialDialog
        open={dialogMode === "credential"}
        provider={selectedProvider}
        busy={busy}
        onOpenChange={(open) => !open && setDialogMode(null)}
        onSubmit={submitCredential}
      />
      <ModelDialog
        open={dialogMode === "model"}
        provider={selectedProvider}
        model={editingModel}
        capability={pendingCapability}
        busy={busy}
        onOpenChange={(open) => !open && setDialogMode(null)}
        onSubmit={submitModel}
      />
      <SwitchReviewDialog
        option={pendingSwitch}
        currentDefault={
          pendingSwitch
            ? modelOptions.find(
                (option) =>
                  option.provider.id === pendingSwitch.provider.id &&
                  option.model.capability === pendingSwitch.model.capability &&
                  option.model.is_default,
              ) ?? null
            : null
        }
        busy={busy}
        onOpenChange={(open) => !open && setPendingSwitch(null)}
        onConfirm={() => void confirmSwitch()}
        onOpenProvider={() => {
          if (pendingSwitch) openProviderWorkspace(pendingSwitch.provider.id);
          setPendingSwitch(null);
        }}
      />
      <AssignmentPickerDialog
        capability={assignmentPicker}
        options={modelOptions}
        onOpenChange={(open) => !open && setAssignmentPicker(null)}
        onSelect={(option) => {
          setAssignmentPicker(null);
          setPendingSwitch(option);
        }}
        onOpenProvider={(providerId) => {
          setAssignmentPicker(null);
          openProviderWorkspace(providerId);
        }}
      />
    </section>
  );
}

function AssignmentWorkspace({
  options,
  loading,
  onChoose,
  onOpenProvider,
  onAddModel,
}: {
  options: ModelOption[];
  loading: boolean;
  onChoose: (capability: ModelCapability) => void;
  onOpenProvider: (providerId: string) => void;
  onAddModel: (capability: ModelCapability) => void;
}) {
  return (
    <div>
      <div className="border-b border-[#e9e2d6] px-4 py-4 sm:px-5 dark:border-[#38372f]">
        <h3 className="text-base font-semibold">Defaults by model capability</h3>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#777064] dark:text-[#aaa397]">
          Choose the provider model used as the default for each workload. Defaults are stored per provider and capability.
        </p>
      </div>
      {loading && !options.length ? (
        <div className="grid gap-2 p-4">
          {[1, 2, 3, 4].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-xl bg-[#f4efe5] dark:bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">
          {capabilities.map((capability) => {
            const candidates = options.filter(
              (option) => option.model.capability === capability.id,
            );
            const defaults = candidates.filter((option) => option.model.is_default);
            const readyDefaults = defaults.filter(
              (option) =>
                getModelReadiness(option.provider, option.model).level === "ready",
            );
            const level: ReadinessLevel = defaults.length
              ? readyDefaults.length === defaults.length
                ? "ready"
                : "needs_attention"
              : "not_configured";
            const Icon = capability.icon;
            return (
              <article
                key={capability.id}
                className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf2ff] text-[#2456e8] dark:bg-[#7895ff]/12 dark:text-[#9aafff]">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{capability.label}</h4>
                      <ReadinessBadge level={level} />
                    </div>
                    <p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">
                      {capability.detail}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  {defaults.length ? (
                    <div className="grid gap-2 xl:grid-cols-2">
                      {defaults.map((option) => {
                        const readiness = getModelReadiness(
                          option.provider,
                          option.model,
                        );
                        return (
                          <button
                            key={option.model.resource_id}
                            type="button"
                            onClick={() => onOpenProvider(option.provider.id)}
                            className="min-w-0 rounded-xl border border-[#e1dacc] bg-[#fffefa] px-3 py-2.5 text-left transition-colors hover:border-[#2456e8]/35 hover:bg-[#edf2ff]/45 dark:border-[#38372f] dark:bg-white/[0.025] dark:hover:bg-[#7895ff]/8"
                            aria-label={`Open ${option.provider.display_name} provider`}
                          >
                            <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-[#777064] dark:text-[#aaa397]">
                              <ServerIcon className="size-3 shrink-0" />
                              <span className="truncate">Default for {option.provider.display_name}</span>
                              <ArrowRightIcon className="size-3 shrink-0" />
                              <span>{capability.label}</span>
                            </span>
                            <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
                              <strong className="truncate text-sm">{option.model.name}</strong>
                              <ReadinessBadge level={readiness.level} label={readiness.label} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#d8d0c2] bg-[#fdfaf4] px-3 py-3 dark:border-[#49483f] dark:bg-white/[0.02]">
                      <p className="text-sm font-medium">No provider default configured</p>
                      <p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">
                        {candidates.length
                          ? `${candidates.length} eligible ${capability.label} model${candidates.length === 1 ? " is" : "s are"} available.`
                          : `Register a ${capability.label} model before assigning a default.`}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={defaults.length ? "outline" : "default"}
                  className="h-9 w-full rounded-lg lg:w-auto"
                  onClick={() => candidates.length ? onChoose(capability.id) : onAddModel(capability.id)}
                  aria-label={`${defaults.length ? "Change" : candidates.length ? "Assign" : "Add"} ${capability.label} model`}
                >
                  {defaults.length ? "Change model" : candidates.length ? "Assign model" : "Add model"}
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkflowOverview({
  providers,
  options,
  onAddProvider,
  onProviderSetup,
  onModels,
  onRouting,
}: {
  providers: ProviderView[];
  options: ModelOption[];
  onAddProvider: () => void;
  onProviderSetup: () => void;
  onModels: () => void;
  onRouting: () => void;
}) {
  const readyProviders = providers.filter(
    (provider) => getProviderReadiness(provider).level === "ready",
  );
  const defaultModels = options.filter((option) => option.model.is_default);
  const stages: Array<{
    title: string;
    detail: string;
    state: ReadinessLevel;
    action: string;
    onAction: () => void;
  }> = [
    {
      title: "Add provider",
      detail: providers.length ? `${providers.length} organization provider${providers.length === 1 ? "" : "s"}` : "No organization provider",
      state: providers.length ? "ready" : "not_configured",
      action: providers.length ? "Review" : "Add",
      onAction: providers.length ? onProviderSetup : onAddProvider,
    },
    {
      title: "Authenticate & test",
      detail: readyProviders.length ? `${readyProviders.length} provider${readyProviders.length === 1 ? "" : "s"} ready` : "Credential or connection needs attention",
      state: readyProviders.length ? "ready" : providers.length ? "needs_attention" : "not_configured",
      action: "Configure",
      onAction: onProviderSetup,
    },
    {
      title: "Register & test models",
      detail: options.length ? `${options.length} registered model${options.length === 1 ? "" : "s"}` : "No organization models",
      state: options.length ? "ready" : providers.length ? "needs_attention" : "not_configured",
      action: "Manage",
      onAction: onModels,
    },
    {
      title: "Set provider defaults",
      detail: defaultModels.length ? `${defaultModels.length} configured default${defaultModels.length === 1 ? "" : "s"}` : "No provider defaults",
      state: defaultModels.length ? "ready" : options.length ? "needs_attention" : "not_configured",
      action: "Route",
      onAction: onRouting,
    },
  ];
  return (
    <section className="border-b border-[#e1dacc] dark:border-[#38372f]" aria-label="Model configuration workflow">
      <div className="flex items-center gap-2 border-b border-[#e1dacc] px-4 py-3 text-sm font-semibold dark:border-[#38372f]">
        <WorkflowIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
        Model management workflow
      </div>
      <div className="grid divide-y divide-[#e9e2d6] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 dark:divide-[#38372f]">
        {stages.map((stage, index) => (
          <article key={stage.title} className="relative min-w-0 border-[#e9e2d6] p-4 sm:border-r dark:border-[#38372f]">
            <div className="flex items-start justify-between gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[#d8d0c2] bg-[#f7f3eb] text-xs font-semibold dark:border-[#49483f] dark:bg-white/5">
                {index + 1}
              </span>
              <ReadinessBadge level={stage.state} />
            </div>
            <h3 className="mt-3 text-sm font-semibold">{stage.title}</h3>
            <p className="mt-1 min-h-8 text-xs leading-4 text-[#777064] dark:text-[#aaa397]">{stage.detail}</p>
            <Button variant="ghost" size="sm" className="mt-2 h-7 px-1 text-xs text-[#2456e8] dark:text-[#9aafff]" onClick={stage.onAction}>
              {stage.action} <ArrowRightIcon />
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReadinessBadge({ level, label }: { level: ReadinessLevel; label?: string }) {
  const text = label ?? (level === "ready" ? "Complete" : level === "needs_attention" ? "Needs attention" : "Not configured");
  return (
    <Badge variant="outline" className={cn("h-5 px-1.5 text-[9px] uppercase tracking-wide", statusClass(level))}>
      {text}
    </Badge>
  );
}

function ModelCatalogWorkspace({
  options,
  loading,
  busy,
  onReviewSwitch,
  onOpenProvider,
  onEditModel,
  onTestModel,
  onToggleModel,
  onDeleteModel,
  onAddModel,
}: {
  options: ModelOption[];
  loading: boolean;
  busy: boolean;
  onReviewSwitch: (option: ModelOption) => void;
  onOpenProvider: (providerId: string) => void;
  onEditModel: (option: ModelOption) => void;
  onTestModel: (option: ModelOption) => void;
  onToggleModel: (option: ModelOption) => void;
  onDeleteModel: (option: ModelOption) => void;
  onAddModel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [capability, setCapability] = useState<CapabilityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const filtered = options.filter((option) => {
    const haystack = `${option.model.name} ${option.model.model_id} ${option.provider.display_name}`.toLowerCase();
    return (
      (!query.trim() || haystack.includes(query.trim().toLowerCase())) &&
      (capability === "all" || option.model.capability === capability) &&
      (status === "all" || option.model.status === status)
    );
  });
  const defaults = options.filter((option) => option.model.is_default);
  const readyDefaults = defaults.filter(
    (option) => getModelReadiness(option.provider, option.model).level === "ready",
  );

  return (
    <div>
      <div className="grid border-b border-[#e9e2d6] sm:grid-cols-3 dark:border-[#38372f]">
        <Metric label="Registered models" value={String(options.length)} detail="Across visible providers" />
        <Metric label="Provider defaults" value={String(defaults.length)} detail="Scoped by provider + capability" />
        <Metric label="Ready defaults" value={String(readyDefaults.length)} detail="Active and validated" />
      </div>
      <div className="flex flex-col gap-3 border-b border-[#e9e2d6] p-4 lg:flex-row lg:items-end lg:justify-between sm:p-5 dark:border-[#38372f]">
        <div>
          <h3 className="text-base font-semibold">Model catalog</h3>
          <p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">
            A default applies only to its provider and workload. Runtime usage is not inferred here.
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-9 rounded-lg" onClick={onAddModel}>
          <PlusIcon /> Add model
        </Button>
      </div>
      <div className="grid gap-2 border-b border-[#e9e2d6] p-3 sm:grid-cols-[minmax(220px,1fr)_180px_150px] sm:p-4 dark:border-[#38372f]">
        <label className="relative">
          <span className="sr-only">Search models</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8377]" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search model, ID or provider" className={cn(inputClass, "pl-9")} />
        </label>
        <label>
          <span className="sr-only">Filter by capability</span>
          <select value={capability} onChange={(event) => setCapability(event.target.value as CapabilityFilter)} className={cn(inputClass, "w-full rounded-lg px-3 text-sm")}>
            <option value="all">All capabilities</option>
            {capabilities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by model status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className={cn(inputClass, "w-full rounded-lg px-3 text-sm")}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      <div className="hidden grid-cols-[minmax(260px,1.3fr)_minmax(180px,0.8fr)_130px_150px_150px] gap-3 border-b border-[#e9e2d6] px-5 py-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[#777064] lg:grid dark:border-[#38372f] dark:text-[#aaa397]">
        <span>Provider → model</span><span>Capability</span><span>Readiness</span><span>Limits</span><span className="text-right">Assignment & actions</span>
      </div>
      {loading && !options.length ? (
        <div className="grid gap-2 p-4">{[1, 2, 3].map((key) => <div key={key} className="h-20 animate-pulse rounded-xl bg-[#f4efe5] dark:bg-white/5" />)}</div>
      ) : filtered.length ? (
        <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">
          {filtered.map((option) => (
            <CatalogRow key={option.model.resource_id} option={option} busy={busy} onReviewSwitch={onReviewSwitch} onOpenProvider={onOpenProvider} onEditModel={onEditModel} onTestModel={onTestModel} onToggleModel={onToggleModel} onDeleteModel={onDeleteModel} />
          ))}
        </div>
      ) : (
        <EmptyState title={options.length ? "No models match these filters" : "No models registered"} detail={options.length ? "Change the search or filters to see more models." : "Add an organization provider, then register its first model."} />
      )}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border-b border-[#e9e2d6] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-[#38372f]"><p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#777064] dark:text-[#aaa397]">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p><p className="mt-0.5 text-xs text-[#777064] dark:text-[#aaa397]">{detail}</p></div>;
}

function CatalogRow({ option, busy, onReviewSwitch, onOpenProvider, onEditModel, onTestModel, onToggleModel, onDeleteModel }: { option: ModelOption; busy: boolean; onReviewSwitch: (option: ModelOption) => void; onOpenProvider: (providerId: string) => void; onEditModel: (option: ModelOption) => void; onTestModel: (option: ModelOption) => void; onToggleModel: (option: ModelOption) => void; onDeleteModel: (option: ModelOption) => void }) {
  const { provider, model } = option;
  const readiness = getModelReadiness(provider, model);
  const editable = provider.scope === "organization";
  return (
    <article className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(260px,1.3fr)_minmax(180px,0.8fr)_130px_150px_150px] lg:items-center lg:px-5">
      <button type="button" className="min-w-0 text-left" onClick={() => onOpenProvider(provider.id)}>
        <span className="flex min-w-0 items-center gap-2 text-xs text-[#777064] dark:text-[#aaa397]"><ServerIcon className="size-3.5 shrink-0" /><span className="truncate">{provider.display_name}</span><ArrowRightIcon className="size-3 shrink-0" /></span>
        <strong className="mt-1 block truncate text-sm" title={model.name}>{model.name}</strong>
        <code className="mt-0.5 block truncate text-[10px] text-[#8a8377]" title={model.model_id}>{model.model_id}</code>
      </button>
      <div className="flex flex-wrap items-center gap-1.5"><Badge variant="outline" className="h-6 text-[10px]">{capabilityLabel(model.capability)}</Badge><Badge variant="outline" className="h-6 text-[10px]">{provider.scope === "system" ? "Platform managed" : "Organization"}</Badge></div>
      <div><ReadinessBadge level={readiness.level} label={readiness.label} /><p className="mt-1 text-[10px] text-[#777064] dark:text-[#aaa397]">{model.status} · {model.connection_status}</p></div>
      <p className="text-xs leading-5 text-[#625d53] dark:text-[#c5bcaf]">{model.max_context_length ? `${model.max_context_length.toLocaleString()} context` : "Context not set"}<br />{model.max_tokens ? `${model.max_tokens.toLocaleString()} output` : "Output not set"}</p>
      <div className="flex items-center justify-end gap-2 lg:justify-end">
        {model.is_default ? (
          <Badge className="h-auto max-w-36 whitespace-normal border-0 bg-[#eef3ff] px-2 py-1 text-right text-[9px] leading-4 text-[#1237b4] shadow-none dark:bg-[#7895ff]/15 dark:text-[#bcc9ff]">Default for {provider.display_name}</Badge>
        ) : editable ? (
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={busy} onClick={() => onReviewSwitch(option)}>Set default</Button>
        ) : (
          <span className="text-[10px] text-[#777064]">Read-only</span>
        )}
        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Manage ${model.name}`} disabled={busy}><MoreHorizontalIcon /></Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditModel(option)}><PencilIcon /> Edit model</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTestModel(option)}><CheckCircle2Icon /> Test model</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleModel(option)}>{model.status === "active" ? "Deactivate model" : "Activate model"}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDeleteModel(option)}><Trash2Icon /> Delete model</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </article>
  );
}

function ProviderWorkspace({ provider, providers, models, modelCounts, busy, onSelect, onAddProvider, onAddModel, onCredential, onEditProvider, onTestProvider, onToggleProvider, onDeleteProvider, onEditModel, onTestModel, onToggleModel, onDeleteModel }: { provider: ProviderView | null; providers: ProviderView[]; models: ProviderModelView[]; modelCounts: Record<string, number>; busy: boolean; onSelect: (id: string) => void; onAddProvider: () => void; onAddModel: () => void; onCredential: () => void; onEditProvider: () => void; onTestProvider: () => void; onToggleProvider: () => void; onDeleteProvider: () => void; onEditModel: (model: ProviderModelView) => void; onTestModel: (model: ProviderModelView) => void; onToggleModel: (model: ProviderModelView) => void; onDeleteModel: (model: ProviderModelView) => void }) {
  if (!provider) return <EmptyState title="No provider configured" detail="Add a provider before registering models." action={<Button size="sm" onClick={onAddProvider}><PlusIcon /> Add provider</Button>} />;
  const editable = provider.scope === "organization";
  const readiness = getProviderReadiness(provider);
  return (
    <div className="grid min-h-[520px] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-[#e1dacc] lg:border-b-0 lg:border-r dark:border-[#38372f]" aria-label="Provider list">
        <div className="flex items-center justify-between border-b border-[#e1dacc] px-4 py-3 dark:border-[#38372f]"><div><p className="text-sm font-semibold">Providers</p><p className="mt-0.5 text-xs text-[#777064]">Select one to inspect its models.</p></div><Button size="icon-sm" variant="ghost" onClick={onAddProvider} aria-label="Add provider"><PlusIcon /></Button></div>
        <div className="grid gap-1.5 p-2.5">{providers.map((item) => { const itemReadiness = getProviderReadiness(item); return <button key={`${item.scope}-${item.resource_id}`} type="button" onClick={() => onSelect(item.id)} className={cn("rounded-xl border p-3 text-left transition-colors", provider.resource_id === item.resource_id ? "border-[#2456e8]/40 bg-[#edf2ff]/70 dark:border-[#7895ff]/45 dark:bg-[#7895ff]/10" : "border-transparent hover:border-[#d8d0c2] hover:bg-[#f8f4eb] dark:hover:border-[#49483f] dark:hover:bg-white/5")}><span className="flex items-start justify-between gap-2"><strong className="truncate text-sm">{item.display_name}</strong><span className={cn("mt-1 size-2 shrink-0 rounded-full", itemReadiness.level === "ready" ? "bg-emerald-500" : "bg-amber-500")} /></span><span className="mt-1 flex items-center gap-1.5 text-[10px] text-[#777064]"><span>{item.scope === "system" ? "Platform managed" : "Organization"}</span><span>·</span><span>{modelCounts[item.id] ?? 0} models</span></span></button>; })}</div>
      </aside>
      <section className="min-w-0" aria-labelledby="provider-detail-title">
        <div className="flex flex-col gap-4 border-b border-[#e1dacc] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5 dark:border-[#38372f]">
          <div className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#777064]"><ServerIcon className="size-3" /> Provider <ArrowRightIcon className="size-3" /> Models</p><div className="mt-1 flex flex-wrap items-center gap-2"><h3 id="provider-detail-title" className="truncate text-lg font-semibold">{provider.display_name}</h3><ReadinessBadge level={readiness.level} label={readiness.label} /><Badge variant="outline" className="h-5 text-[9px]">{provider.scope === "system" ? "Platform managed" : "Organization"}</Badge></div><p className="mt-1 truncate font-mono text-[11px] text-[#777064]" title={provider.base_url}>{provider.base_url}</p></div>
          <div className="flex flex-wrap gap-2"><Button size="sm" className="h-9 rounded-lg" disabled={!editable} onClick={onAddModel}><PlusIcon /> Add model</Button>{editable && <DropdownMenu><DropdownMenuTrigger render={<Button size="sm" variant="outline" className="h-9 rounded-lg" disabled={busy}><MoreHorizontalIcon /> Manage</Button>} /><DropdownMenuContent align="end"><DropdownMenuItem onClick={onCredential}><KeyRoundIcon /> Store credential</DropdownMenuItem><DropdownMenuItem onClick={onTestProvider}><CheckCircle2Icon /> Test connection</DropdownMenuItem><DropdownMenuItem onClick={onToggleProvider}>{provider.status === "active" ? "Deactivate provider" : "Activate provider"}</DropdownMenuItem><DropdownMenuItem onClick={onEditProvider}><PencilIcon /> Edit provider</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={onDeleteProvider}><Trash2Icon /> Delete provider</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div>
        </div>
        <div className="grid gap-2 border-b border-[#e9e2d6] px-4 py-3 text-xs sm:grid-cols-4 sm:px-5 dark:border-[#38372f]"><Detail label="Protocol" value={provider.protocol} /><Detail label="Provider status" value={provider.status} /><Detail label="Connection" value={provider.connection_status} /><Detail label="Credential" value={provider.credential_source === "none" ? "Not configured" : provider.credential_source} /></div>
        <div className="border-b border-[#e9e2d6] px-4 py-3 sm:px-5 dark:border-[#38372f]"><h4 className="text-sm font-semibold">Registered models</h4><p className="mt-0.5 text-xs text-[#777064]">Models inherit connectivity and credentials from {provider.display_name}.</p></div>
        {models.length ? <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">{models.map((model) => { const modelReadiness = getModelReadiness(provider, model); return <article key={model.resource_id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(220px,1fr)_minmax(150px,0.6fr)_auto] sm:items-center sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm">{model.name}</strong>{model.is_default && <Badge className="h-5 border-0 bg-[#eef3ff] px-1.5 text-[9px] text-[#1237b4] shadow-none dark:bg-[#7895ff]/15 dark:text-[#bcc9ff]">Default for {provider.display_name}</Badge>}</div><p className="mt-1 truncate text-xs text-[#777064]"><code>{model.model_id}</code> · {capabilityLabel(model.capability)}</p></div><div><ReadinessBadge level={modelReadiness.level} label={modelReadiness.label} /><p className="mt-1 text-[10px] text-[#777064]">{model.status} · {model.connection_status}</p></div>{editable ? <DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Manage ${model.name}`} disabled={busy}><MoreHorizontalIcon /></Button>} /><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEditModel(model)}><PencilIcon /> Edit model</DropdownMenuItem><DropdownMenuItem onClick={() => onTestModel(model)}><CheckCircle2Icon /> Test model</DropdownMenuItem><DropdownMenuItem onClick={() => onToggleModel(model)}>{model.status === "active" ? "Deactivate model" : "Activate model"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => onDeleteModel(model)}><Trash2Icon /> Delete model</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <span className="text-[10px] text-[#777064]">Read-only</span>}</article>; })}</div> : <EmptyState title="No models registered for this provider" detail={editable ? "Register a model, validate it, then select its provider default." : "This platform provider does not expose registered models."} />}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#777064]">{label}</p><p className="mt-1 truncate text-xs font-medium" title={value}>{value}</p></div>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="grid min-h-48 place-items-center p-6 text-center"><div><BotIcon className="mx-auto size-5 text-[#8a8377]" /><p className="mt-2 text-sm font-medium">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#777064] dark:text-[#aaa397]">{detail}</p>{action && <div className="mt-3">{action}</div>}</div></div>;
}

function switchBlocked(option: ModelOption) {
  return (
    option.provider.status !== "active" ||
    option.provider.connection_status === "unavailable" ||
    option.model.connection_status === "unavailable"
  );
}

function AssignmentPickerDialog({
  capability,
  options,
  onOpenChange,
  onSelect,
  onOpenProvider,
}: {
  capability: ModelCapability | null;
  options: ModelOption[];
  onOpenChange: (open: boolean) => void;
  onSelect: (option: ModelOption) => void;
  onOpenProvider: (providerId: string) => void;
}) {
  const definition = capabilities.find((item) => item.id === capability);
  const candidates = capability
    ? options.filter((option) => option.model.capability === capability)
    : [];
  return (
    <Dialog open={Boolean(capability)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-[#d8d0c2] bg-[#fffdf8] dark:border-[#38372f] dark:bg-[#1a1a17]">
        <DialogHeader>
          <DialogTitle>Choose {definition?.label ?? "model"} default</DialogTitle>
          <DialogDescription>
            Compare eligible models with their provider readiness. Selecting a model replaces the default for that provider and capability.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(520px,60vh)] overflow-y-auto rounded-xl border border-[#e1dacc] dark:border-[#38372f]">
          {candidates.length ? (
            <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">
              {candidates.map((option) => {
                const readiness = getModelReadiness(option.provider, option.model);
                const blocked = switchBlocked(option);
                return (
                  <article
                    key={option.model.resource_id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm">{option.model.name}</strong>
                        {option.model.is_default && (
                          <Badge className="h-5 border-0 bg-[#eef3ff] px-1.5 text-[9px] text-[#1237b4] shadow-none dark:bg-[#7895ff]/15 dark:text-[#bcc9ff]">
                            Default for {option.provider.display_name}
                          </Badge>
                        )}
                        <ReadinessBadge level={readiness.level} label={readiness.label} />
                      </div>
                      <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-[#777064] dark:text-[#aaa397]">
                        <ServerIcon className="size-3 shrink-0" />
                        <span>{option.provider.display_name}</span>
                        <ArrowRightIcon className="size-3 shrink-0" />
                        <code className="truncate text-[10px]">{option.model.model_id}</code>
                      </p>
                      <p className="mt-1 text-[10px] text-[#8a8377]">
                        {option.model.max_context_length
                          ? `${option.model.max_context_length.toLocaleString()} context`
                          : "Context not set"}
                        {" · "}
                        {option.model.max_tokens
                          ? `${option.model.max_tokens.toLocaleString()} output`
                          : "Output not set"}
                      </p>
                    </div>
                    {option.model.is_default ? (
                      <Button size="sm" variant="secondary" disabled className="h-8 rounded-lg text-xs">
                        Current default
                      </Button>
                    ) : blocked ? (
                      option.provider.scope === "organization" ? (
                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => onOpenProvider(option.provider.id)}>
                          Review provider
                        </Button>
                      ) : (
                        <span className="text-xs text-[#777064]">Platform managed</span>
                      )
                    ) : (
                      <Button size="sm" className="h-8 rounded-lg text-xs" onClick={() => onSelect(option)}>
                        Select model
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={`No ${definition?.label ?? "matching"} models available`}
              detail="Register a model with this capability in an organization provider first."
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SwitchReviewDialog({ option, currentDefault, busy, onOpenChange, onConfirm, onOpenProvider }: { option: ModelOption | null; currentDefault: ModelOption | null; busy: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void; onOpenProvider: () => void }) {
  if (!option) return <Dialog open={false} onOpenChange={onOpenChange} />;
  const readiness = getModelReadiness(option.provider, option.model);
  const blocked = switchBlocked(option);
  const warnings = [
    option.provider.connection_status !== "available" && option.provider.connection_status !== "unavailable" ? "Provider connection has not been validated." : null,
    option.provider.credential_source === "none" ? "No provider credential is recorded. Keyless providers may still be valid." : null,
    option.model.connection_status !== "available" && option.model.connection_status !== "unavailable" ? "Model validation has not been run." : null,
    option.model.status !== "active" ? "The model will be activated as part of this change." : null,
  ].filter((item): item is string => Boolean(item));
  return <Dialog open onOpenChange={onOpenChange}><DialogContent className="max-w-2xl border-[#d8d0c2] bg-[#fffdf8] dark:border-[#38372f] dark:bg-[#1a1a17]"><DialogHeader><DialogTitle>Review provider default change</DialogTitle><DialogDescription>This changes the default only for {option.provider.display_name} / {capabilityLabel(option.model.capability)}.</DialogDescription></DialogHeader><div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]"><ReviewModel label="Current default" option={currentDefault} empty="No default configured" /><ArrowRightIcon className="mx-auto size-4 self-center text-[#8a8377] max-sm:rotate-90" /><ReviewModel label="New default" option={option} /></div><div className="grid gap-2 rounded-xl border border-[#e1dacc] bg-[#f7f3eb] p-3 text-xs dark:border-[#38372f] dark:bg-white/5"><div className="flex items-center justify-between gap-3"><span className="font-medium">Readiness</span><ReadinessBadge level={readiness.level} label={readiness.label} /></div><p className="text-[#625d53] dark:text-[#c5bcaf]">{readiness.detail}</p>{warnings.map((warning) => <p key={warning} className="flex gap-2 text-amber-800 dark:text-amber-200"><TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />{warning}</p>)}{blocked && <p className="flex gap-2 text-rose-700 dark:text-rose-200"><CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />Resolve inactive or unavailable resources before changing the default.</p>}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>{blocked && <Button variant="outline" onClick={onOpenProvider}>Open provider</Button>}<Button disabled={busy || blocked} onClick={onConfirm}>{busy && <LoaderCircleIcon className="animate-spin" />}Confirm default change</Button></DialogFooter></DialogContent></Dialog>;
}

function ReviewModel({ label, option, empty }: { label: string; option: ModelOption | null; empty?: string }) {
  return <div className="min-w-0 rounded-xl border border-[#e1dacc] p-4 dark:border-[#38372f]"><p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#777064]">{label}</p>{option ? <><p className="mt-2 truncate text-sm font-semibold">{option.model.name}</p><p className="mt-1 truncate text-xs text-[#777064]">{option.provider.display_name}</p><code className="mt-2 block truncate text-[10px] text-[#8a8377]">{option.model.model_id}</code></> : <p className="mt-3 text-sm text-[#777064]">{empty}</p>}</div>;
}

function CredentialDialog({ open, provider, busy, onOpenChange, onSubmit }: { open: boolean; provider: ProviderView | null; busy: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="border-[#d8d0c2] bg-[#fffdf8] dark:border-[#38372f] dark:bg-[#1a1a17]"><form className="grid gap-4" onSubmit={onSubmit}><DialogHeader><DialogTitle>Store credential for {provider?.display_name}</DialogTitle><DialogDescription>The API key is sent securely to Model Service and is not shown again.</DialogDescription></DialogHeader><Field id="api-key" label="API key" type="password" /><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircleIcon className="animate-spin" />}Save credential</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ModelDialog({ open, provider, model, capability, busy, onOpenChange, onSubmit }: { open: boolean; provider: ProviderView | null; model: ProviderModelView | null; capability: ModelCapability; busy: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] dark:border-[#38372f] dark:bg-[#1a1a17]"><form key={`${open}-${model?.resource_id ?? "new"}-${capability}`} className="grid gap-4" onSubmit={onSubmit}><DialogHeader><DialogTitle>{model ? "Edit model" : `Add model to ${provider?.display_name ?? "provider"}`}</DialogTitle><DialogDescription>{model ? "Update model metadata and workload limits." : "Register the provider model first; validate and route it afterward."}</DialogDescription></DialogHeader><div className="grid gap-3">{!model && <Field id="model-id" label="Provider model ID" placeholder="e.g. gpt-4.1-mini" />}<Field id="model-name" label="Display name" defaultValue={model?.name} placeholder="e.g. GPT-4.1 mini" /><label className="grid gap-1.5 text-xs font-medium text-[#625d53] dark:text-[#c5bcaf]">Workload<select name="model-capability" defaultValue={model?.capability ?? capability} className={cn(inputClass, "rounded-lg px-3 text-sm")}>{capabilities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Field id="max-tokens" label="Max output tokens" type="number" defaultValue={model?.max_tokens?.toString()} /><Field id="context-length" label="Context length" type="number" defaultValue={model?.max_context_length?.toString()} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircleIcon className="animate-spin" />}{model ? "Save model" : "Register model"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ProviderDialog({ open, editingProvider, catalog, busy, onOpenChange, onSubmit }: { open: boolean; editingProvider: ProviderView | null; catalog: ProviderCatalogItem[]; busy: boolean; onOpenChange: (open: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [templateId, setTemplateId] = useState("");
  const [values, setValues] = useState({ id: "", name: "", source: "cloud", url: "", protocol: "openai_compatible" });
  useEffect(() => {
    if (!open) return;
    setTemplateId("");
    setValues({ id: editingProvider?.id ?? "", name: editingProvider?.display_name ?? "", source: editingProvider?.source ?? "cloud", url: editingProvider?.base_url ?? "", protocol: editingProvider?.protocol ?? "openai_compatible" });
  }, [editingProvider, open]);
  function selectTemplate(id: string) {
    setTemplateId(id);
    const template = catalog.find((item) => item.id === id);
    if (!template) return;
    setValues({ id: template.id, name: template.display_name, source: template.source, url: template.default_base_url, protocol: template.protocol });
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] dark:border-[#38372f] dark:bg-[#1a1a17]"><form className="grid gap-4" onSubmit={onSubmit}><DialogHeader><DialogTitle>{editingProvider ? "Edit provider" : "Add provider"}</DialogTitle><DialogDescription>{editingProvider ? "Update the provider endpoint and protocol." : "Start from a provider template or enter a custom endpoint."}</DialogDescription></DialogHeader><div className="grid gap-3">{!editingProvider && catalog.length > 0 && <label className="grid gap-1.5"><Label htmlFor="provider-template">Provider template</Label><select id="provider-template" value={templateId} onChange={(event) => selectTemplate(event.target.value)} className={cn(inputClass, "rounded-lg px-3 text-sm")}><option value="">Custom provider</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>}{!editingProvider && <ControlledField id="provider-id" label="Provider ID" value={values.id} onChange={(id) => setValues((current) => ({ ...current, id }))} placeholder="e.g. research-openai" />}<ControlledField id="provider-name" label="Display name" value={values.name} onChange={(name) => setValues((current) => ({ ...current, name }))} placeholder="e.g. OpenAI research" /><label className="grid gap-1.5"><Label htmlFor="provider-source">Source</Label><select id="provider-source" name="provider-source" value={values.source} onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))} className={cn(inputClass, "rounded-lg px-3 text-sm")}><option value="cloud">Cloud</option><option value="custom">Custom</option><option value="local">Local</option></select></label><ControlledField id="provider-url" label="Base URL" value={values.url} onChange={(url) => setValues((current) => ({ ...current, url }))} placeholder="https://api.openai.com/v1" /><label className="grid gap-1.5"><Label htmlFor="provider-protocol">Protocol</Label><select id="provider-protocol" name="provider-protocol" value={values.protocol} onChange={(event) => setValues((current) => ({ ...current, protocol: event.target.value }))} className={cn(inputClass, "rounded-lg px-3 text-sm")}>{[...new Set(["openai_compatible", "openrouter", "cohere_compatible", ...catalog.map((item) => item.protocol)])].map((protocol) => <option key={protocol} value={protocol}>{protocol}</option>)}</select></label></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircleIcon className="animate-spin" />}{editingProvider ? "Save provider" : "Add provider"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ControlledField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required className={inputClass} /></div>;
}

function Field({ id, label, defaultValue, placeholder, type = "text" }: { id: string; label: string; defaultValue?: string; placeholder?: string; type?: string }) {
  return <div className="grid gap-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} name={id} type={type} defaultValue={defaultValue} placeholder={placeholder} required={id !== "max-tokens" && id !== "context-length"} className={inputClass} /></div>;
}
