import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BotIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CloudIcon,
  DatabaseZapIcon,
  EllipsisIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerCogIcon,
  SparklesIcon,
  Trash2Icon,
  WifiIcon,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activateModel,
  modelServiceApiBaseUrl,
  registerModel,
  testModel as runModelSmokeTest,
} from "./api/modelServiceApi";
import { useModelRegistry } from "./model/useModelRegistry";
import type {
  LogicalModelView,
  ModelCapability,
  ModelRegistrationRequest,
  ProviderView,
} from "./model/registryTypes";
import { cn } from "@/shared/lib/utils";

type DialogMode = "provider" | "model" | "settings" | "delete" | null;
type ProviderSource = "cloud" | "local";

type ModelProvider = {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  apiKeyHint: string;
  source: ProviderSource;
  status: "online" | "offline";
  updatedAt: string;
  raw: ProviderView;
};

type ManagedModel = {
  id: string;
  providerId: string | null;
  name: string;
  label: string;
  contextWindow: string;
  primary: boolean;
  enabled: boolean;
  raw: LogicalModelView;
};

const panelClass =
  "rounded-[22px] border border-[#d8d0c2]/80 bg-[#fffdf8]/88 shadow-[0_16px_46px_rgba(24,24,18,0.055)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88";
const quietInputClass =
  "h-9 border-[#d8d0c2]/80 bg-[#f7f3eb] text-[#25241f] shadow-none dark:border-[#49483f] dark:bg-[#20201c] dark:text-[#eee8dc]";

const availableProviders = [
  "Azure OpenAI",
  "Google Gemini",
  "OpenRouter",
  "DeepSeek",
];

function ProviderMark({ name }: { name: string }) {
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#d8d0c2] bg-[#f4efe5] text-[#2456e8] dark:border-[#49483f] dark:bg-white/5 dark:text-[#9aafff]">
      <BotIcon className="size-5" aria-hidden="true" />
      <span className="sr-only">{name}</span>
    </div>
  );
}

function FormField({
  id,
  label,
  defaultValue,
  type = "text",
  placeholder,
  required = false,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium text-[#625d53] dark:text-[#c5bcaf]"
      >
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={quietInputClass}
      />
    </div>
  );
}

function isLocalEndpoint(baseUrl: string) {
  const normalized = baseUrl.toLowerCase();
  return (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("0.0.0.0") ||
    normalized.includes("ollama")
  );
}

function isProviderOnline(status: string) {
  const normalized = status.toLowerCase();
  return normalized === "active" || normalized === "validated";
}

function formatUpdatedAt(value: string) {
  if (!value) return "Not synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `Updated ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

function describeProvider(provider: ProviderView) {
  const adapter = provider.adapter_type.replace(/[_-]+/g, " ");
  return `${adapter} provider for ${provider.scope} inference routing.`;
}

function maskSecret(secretRef: string | null) {
  if (!secretRef) return "Credential not configured";
  if (secretRef.startsWith("env:")) return `Env - ${secretRef.slice(4)}`;
  if (secretRef.startsWith("literal:")) return "Configured - masked";
  return secretRef;
}

function providerToView(provider: ProviderView): ModelProvider {
  return {
    id: provider.id,
    name: provider.name,
    description: describeProvider(provider),
    endpoint: provider.base_url,
    apiKeyHint: maskSecret(provider.secret_ref),
    source: isLocalEndpoint(provider.base_url) ? "local" : "cloud",
    status: isProviderOnline(provider.status) ? "online" : "offline",
    updatedAt: formatUpdatedAt(provider.updated_at),
    raw: provider,
  };
}

function formatCapability(capability: ModelCapability) {
  if (capability === "llm") return "LLM";
  if (capability === "vlm") return "VLM";
  if (capability === "reranker") return "Reranker";
  return "Embedding";
}

function modelToView(
  model: LogicalModelView,
  providerId: string | null,
  primaryModelId: string | null,
): ManagedModel {
  const active = model.status.toLowerCase() === "active";
  const enabled = !["draft", "inactive", "error"].includes(
    model.status.toLowerCase(),
  );

  return {
    id: model.id,
    providerId,
    name: model.alias,
    label: model.display_name || model.alias,
    contextWindow: `${formatCapability(model.capability)} - rev ${model.revision}`,
    primary: active && model.id === primaryModelId,
    enabled,
    raw: model,
  };
}

function inferCapabilityFromModelName(modelName: string): ModelCapability {
  const normalized = modelName.toLowerCase();
  if (normalized.includes("rerank")) return "reranker";
  if (normalized.includes("embedding") || normalized.includes("embed")) {
    return "embedding";
  }
  if (
    normalized.includes("vision") ||
    normalized.includes("vlm") ||
    normalized.includes("llava")
  ) {
    return "vlm";
  }
  return "llm";
}

function inferProviderFromBaseUrl(baseUrl: string) {
  const normalized = baseUrl.toLowerCase();
  if (normalized.includes("openrouter")) return "openrouter";
  if (normalized.includes("cohere")) return "cohere_compatible";
  if (normalized.includes("openai")) return "openai_compatible";
  return "openai_compatible";
}

function normalizeSecretRef(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("env:") || trimmed.startsWith("literal:")) {
    return trimmed;
  }
  if (
    trimmed.startsWith("sk-") ||
    trimmed.startsWith("sk_") ||
    trimmed.length > 48
  ) {
    return `literal:${trimmed}`;
  }
  return `env:${trimmed}`;
}

function slugifyModelName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return slug.length > 1 ? slug : `${slug || "model"}-1`;
}

