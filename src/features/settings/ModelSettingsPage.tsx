import { useMemo, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CpuIcon,
  DatabaseZapIcon,
  KeyRoundIcon,
  PlayIcon,
  RefreshCwIcon,
  RocketIcon,
  ServerCogIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  XCircleIcon,
} from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  activateDeployment,
  activateModel,
  modelServiceApiBaseUrl,
  registerModel,
  testModel,
} from "./api/modelServiceApi";
import { useModelRegistry } from "./model/useModelRegistry";
import type {
  DeploymentView,
  LogicalModelView,
  ModelCapability,
  ModelRegistrationRequest,
  ModelTestResult,
  ProviderView,
} from "./model/types";
import { cn } from "@/shared/lib/utils";

const modelCapabilities: ModelCapability[] = [
  "embedding",
  "llm",
  "reranker",
  "vlm",
];

const statusTone = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  validated:
    "border-[#2456e8]/25 bg-[#edf2ff] text-[#1237b4] dark:border-[#7895ff]/25 dark:bg-[#7895ff]/10 dark:text-[#bcc9ff]",
  inactive:
    "border-[#d8d0c2] bg-[#f4efe5] text-[#6d685e] dark:border-[#38372f] dark:bg-[#252520] dark:text-[#aaa397]",
  draft:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300",
} as const;

type RegistrationDraft = {
  providerName: string;
  adapterType: string;
  baseUrl: string;
  secretRef: string;
  scope: "platform" | "tenant";
  alias: string;
  displayName: string;
  capability: ModelCapability;
  upstreamModelId: string;
  priority: number;
  weight: number;
  timeoutMs: number;
  maxAttempts: number;
  activate: boolean;
};

const defaultRegistration: RegistrationDraft = {
  providerName: "openrouter-main",
  adapterType: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  secretRef: "OPENROUTER_API_KEY",
  scope: "platform",
  alias: "openrouter-embedding",
  displayName: "OpenRouter Embedding",
  capability: "embedding",
  upstreamModelId: "openai/text-embedding-3-small",
  priority: 10,
  weight: 100,
  timeoutMs: 60000,
  maxAttempts: 2,
  activate: true,
};

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase() as keyof typeof statusTone;
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
        statusTone[normalized] ?? statusTone.inactive,
      )}
    >
      {status}
    </Badge>
  );
}

function PageMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#d8d0c2]/80 bg-[#fffdf8]/78 p-4 shadow-[0_14px_38px_rgba(24,24,18,0.05)] dark:border-[#38372f]/80 dark:bg-[#1a1a17]/75">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#6d685e] dark:text-[#aaa397]">
            {label}
          </p>
          <strong className="mt-2 block text-3xl font-semibold leading-none text-[#191915] dark:text-[#f4efe5]">
            {value}
          </strong>
        </div>
        <span className="grid size-10 place-items-center rounded-xl border border-[#d8d0c2] bg-[#f4efe5] text-[#2456e8] dark:border-[#38372f] dark:bg-[#252520] dark:text-[#7895ff]">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6d685e] dark:text-[#aaa397]">
        {detail}
      </p>
    </div>
  );
}