function buildModelAlias(modelName: string, capability: ModelCapability) {
  const slug = slugifyModelName(modelName.split("/").pop() || modelName);
  if (capability === "embedding") return "openrouter-embedding";
  return slug;
}

function formatModelDisplayName(modelName: string) {
  const name = modelName.split("/").pop() || modelName;
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFormValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function buildRegistrationRequest({
  provider,
  providerName,
  baseUrl,
  apiKey,
  upstreamModelId,
}: {
  provider?: ProviderView;
  providerName: string;
  baseUrl: string;
  apiKey: string;
  upstreamModelId: string;
}): ModelRegistrationRequest {
  const capability = inferCapabilityFromModelName(upstreamModelId);
  const alias = buildModelAlias(upstreamModelId, capability);

  return {
    provider: {
      name: providerName || provider?.name || "custom-provider",
      adapter_type: provider?.adapter_type || inferProviderFromBaseUrl(baseUrl),
      base_url: baseUrl || provider?.base_url || "",
      secret_ref: normalizeSecretRef(apiKey) ?? provider?.secret_ref ?? null,
      scope: provider?.scope === "tenant" ? "tenant" : "platform",
    },
    model: {
      alias,
      display_name: formatModelDisplayName(upstreamModelId),
      capability,
      upstream_model_id: upstreamModelId,
    },
    deployment: {
      priority: 10,
      weight: 100,
      timeout_ms: 60000,
      max_attempts: 2,
    },
    activate: true,
  };
}

export function ModelsPage() {
  const registry = useModelRegistry();
  const [source, setSource] = useState<ProviderSource>("cloud");
  const [query, setQuery] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingModel, setEditingModel] = useState<ManagedModel | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const providers = useMemo(
    () => registry.providers.map(providerToView),
    [registry.providers],
  );

  const modelProviderIds = useMemo(() => {
    const ids = new Map<string, string | null>();
    registry.models.forEach((model) => {
      const deployments = registry.deployments[model.id] ?? [];
      const deployment =
        deployments.find((item) => item.status.toLowerCase() === "active") ??
        deployments[0];
      ids.set(model.id, deployment?.provider_id ?? null);
    });
    return ids;
  }, [registry.deployments, registry.models]);

  const primaryModelId =
    registry.models.find((model) => model.status.toLowerCase() === "active")
      ?.id ??
    registry.models[0]?.id ??
    null;

  const models = useMemo(
    () =>
      registry.models.map((model) =>
        modelToView(
          model,
          modelProviderIds.get(model.id) ?? null,
          primaryModelId,
        ),
      ),
    [modelProviderIds, primaryModelId, registry.models],
  );

  useEffect(() => {
    if (
      selectedProviderId &&
      providers.some((item) => item.id === selectedProviderId)
    ) {
      return;
    }
    setSelectedProviderId(providers[0]?.id ?? null);
  }, [providers, selectedProviderId]);

  const filteredProviders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return providers.filter(
      (provider) =>
        provider.source === source &&
        (!search ||
          `${provider.name} ${provider.description}`
            .toLowerCase()
            .includes(search)),
    );
  }, [providers, query, source]);

  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ??
    providers[0] ??
    null;
  const selectedModels = selectedProvider
    ? models.filter((model) => model.providerId === selectedProvider.id)
    : [];
  const primaryModel = models.find((model) => model.primary);

  const closeDialog = () => {
    if (saving) return;
    setDialogMode(null);
    setEditingModel(null);
  };

  const refreshRegistry = async () => {
    await registry.refresh();
    toast.success("Model registry refreshed.");
  };

  const submitProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const request = buildRegistrationRequest({
      providerName: getFormValue(formData, "provider-name"),
      baseUrl: getFormValue(formData, "provider-endpoint"),
      apiKey: getFormValue(formData, "provider-key"),
      upstreamModelId: getFormValue(formData, "provider-model"),
    });

    setSaving(true);
    try {
      const result = await registerModel(request);
      await registry.refresh();
      setSelectedProviderId(result.provider.id);
      toast.success(`${result.model.alias} registered and synced.`);
      closeDialog();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to register provider.",
      );
    } finally {
      setSaving(false);
    }
  };

  const submitModel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProvider) return;

    const formData = new FormData(event.currentTarget);
    const upstreamModelId = getFormValue(formData, "model-id");
    const apiKey = getFormValue(formData, "model-key");
    const provider = selectedProvider.raw;
    const request = buildRegistrationRequest({
      provider,
      providerName: provider.name,
      baseUrl: provider.base_url,
      apiKey,
      upstreamModelId,
    });

    setSaving(true);
    try {
      const result = await registerModel(request);
      await registry.refresh();
      toast.success(`${result.model.alias} registered and activated.`);
      closeDialog();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save model.",
      );
    } finally {
      setSaving(false);
    }
  };

  const submitProviderSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProvider) return;

    const formData = new FormData(event.currentTarget);
    const upstreamModelId = getFormValue(formData, "settings-model");
    const request = buildRegistrationRequest({
      provider: selectedProvider.raw,
      providerName: selectedProvider.raw.name,
      baseUrl: getFormValue(formData, "settings-endpoint"),
      apiKey: getFormValue(formData, "settings-key"),
      upstreamModelId,
    });

    setSaving(true);
    try {
      await registerModel(request);
      await registry.refresh();
      toast.success("Provider configuration registered.");
      closeDialog();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update provider settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const testModel = async (model: ManagedModel) => {
    setTesting(model.id);
    toast.loading(`Testing ${model.label}...`, { id: `test-${model.id}` });
    const result = await runModelSmokeTest(model.raw);
    setTesting(null);
    if (result.status === "success") {
      toast.success(result.detail, { id: `test-${model.id}` });
    } else {
      toast.error(result.detail, { id: `test-${model.id}` });
    }
  };

  const activateManagedModel = async (model: ManagedModel) => {
    setActivating(model.id);
    try {
      await activateModel(model.id);
      await registry.refresh();
      toast.success(`${model.label} is active.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to activate model.",
      );
    } finally {
      setActivating(null);
    }
  };

  const deleteModel = () => {
    if (!editingModel) return;
    toast.info("Model removal is not exposed by Model Service yet.");
    closeDialog();
  };

  return (
    <section
      className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10"
      aria-label="Model management"
    >
      <div className="mx-auto grid w-full max-w-[1440px] gap-6">
        <header className={cn(panelClass, "flex flex-col gap-5 p-5 sm:p-6")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#777064] dark:text-[#aaa397]">
                <span>Settings</span>
                <ChevronRightIcon className="size-3.5" />
                <span className="text-[#2456e8] dark:text-[#9aafff]">
                  Models
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#191915] dark:text-[#f4efe5] sm:text-3xl">
                Model control
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
                Configure providers and verify the models AXIOM may use for
                investigation workflows.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Default model:{" "}
                <strong>{primaryModel?.label ?? "Not set"}</strong>
              </div>
              <Badge
                variant="outline"
                className="h-8 rounded-full border-[#d8d0c2] bg-[#fffdf8]/70 px-3 text-xs text-[#625d53] dark:border-[#49483f] dark:bg-white/5 dark:text-[#c5bcaf]"
              >
                {modelServiceApiBaseUrl}
              </Badge>
              <Button
                className="h-9 rounded-full bg-[#2456e8] px-4 text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]"
                onClick={() => setDialogMode("provider")}
              >
                <PlusIcon /> Add provider
              </Button>
            </div>
          </div>
          <div className="grid gap-3 border-t border-[#e1dacc] pt-4 dark:border-[#38372f] lg:grid-cols-[auto_minmax(210px,1fr)_auto] lg:items-center">
            <div
              className="flex w-fit rounded-full border border-[#d8d0c2] bg-[#f4efe5]/75 p-1 dark:border-[#49483f] dark:bg-white/5"
              role="tablist"
              aria-label="Provider source"
            >
              {(["cloud", "local"] as ProviderSource[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant="ghost"
                  size="sm"
                  role="tab"
                  aria-selected={source === item}
                  onClick={() => setSource(item)}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs capitalize",
                    source === item
                      ? "bg-white text-[#191915] shadow-sm dark:bg-[#292923] dark:text-[#f4efe5]"
                      : "text-[#6d685e] dark:text-[#aaa397]",
                  )}
                >
                  {item === "cloud" ? <CloudIcon /> : <ServerCogIcon />}
                  {item} providers
                </Button>
              ))}
            </div>
            <div className="relative min-w-0">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8377]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={cn(quietInputClass, "w-full rounded-full pl-9")}
                placeholder="Search configured providers"
                aria-label="Search configured providers"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full border-[#d8d0c2] bg-[#fffdf8] dark:border-[#49483f] dark:bg-[#20201c]"
              disabled={registry.loading}
              onClick={() => void refreshRegistry()}
            >
              <RefreshCwIcon
                className={registry.loading ? "animate-spin" : ""}
              />
              Refresh status
            </Button>
          </div>
        </header>

        {registry.error && (
          <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-200">
            {registry.error}
          </div>
        )}

        <section
          className={cn(panelClass, "p-4 sm:p-5")}
          aria-labelledby="configured-providers-title"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <h2
                  id="configured-providers-title"
                  className="text-sm font-semibold"
                >
                  Configured providers
                </h2>
                <Badge
                  variant="outline"
                  className="h-5 rounded-full border-[#d8d0c2] px-2 text-[10px] tabular-nums text-[#625d53] dark:border-[#49483f] dark:text-[#c5bcaf]"
                >
                  {filteredProviders.length}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">
                Connection status and available models at a glance.
              </p>
            </div>
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              {providers.filter((item) => item.status === "online").length}{" "}
              providers online
            </span>
          </div>
          {registry.loading && providers.length === 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-[18px]" />
              ))}
            </div>
          ) : filteredProviders.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredProviders.map((provider) => {
                const providerModels = models.filter(
                  (model) => model.providerId === provider.id,
                );
                const selected = selectedProvider?.id === provider.id;
                return (
                  <article
                    key={provider.id}
                    className={cn(
                      "rounded-[18px] border bg-[#fffdf8] p-4 transition-colors dark:bg-[#20201c]",
                      selected
                        ? "border-[#2456e8]/40 ring-2 ring-[#2456e8]/8 dark:border-[#7895ff]/45"
                        : "border-[#e1dacc] dark:border-[#38372f]",
                    )}
                  >
                    <div className="flex gap-3">
                      <ProviderMark name={provider.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{provider.name}</h3>
                          <Badge
                            className={cn(
                              "h-5 border-0 px-1.5 text-[9px] font-semibold shadow-none",
                              provider.status === "online"
                                ? "bg-[#e8f7ef] text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                                : "bg-[#f4efe5] text-[#625d53] dark:bg-white/5 dark:text-[#aaa397]",
                            )}
                          >
                            {provider.raw.status.toUpperCase()}
                          </Badge>
                          <span
                            className={cn(
                              "flex items-center gap-1 text-[11px]",
                              provider.status === "online"
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-[#777064] dark:text-[#aaa397]",
                            )}
                          >
                            <WifiIcon className="size-3" />
                            {provider.status === "online"
                              ? "Online"
                              : "Offline"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#6d685e] dark:text-[#aaa397]">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-[#8a8377]">
                          Endpoint
                        </dt>
                        <dd className="mt-1 truncate rounded-md bg-[#f4efe5] px-2 py-1.5 font-mono text-[11px] text-[#625d53] dark:bg-white/5 dark:text-[#c5bcaf]">
                          {provider.endpoint}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-[#8a8377]">
                          API key
                        </dt>
                        <dd className="mt-1 flex items-center gap-1.5 rounded-md bg-[#f4efe5] px-2 py-1.5 font-mono text-[11px] text-[#625d53] dark:bg-white/5 dark:text-[#c5bcaf]">
                          <KeyRoundIcon className="size-3" />
                          {provider.apiKeyHint}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex items-center justify-between border-t border-[#e9e2d6] pt-3 dark:border-[#38372f]">
                      <span className="text-xs text-[#625d53] dark:text-[#c5bcaf]">
                        <strong>{providerModels.length}</strong> configured
                        models
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg border-[#d8d0c2] text-xs dark:border-[#49483f]"
                          onClick={() => setSelectedProviderId(provider.id)}
                        >
                          Models
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg px-2 text-xs"
                          onClick={() => {
                            setSelectedProviderId(provider.id);
                            setDialogMode("settings");
                          }}
                          aria-label={`Edit ${provider.name} settings`}
                        >
                          <PencilIcon />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-36 place-items-center rounded-[18px] border border-dashed border-[#d8d0c2] text-center dark:border-[#49483f]">
              <div>
                <CircleAlertIcon className="mx-auto size-5 text-[#8a8377]" />
                <p className="mt-2 text-sm font-medium">No providers found</p>
                <p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">
                  Add a provider or change the current filter.
                </p>
              </div>
            </div>
          )}
        </section>

        <section
          className={cn(panelClass, "overflow-hidden")}
          aria-labelledby="provider-models-title"
        >
          <div className="flex flex-col gap-3 border-b border-[#e1dacc] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-[#38372f]">
            <div className="flex min-w-0 items-center gap-3">
              <ProviderMark name={selectedProvider?.name ?? "Provider"} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    id="provider-models-title"
                    className="truncate text-base font-semibold"
                  >
                    {selectedProvider?.name ?? "Select a provider"} models
                  </h2>
                  <span className="text-xs text-[#777064] dark:text-[#aaa397]">
                    {selectedProvider?.updatedAt}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#6d685e] dark:text-[#aaa397]">
                  Test a model before enabling it for AXIOM workflows.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="h-9 rounded-full bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]"
              onClick={() => setDialogMode("model")}
              disabled={!selectedProvider}
            >
              <PlusIcon /> Add model
            </Button>
          </div>
          {registry.loading && models.length === 0 ? (
            <div className="grid gap-1 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : selectedModels.length ? (
            <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">
              {selectedModels.map((model) => (
                <div
                  key={model.id}
                  className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf2ff] text-[#2456e8] dark:bg-[#7895ff]/12 dark:text-[#9aafff]">
                      <SparklesIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm">
                          {model.label}
                        </strong>
                        {model.primary && (
                          <Badge className="h-5 border-0 bg-[#eef3ff] px-1.5 text-[9px] text-[#1237b4] shadow-none dark:bg-[#7895ff]/15 dark:text-[#bcc9ff]">
                            DEFAULT
                          </Badge>
                        )}
                        {!model.enabled && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[9px]"
                          >
                            {model.raw.status.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6d685e] dark:text-[#aaa397]">
                        <code>{model.name}</code>
                        <span>{model.contextWindow}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!model.primary && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg border-[#d8d0c2] text-xs dark:border-[#49483f]"
                        onClick={() => void activateManagedModel(model)}
                        disabled={activating === model.id}
                      >
                        {activating === model.id ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : (
                          <DatabaseZapIcon />
                        )}
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg border-[#d8d0c2] text-xs dark:border-[#49483f]"
                      onClick={() => void testModel(model)}
                      disabled={testing === model.id}
                    >
                      {testing === model.id ? (
                        <LoaderCircleIcon className="animate-spin" />
                      ) : (
                        <DatabaseZapIcon />
                      )}
                      {testing === model.id ? "Testing" : "Test"}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="rounded-lg"
                      onClick={() => {
                        setEditingModel(model);
                        setDialogMode("model");
                      }}
                      aria-label={`Edit ${model.label}`}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="rounded-lg text-[#a53838] hover:bg-rose-50 hover:text-[#8b2424] dark:text-rose-300 dark:hover:bg-rose-400/10"
                      onClick={() => {
                        setEditingModel(model);
                        setDialogMode("delete");
                      }}
                      aria-label={`Delete ${model.label}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-44 place-items-center px-5 text-center">
              <div>
                <CircleAlertIcon className="mx-auto size-5 text-[#8a8377]" />
                <p className="mt-2 text-sm font-medium">No models configured</p>
                <p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">
                  Add a model after the provider connection is ready.
                </p>
              </div>
            </div>
          )}
        </section>

        <section
          className={cn(panelClass, "p-4 sm:p-5")}
          aria-labelledby="available-providers-title"
        >
          <div className="mb-3 flex items-center gap-2">
            <EllipsisIcon className="size-4 text-[#777064]" />
            <h2
              id="available-providers-title"
              className="text-sm font-semibold"
            >
              Available providers
            </h2>
            <span className="text-xs text-[#777064] dark:text-[#aaa397]">
              Connect a supported provider when needed.
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {availableProviders.map((name) => (
              <button
                key={name}
                type="button"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-[#e7dfd2] bg-[#fffdfa] px-3 text-left text-xs font-medium transition-colors hover:border-[#2456e8]/35 hover:bg-[#edf2ff]/45 dark:border-[#38372f] dark:bg-[#20201c] dark:hover:border-[#7895ff]/35 dark:hover:bg-[#7895ff]/8"
                onClick={() => {
                  setDialogMode("provider");
                  toast.info(`Configure ${name} to add it.`);
                }}
              >
                <div className="grid size-6 place-items-center rounded-md bg-[#f4efe5] text-[#2456e8] dark:bg-white/5 dark:text-[#9aafff]">
                  <BotIcon className="size-3.5" />
                </div>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <ChevronRightIcon className="size-3.5 text-[#8a8377]" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <Dialog
        open={dialogMode === "provider"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]">
          <form className="grid gap-4" onSubmit={submitProvider}>
            <DialogHeader>
              <DialogTitle>Add provider</DialogTitle>
              <DialogDescription>
                Register a provider endpoint with the first model AXIOM should
                use.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <FormField
                id="provider-name"
                label="Provider name"
                placeholder="e.g. OpenRouter"
                required
              />
              <FormField
                id="provider-endpoint"
                label="Base endpoint"
                placeholder="https://openrouter.ai/api/v1"
                required
              />
              <FormField
                id="provider-key"
                label="API key"
                type="password"
                placeholder="Paste a credential"
                required
              />
              <FormField
                id="provider-model"
                label="Model name"
                placeholder="openai/gpt-4o-mini"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]"
                disabled={saving}
              >
                {saving && <LoaderCircleIcon className="animate-spin" />}
                Add provider
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === "settings"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]">
          <form className="grid gap-4" onSubmit={submitProviderSettings}>
            <DialogHeader>
              <DialogTitle>{selectedProvider?.name} settings</DialogTitle>
              <DialogDescription>
                Register this provider with an updated endpoint or credential.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <FormField
                id="settings-endpoint"
                label="Base endpoint"
                defaultValue={selectedProvider?.endpoint}
                required
              />
              <FormField
                id="settings-key"
                label="API key"
                type="password"
                placeholder="Leave empty to keep the current secret reference"
              />
              <FormField
                id="settings-model"
                label="Model name"
                placeholder="openai/gpt-4o-mini"
                defaultValue={selectedModels[0]?.raw.alias}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircleIcon className="animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === "model"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]">
          <form className="grid gap-4" onSubmit={submitModel}>
            <DialogHeader>
              <DialogTitle>
                {editingModel ? "Edit model" : "Add model"}
              </DialogTitle>
              <DialogDescription>
                {selectedProvider?.name} - register a model available to the
                current workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <FormField
                id="model-id"
                label="Model name"
                defaultValue={editingModel?.raw.alias}
                placeholder="openai/gpt-4o-mini"
                required
              />
              <FormField
                id="model-key"
                label="API key"
                type="password"
                placeholder="Leave empty to reuse provider secret"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <LoaderCircleIcon className="animate-spin" />}
                {editingModel ? "Save changes" : "Add model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="max-w-md border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]">
          <DialogHeader>
            <DialogTitle>Remove {editingModel?.label}?</DialogTitle>
            <DialogDescription>
              Model Service does not expose model removal yet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteModel}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