function registrationToRequest(
  draft: RegistrationDraft,
): ModelRegistrationRequest {
  const provider = inferProviderFromBaseUrl(draft.baseUrl);
  const capability =
    draft.capability || inferCapabilityFromModelName(draft.upstreamModelId);
  const alias =
    draft.alias.trim() || buildModelAlias(draft.upstreamModelId, capability);
  const displayName =
    draft.displayName.trim() || formatModelDisplayName(draft.upstreamModelId);

  return {
    provider: {
      name: draft.providerName.trim() || provider.providerName,
      adapter_type: draft.adapterType || provider.adapterType,
      base_url: draft.baseUrl.trim(),
      secret_ref: normalizeSecretRef(draft.secretRef),
      scope: draft.scope,
    },
    model: {
      alias,
      display_name: displayName,
      capability,
      upstream_model_id: draft.upstreamModelId.trim(),
    },
    deployment: {
      priority: draft.priority,
      weight: draft.weight,
      timeout_ms: draft.timeoutMs,
      max_attempts: draft.maxAttempts,
    },
    activate: draft.activate,
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
  if (normalized.includes("openrouter")) {
    return {
      providerName: "openrouter-main",
      adapterType: "openrouter",
      secretRef: "OPENROUTER_API_KEY",
    };
  }
  if (normalized.includes("cohere")) {
    return {
      providerName: "cohere-main",
      adapterType: "cohere_compatible",
      secretRef: "COHERE_API_KEY",
    };
  }
  if (normalized.includes("openai")) {
    return {
      providerName: "openai-main",
      adapterType: "openai_compatible",
      secretRef: "OPENAI_API_KEY",
    };
  }
  return {
    providerName: "custom-main",
    adapterType: "openai_compatible",
    secretRef: "MODEL_API_KEY",
  };
}

function normalizeSecretRef(secretRef: string) {
  const trimmed = secretRef.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("env:") || trimmed.startsWith("literal:")) {
    return trimmed;
  }
  if (looksLikeRawApiKey(trimmed)) return `literal:${trimmed}`;
  return `env:${trimmed}`;
}

function looksLikeRawApiKey(value: string) {
  return (
    value.startsWith("sk-") ||
    value.startsWith("sk_") ||
    value.includes("-api-key-") ||
    value.length > 48
  );
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

function ModelRegistrationPanel({
  registering,
  onRegister,
}: {
  registering: boolean;
  onRegister: (draft: RegistrationDraft) => void;
}) {
  const [draft, setDraft] = useState<RegistrationDraft>(defaultRegistration);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const inferredProvider = inferProviderFromBaseUrl(draft.baseUrl);
  const inferredCapability = inferCapabilityFromModelName(
    draft.upstreamModelId,
  );
  const valid = Boolean(
    draft.baseUrl.trim() &&
    draft.secretRef.trim() &&
    draft.upstreamModelId.trim(),
  );

  function update<K extends keyof RegistrationDraft>(
    key: K,
    value: RegistrationDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card className="overflow-hidden rounded-[24px] border-[#d8d0c2]/85 bg-[#fffdf8]/90 shadow-[0_18px_54px_rgba(24,24,18,0.07)] backdrop-blur-xl dark:border-[#38372f]/85 dark:bg-[#1a1a17]/90">
      <CardHeader className="gap-3 p-5 pb-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#2456e8]/25 bg-[#edf2ff] text-[#1237b4] dark:border-[#7895ff]/25 dark:bg-[#7895ff]/10 dark:text-[#bcc9ff]">
            <RocketIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#191915] dark:text-[#f4efe5]">
              Connect a model
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#6d685e] dark:text-[#aaa397]">
              Add the provider endpoint AXIOM should call for inference.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="upstream-model">Model name</FieldLabel>
            <Input
              id="upstream-model"
              value={draft.upstreamModelId}
              placeholder="openai/text-embedding-3-small"
              onChange={(event) => {
                const upstreamModelId = event.target.value;
                const capability =
                  inferCapabilityFromModelName(upstreamModelId);
                setDraft((current) => ({
                  ...current,
                  upstreamModelId,
                  capability,
                  alias: buildModelAlias(upstreamModelId, capability),
                  displayName: formatModelDisplayName(upstreamModelId),
                }));
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="provider-base-url">Base URL</FieldLabel>
            <Input
              id="provider-base-url"
              value={draft.baseUrl}
              placeholder="https://openrouter.ai/api/v1"
              onChange={(event) => {
                const baseUrl = event.target.value;
                const provider = inferProviderFromBaseUrl(baseUrl);
                setDraft((current) => ({
                  ...current,
                  baseUrl,
                  providerName: provider.providerName,
                  adapterType: provider.adapterType,
                  secretRef:
                    current.secretRef === "" ||
                    current.secretRef === "OPENROUTER_API_KEY" ||
                    current.secretRef === "OPENAI_API_KEY" ||
                    current.secretRef === "COHERE_API_KEY" ||
                    current.secretRef === "MODEL_API_KEY"
                      ? provider.secretRef
                      : current.secretRef,
                }));
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="provider-secret">API key</FieldLabel>
            <Input
              id="provider-secret"
              type="password"
              value={draft.secretRef}
              placeholder="sk-or-v1-abc"
              onChange={(event) => update("secretRef", event.target.value)}
            />
            <p className="text-xs leading-5 text-[#6d685e] dark:text-[#aaa397]">
              Paste a raw key or use an environment variable name like
              OPENROUTER_API_KEY.
            </p>
          </Field>
        </FieldGroup>

        <div className="rounded-[18px] border border-[#d8d0c2]/80 bg-[#f8f3e9]/70 p-3 text-sm text-[#625d53] dark:border-[#38372f]/80 dark:bg-[#20201c]/70 dark:text-[#c5bcaf]">
          <div className="flex items-start gap-2">
            <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-[#2456e8] dark:text-[#7895ff]" />
            <p>
              AXIOM will register{" "}
              <span className="font-semibold text-[#191915] dark:text-[#f4efe5]">
                {draft.alias ||
                  buildModelAlias(draft.upstreamModelId, inferredCapability)}
              </span>{" "}
              as {formatCapability(draft.capability || inferredCapability)} via{" "}
              {draft.providerName || inferredProvider.providerName}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            {advancedOpen ? "Hide advanced details" : "Advanced details"}
          </Button>
          <label className="flex items-center gap-2 text-sm text-[#615b51] dark:text-[#c5bcaf]">
            <Checkbox
              checked={draft.activate}
              onCheckedChange={(checked) =>
                update("activate", checked === true)
              }
            />
            Activate after registration
          </label>
        </div>

        {advancedOpen && (
          <div className="grid gap-4 rounded-[18px] border border-[#d8d0c2]/80 bg-[#f8f3e9]/70 p-4 dark:border-[#38372f]/80 dark:bg-[#20201c]/70">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="model-alias">Alias</FieldLabel>
                <Input
                  id="model-alias"
                  value={draft.alias}
                  onChange={(event) => update("alias", event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="model-display-name">
                  Display name
                </FieldLabel>
                <Input
                  id="model-display-name"
                  value={draft.displayName}
                  onChange={(event) =>
                    update("displayName", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="model-capability">Type</FieldLabel>
                <Select
                  value={draft.capability}
                  onValueChange={(value) =>
                    update("capability", value as ModelCapability)
                  }
                >
                  <SelectTrigger id="model-capability" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelCapabilities.map((capability) => (
                      <SelectItem value={capability} key={capability}>
                        {formatCapability(capability)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="provider-name">Provider</FieldLabel>
                <Input
                  id="provider-name"
                  value={draft.providerName}
                  onChange={(event) =>
                    update("providerName", event.target.value)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="adapter-type">Adapter</FieldLabel>
                <Select
                  value={draft.adapterType}
                  onValueChange={(value) => update("adapterType", value ?? "")}
                >
                  <SelectTrigger id="adapter-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="openai_compatible">
                      OpenAI compatible
                    </SelectItem>
                    <SelectItem value="cohere_compatible">
                      Cohere compatible
                    </SelectItem>
                    <SelectItem value="fake">Fake</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Separator className="bg-[#d8d0c2]/85 dark:bg-white/10" />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="deployment-priority"
                label="Priority"
                value={draft.priority}
                onChange={(value) => update("priority", value)}
              />
              <NumberField
                id="deployment-weight"
                label="Weight"
                value={draft.weight}
                onChange={(value) => update("weight", value)}
              />
              <NumberField
                id="deployment-timeout"
                label="Timeout ms"
                value={draft.timeoutMs}
                onChange={(value) => update("timeoutMs", value)}
              />
              <NumberField
                id="deployment-attempts"
                label="Max attempts"
                value={draft.maxAttempts}
                onChange={(value) => update("maxAttempts", value)}
              />
            </div>
          </div>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={!valid || registering}
          onClick={() => onRegister(draft)}
        >
          {registering ? (
            <RefreshCwIcon className="animate-spin" data-icon="inline-start" />
          ) : (
            <RocketIcon data-icon="inline-start" />
          )}
          Register and sync
        </Button>
      </CardContent>
    </Card>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

function ProviderList({ providers }: { providers: ProviderView[] }) {
  return (
    <Card className="rounded-[24px] border-[#d8d0c2]/85 bg-[#fffdf8]/86 shadow-[0_18px_54px_rgba(24,24,18,0.06)] dark:border-[#38372f]/85 dark:bg-[#1a1a17]/86">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center gap-3">
          <ServerCogIcon className="size-5 text-[#2456e8] dark:text-[#7895ff]" />
          <h2 className="text-lg font-semibold">Providers</h2>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 px-5 pb-5">
        {providers.length > 0 ? (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-2xl border border-[#d8d0c2]/75 bg-[#fffdf8]/70 p-3 dark:border-[#38372f]/75 dark:bg-[#20201c]/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{provider.name}</strong>
                <StatusBadge status={provider.status} />
              </div>
              <p className="mt-1 truncate text-xs text-[#6d685e] dark:text-[#aaa397]">
                {provider.adapter_type} · {provider.base_url}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[#d8d0c2] px-4 py-5 text-sm text-[#6d685e] dark:border-[#38372f] dark:text-[#aaa397]">
            No providers registered.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ModelInventory({
  models,
  selectedModel,
  deployments,
  actionBusy,
  onSelect,
  onActivateModel,
  onActivateDeployment,
}: {
  models: LogicalModelView[];
  selectedModel: LogicalModelView | null;
  deployments: DeploymentView[];
  actionBusy: string | null;
  onSelect: (modelId: string) => void;
  onActivateModel: (model: LogicalModelView) => void;
  onActivateDeployment: (deployment: DeploymentView) => void;
}) {
  return (
    <Card className="rounded-[24px] border-[#d8d0c2]/85 bg-[#fffdf8]/88 shadow-[0_18px_54px_rgba(24,24,18,0.07)] dark:border-[#38372f]/85 dark:bg-[#1a1a17]/88">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CpuIcon className="size-5 text-[#2456e8] dark:text-[#7895ff]" />
              <h2 className="text-lg font-semibold">Model registry</h2>
            </div>
            <p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">
              Select a model to inspect deployments and run a smoke test.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">
          {models.length > 0 ? (
            models.map((model) => (
              <button
                key={model.id}
                type="button"
                className={cn(
                  "rounded-2xl border p-3 text-left transition-colors",
                  selectedModel?.id === model.id
                    ? "border-[#2456e8]/30 bg-[#edf2ff] dark:border-[#7895ff]/25 dark:bg-[#7895ff]/10"
                    : "border-[#d8d0c2]/75 bg-[#fffdf8]/65 hover:bg-white dark:border-[#38372f]/75 dark:bg-[#20201c]/55 dark:hover:bg-[#252520]",
                )}
                onClick={() => onSelect(model.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="min-w-0 truncate text-sm">
                    {model.alias}
                  </strong>
                  <StatusBadge status={model.status} />
                </div>
                <p className="mt-1 text-xs text-[#6d685e] dark:text-[#aaa397]">
                  {formatCapability(model.capability)} · rev {model.revision}
                </p>
              </button>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[#d8d0c2] px-4 py-8 text-center text-sm text-[#6d685e] dark:border-[#38372f] dark:text-[#aaa397]">
              No models match this filter.
            </p>
          )}
        </div>

        <div className="rounded-[20px] border border-[#d8d0c2]/80 bg-[#f8f3e9]/64 p-4 dark:border-[#38372f]/80 dark:bg-[#20201c]/64">
          {selectedModel ? (
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold">
                    {selectedModel.display_name}
                  </h3>
                  <p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">
                    {selectedModel.alias}
                  </p>
                </div>
                {selectedModel.status !== "active" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={actionBusy === selectedModel.id}
                    onClick={() => onActivateModel(selectedModel)}
                  >
                    {actionBusy === selectedModel.id && (
                      <RefreshCwIcon
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    )}
                    Activate model
                  </Button>
                )}
              </div>
              <Separator className="bg-[#d8d0c2]/85 dark:bg-white/10" />
              <div className="grid gap-2">
                <h4 className="text-sm font-semibold">Deployments</h4>
                {deployments.length > 0 ? (
                  deployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className="rounded-2xl border border-[#d8d0c2]/80 bg-[#fffdf8]/75 p-3 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/70"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <strong className="block truncate text-sm">
                            {deployment.upstream_model_id}
                          </strong>
                          <p className="mt-1 text-xs text-[#6d685e] dark:text-[#aaa397]">
                            priority {deployment.priority} · attempts{" "}
                            {deployment.max_attempts}
                          </p>
                        </div>
                        <StatusBadge status={deployment.status} />
                      </div>
                      {deployment.status !== "active" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          disabled={actionBusy === deployment.id}
                          onClick={() => onActivateDeployment(deployment)}
                        >
                          {actionBusy === deployment.id && (
                            <RefreshCwIcon
                              className="animate-spin"
                              data-icon="inline-start"
                            />
                          )}
                          Activate deployment
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-[#d8d0c2] px-4 py-5 text-sm text-[#6d685e] dark:border-[#38372f] dark:text-[#aaa397]">
                    No deployments found for this model.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-[#6d685e] dark:text-[#aaa397]">
              Select a registered model.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ModelTestPanel({
  selectedModel,
  testing,
  result,
  onTest,
}: {
  selectedModel: LogicalModelView | null;
  testing: boolean;
  result: ModelTestResult | null;
  onTest: () => void;
}) {
  return (
    <Card className="rounded-[24px] border-[#d8d0c2]/85 bg-[#fffdf8]/88 shadow-[0_18px_54px_rgba(24,24,18,0.07)] dark:border-[#38372f]/85 dark:bg-[#1a1a17]/88">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#d8d0c2] bg-[#f4efe5] text-[#2456e8] dark:border-[#38372f] dark:bg-[#252520] dark:text-[#7895ff]">
            <PlayIcon className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Smoke test</h2>
            <p className="mt-1 text-sm leading-6 text-[#6d685e] dark:text-[#aaa397]">
              Send a small inference request through the selected active alias.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5">
        <Button
          type="button"
          disabled={!selectedModel || testing}
          onClick={onTest}
        >
          {testing ? (
            <RefreshCwIcon className="animate-spin" data-icon="inline-start" />
          ) : (
            <PlayIcon data-icon="inline-start" />
          )}
          Test selected model
        </Button>
        <Textarea
          readOnly
          value={
            selectedModel
              ? `${selectedModel.alias} · ${formatCapability(selectedModel.capability)} · ${selectedModel.status}`
              : "No model selected."
          }
          className="min-h-20 resize-none font-mono text-xs"
          aria-label="Selected model summary"
        />
        {result && (
          <Alert
            variant={result.status === "error" ? "destructive" : "default"}
            className={cn(
              "rounded-[18px]",
              result.status === "success" &&
                "border-emerald-200 bg-emerald-50/90 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100",
            )}
          >
            {result.status === "success" ? (
              <CheckCircle2Icon />
            ) : (
              <XCircleIcon />
            )}
            <AlertTitle>{result.title}</AlertTitle>
            <AlertDescription>
              {result.detail}
              {result.traceId ? ` Trace ${result.traceId}.` : ""}
              {result.latencyMs ? ` Client ${result.latencyMs} ms.` : ""}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function RegistrySkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-24 rounded-[20px]" />
      <Skeleton className="h-40 rounded-[20px]" />
      <Skeleton className="h-40 rounded-[20px]" />
    </div>
  );
}

function formatCapability(capability: ModelCapability) {
  if (capability === "llm") return "LLM";
  if (capability === "vlm") return "VLM";
  if (capability === "reranker") return "Reranker";
  return "Embedding";
}

export function ModelSettingsPage() {
  const [capability, setCapability] = useState<ModelCapability | undefined>();
  const registry = useModelRegistry(capability);
  const [registering, setRegistering] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null);
  const [registrationResult, setRegistrationResult] = useState<string | null>(
    null,
  );

  const activeModelCount = registry.models.filter(
    (model) => model.status === "active",
  ).length;
  const openrouterEmbedding = registry.models.find(
    (model) => model.alias === "openrouter-embedding",
  );
  const healthDetail = openrouterEmbedding
    ? openrouterEmbedding.status === "active"
      ? "The default Methods-Hub embedding alias is active."
      : "The default Methods-Hub embedding alias exists but is not active."
    : "The default Methods-Hub embedding alias is not registered.";

  const providerMap = useMemo(
    () =>
      new Map(
        registry.providers.map((provider) => [provider.id, provider.name]),
      ),
    [registry.providers],
  );

  async function handleRegister(draft: RegistrationDraft) {
    setRegistering(true);
    setRegistrationResult(null);
    setTestResult(null);
    try {
      const response = await registerModel(registrationToRequest(draft));
      setRegistrationResult(
        `${response.model.alias} is ${response.model.status}; deployment ${response.deployment.status}.`,
      );
      await registry.refresh();
    } catch (error) {
      setRegistrationResult(
        error instanceof Error ? error.message : "Unable to register model.",
      );
    } finally {
      setRegistering(false);
    }
  }

  async function handleActivateModel(model: LogicalModelView) {
    setActionBusy(model.id);
    try {
      await activateModel(model.id);
      await registry.refresh();
    } finally {
      setActionBusy(null);
    }
  }

  async function handleActivateDeployment(deployment: DeploymentView) {
    setActionBusy(deployment.id);
    try {
      await activateDeployment(deployment.model_id, deployment.id);
      await registry.refreshDeployments(deployment.model_id);
      await registry.refresh();
    } finally {
      setActionBusy(null);
    }
  }

  async function handleTest() {
    if (!registry.selectedModel) return;
    setTesting(true);
    const result = await testModel(registry.selectedModel);
    setTestResult(result);
    setTesting(false);
  }

  return (
    <section
      className="relative min-h-screen w-full overflow-x-hidden px-5 pb-12 pt-20 sm:px-8 md:pt-10"
      aria-label="Model settings"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[430px] bg-[radial-gradient(circle_at_80%_5%,rgba(36,86,232,0.11),transparent_34%)] dark:bg-[radial-gradient(circle_at_78%_5%,rgba(120,149,255,0.11),transparent_34%)]"
        aria-hidden="true"
      />
      <div className="mx-auto grid w-full max-w-[1440px] gap-8">
        <header className="rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/88 p-5 shadow-[0_18px_54px_rgba(24,24,18,0.07)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-end">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-6 rounded-full border-[#2456e8]/30 bg-[#edf2ff] px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#1237b4] dark:border-[#7895ff]/30 dark:bg-[#7895ff]/12 dark:text-[#bcc9ff]"
                >
                  Settings
                </Badge>
                <Badge
                  variant="outline"
                  className="h-6 rounded-full border-[#d8d0c2] bg-[#fffdf8]/70 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#625d53] dark:border-[#38372f] dark:bg-white/5 dark:text-[#c5bcaf]"
                >
                  {modelServiceApiBaseUrl}
                </Badge>
              </div>
              <h1 className="max-w-4xl text-[clamp(2.25rem,4vw,4.8rem)] font-semibold leading-[0.96] tracking-normal text-[#191915] dark:text-[#f4efe5]">
                Configure the model gateway AXIOM depends on.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#625d53] dark:text-[#aaa397]">
                Register active aliases, inspect deployments, and run direct
                inference checks before workflows call Methods-Hub or the
                intelligence gateway.
              </p>
            </div>
            <Alert
              className={cn(
                "rounded-[20px] border-[#d8d0c2]/85 bg-[#fffdf8]/80 dark:border-[#38372f]/85 dark:bg-[#20201c]/70",
                openrouterEmbedding?.status !== "active" &&
                  "border-amber-300/80 bg-amber-50/85 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100",
              )}
            >
              {openrouterEmbedding?.status === "active" ? (
                <ShieldCheckIcon />
              ) : (
                <AlertTriangleIcon />
              )}
              <AlertTitle>Default embedding alias</AlertTitle>
              <AlertDescription>{healthDetail}</AlertDescription>
              <AlertAction className="top-1/2 flex -translate-y-1/2 items-center">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={registry.loading}
                  onClick={() => void registry.refresh()}
                >
                  <RefreshCwIcon
                    className={registry.loading ? "animate-spin" : ""}
                  />
                  Refresh
                </Button>
              </AlertAction>
            </Alert>
          </div>
        </header>

        <div className="grid grid-flow-dense gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <PageMetric
              icon={ServerCogIcon}
              label="Providers"
              value={registry.providers.length}
              detail="Provider connections available for deployments."
            />
          </div>
          <div className="md:col-span-3">
            <PageMetric
              icon={CpuIcon}
              label="Models"
              value={registry.models.length}
              detail="Aliases registered in Model Service."
            />
          </div>
          <div className="md:col-span-3">
            <PageMetric
              icon={ActivityIcon}
              label="Active"
              value={activeModelCount}
              detail="Aliases ready for inference routing."
            />
          </div>
        </div>

        {registry.error && (
          <Alert variant="destructive" className="rounded-[18px]">
            <AlertTriangleIcon />
            <AlertTitle>Model Service is unavailable</AlertTitle>
            <AlertDescription>{registry.error}</AlertDescription>
            <AlertAction className="top-1/2 flex -translate-y-1/2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void registry.refresh()}
              >
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="grid content-start gap-6">
            <ModelRegistrationPanel
              registering={registering}
              onRegister={handleRegister}
            />
            {registrationResult && (
              <Alert className="rounded-[18px]">
                <DatabaseZapIcon />
                <AlertTitle>Registration result</AlertTitle>
                <AlertDescription>{registrationResult}</AlertDescription>
              </Alert>
            )}
            <ProviderList providers={registry.providers} />
          </div>

          <div className="grid content-start gap-6">
            <div className="flex flex-col gap-3 rounded-[20px] border border-[#d8d0c2]/80 bg-[#fffdf8]/74 p-4 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/74 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Registry filter</p>
                <p className="mt-1 text-sm text-[#6d685e] dark:text-[#aaa397]">
                  Narrow by capability when checking a specific route.
                </p>
              </div>
              <Select
                value={capability ?? "all"}
                onValueChange={(value) =>
                  setCapability(
                    value === "all" ? undefined : (value as ModelCapability),
                  )
                }
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All capabilities</SelectItem>
                  {modelCapabilities.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatCapability(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {registry.loading && registry.models.length === 0 ? (
              <RegistrySkeleton />
            ) : (
              <ModelInventory
                models={registry.models}
                selectedModel={registry.selectedModel}
                deployments={registry.selectedDeployments}
                actionBusy={actionBusy}
                onSelect={registry.setSelectedModelId}
                onActivateModel={(model) => void handleActivateModel(model)}
                onActivateDeployment={(deployment) =>
                  void handleActivateDeployment(deployment)
                }
              />
            )}

            {registry.selectedModel && (
              <div className="rounded-[20px] border border-[#d8d0c2]/80 bg-[#fffdf8]/65 p-4 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/65">
                <p className="text-sm font-semibold">Deployment providers</p>
                <p className="mt-2 text-sm leading-6 text-[#6d685e] dark:text-[#aaa397]">
                  {registry.selectedDeployments.length
                    ? registry.selectedDeployments
                        .map(
                          (deployment) =>
                            `${deployment.upstream_model_id} via ${providerMap.get(deployment.provider_id) ?? deployment.provider_id}`,
                        )
                        .join("; ")
                    : "No deployment provider is available for the selected model."}
                </p>
              </div>
            )}

            <ModelTestPanel
              selectedModel={registry.selectedModel}
              testing={testing}
              result={testResult}
              onTest={() => void handleTest()}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
