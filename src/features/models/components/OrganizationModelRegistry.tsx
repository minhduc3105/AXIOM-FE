import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Building2Icon,
  CircleAlertIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { getProviderReadiness, type ReadinessLevel } from "../model/readiness";
import {
  normalizeProviderId,
  parseModelCapability,
  parseProviderProtocol,
  parseProviderSource,
} from "../model/registryForm";
import type {
  ModelCapability,
  ProviderCatalogItem,
  ProviderModelView,
  ProviderView,
} from "../model/registryTypes";
import { useModelRegistry } from "../model/useModelRegistry";
import { ModelServiceAssignments } from "./ModelServiceAssignments";
import {
  ModelServiceAssignmentPickerDialog,
  ModelServiceCredentialDialog,
  ModelServiceModelDialog,
  ModelServiceConfirmationDialog,
  ModelServiceProviderDialog,
  ModelServiceSwitchReviewDialog,
} from "./ModelServiceDialogs";
import { ModelServiceProviders } from "./ModelServiceProviders";
import {
  ModelServiceSetupNotice,
  ModelServiceSetupPipeline,
} from "./ModelServiceSetupPipeline";
import type { ModelOption } from "./modelServiceTypes";
import {
  capabilityLabel,
  modelServiceSurface,
  readinessBadgeClass,
} from "./modelServiceUi";

type View = "assignments" | "providers";
type DialogMode = "provider" | "model" | "credential" | null;
type PendingConfirmation =
  | { type: "delete-provider"; provider: ProviderView }
  | { type: "disable-provider"; provider: ProviderView }
  | { type: "delete-model"; model: ProviderModelView }
  | { type: "disable-model"; model: ProviderModelView };
type TestTarget =
  | { kind: "provider"; id: string }
  | { kind: "model"; id: string };

export function OrganizationModelRegistry({ user }: { user: AuthUser }) {
  const canManage = user.org_role === "org_admin";
  const context = useMemo<ModelRegistryContext>(
    () => ({
      userId: user.id,
      organizationId: user.organization_id,
      orgRole: user.org_role,
    }),
    [user],
  );
  const registry = useModelRegistry(context);
  const [view, setView] = useState<View>("assignments");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [editingProvider, setEditingProvider] = useState<ProviderView | null>(
    null,
  );
  const [editingModel, setEditingModel] = useState<ProviderModelView | null>(
    null,
  );
  const [newModelProviderId, setNewModelProviderId] = useState<string | null>(
    null,
  );
  const [pendingCapability, setPendingCapability] =
    useState<ModelCapability>("llm");
  const [assignmentPicker, setAssignmentPicker] =
    useState<ModelCapability | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<ModelOption | null>(null);
  const [catalog, setCatalog] = useState<ProviderCatalogItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [testingTarget, setTestingTarget] = useState<TestTarget | null>(null);
  const [testFailureByTarget, setTestFailureByTarget] = useState<
    Record<string, string>
  >({});
  const [setupPipelineOpen, setSetupPipelineOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  const modelOptions = useMemo<ModelOption[]>(
    () =>
      registry.providers.flatMap((provider) =>
        (registry.modelsByProvider[provider.id] ?? []).map((model) => ({
          model,
          provider,
        })),
      ),
    [registry.modelsByProvider, registry.providers],
  );
  const assignmentOptions = canManage
    ? modelOptions.filter((option) => option.provider.scope === "organization")
    : modelOptions.filter((option) => option.model.is_default);
  const selectedProvider =
    registry.providers.find((provider) => provider.id === selectedProviderId) ??
    registry.providers[0] ??
    null;
  const systemStatus: { label: string; level: ReadinessLevel } =
    registry.isInitialLoading
      ? { label: "Refreshing", level: "testing" }
      : registry.error
        ? { label: "Registry unavailable", level: "failed" }
        : !registry.providers.length
          ? { label: "No providers", level: "not_configured" }
          : registry.providers.length &&
              registry.providers.every(
                (provider) => getProviderReadiness(provider).level === "ready",
              )
            ? { label: "Operational", level: "ready" }
            : { label: "Readiness review", level: "unknown" };

  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController();
    listProviderCatalog(context, controller.signal)
      .then(setCatalog)
      .catch(() => setCatalog([]));
    return () => controller.abort();
  }, [canManage, context]);

  async function runAction(
    action: () => Promise<unknown>,
    success: string,
    closeDialog = false,
  ) {
    if (busy) return false;
    if (!canManage) {
      toast.error(
        "Only organization admins can change Model Service configuration.",
      );
      return false;
    }
    setBusy(true);
    try {
      await action();
      toast.success(success);
      if (closeDialog) setDialogMode(null);
      await registry.refresh();
      return true;
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Model registry action failed.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  function clearTestFailure(target: string) {
    setTestFailureByTarget((current) => {
      const next = { ...current };
      delete next[target];
      return next;
    });
  }

  async function runProviderTest(provider: ProviderView) {
    if (busy || !canManage) return;
    const target = `provider:${provider.id}`;
    setBusy(true);
    setTestingTarget({ kind: "provider", id: provider.id });
    clearTestFailure(target);
    try {
      const updated = await testProvider(context, provider.id);
      registry.replaceProvider(updated);
      toast.success(`${provider.display_name} connection is available.`);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "The connection test could not be completed.";
      registry.replaceProvider({
        ...provider,
        connection_status: "unavailable",
        updated_at: new Date().toISOString(),
      });
      setTestFailureByTarget((current) => ({ ...current, [target]: message }));
      toast.error(message);
    } finally {
      setTestingTarget(null);
      setBusy(false);
    }
  }

  async function runModelTest(model: ProviderModelView) {
    if (busy || !canManage) return;
    const target = `model:${model.resource_id}`;
    setBusy(true);
    setTestingTarget({ kind: "model", id: model.resource_id });
    clearTestFailure(target);
    try {
      const updated = await testProviderModel(context, model.resource_id);
      registry.replaceModel(updated);
      toast.success(`${model.name} is validated.`);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "The model test could not be completed.";
      registry.replaceModel({
        ...model,
        connection_status: "unavailable",
        updated_at: new Date().toISOString(),
      });
      setTestFailureByTarget((current) => ({ ...current, [target]: message }));
      toast.error(message);
    } finally {
      setTestingTarget(null);
      setBusy(false);
    }
  }

  function openProviderDialog(provider?: ProviderView) {
    if (!canManage) return;
    setEditingProvider(provider ?? null);
    setDialogMode("provider");
  }

  function openModelDialog(
    model?: ProviderModelView,
    capability?: ModelCapability,
    providerId?: string,
  ) {
    if (!canManage) return;
    setEditingModel(model ?? null);
    setNewModelProviderId(model ? null : (providerId ?? null));
    setPendingCapability(model?.capability ?? capability ?? "llm");
    setDialogMode("model");
  }

  async function submitProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      id: String(form.get("provider-id") ?? "").trim(),
      display_name: String(form.get("provider-name") ?? "").trim(),
      source: parseProviderSource(form.get("provider-source")),
      base_url: String(form.get("provider-url") ?? "").trim(),
      protocol: parseProviderProtocol(form.get("provider-protocol")),
    };
    if (
      !input.display_name ||
      !input.base_url ||
      (!editingProvider && !input.id)
    )
      return;
    let createdProviderId: string | null = null;
    const success = await runAction(
      async () => {
        if (editingProvider)
          return updateProvider(context, editingProvider.id, input);
        const created = await createProvider(context, input);
        createdProviderId = created.id;
        return created;
      },
      editingProvider
        ? "Provider updated."
        : "Provider added. Add and validate its models next.",
      true,
    );
    if (success && createdProviderId) {
      setSelectedProviderId(createdProviderId);
      setSetupPipelineOpen(true);
    }
  }

  async function submitCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const apiKey = String(
      new FormData(event.currentTarget).get("api-key") ?? "",
    ).trim();
    if (!selectedProvider || !apiKey) return;
    if (selectedProvider.scope !== "organization") {
      toast.error(
        "Platform providers are read-only. Create an organization provider before storing a credential.",
      );
      setDialogMode(null);
      return;
    }
    const success = await runAction(
      () => upsertProviderCredential(context, selectedProvider.id, apiKey),
      "Credential stored securely.",
      true,
    );
    if (success) setSetupPipelineOpen(true);
  }

  async function submitModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("model-name") ?? "").trim();
    const modelId = String(form.get("model-id") ?? "").trim();
    if (!name || (!editingModel && !modelId)) return;
    const input = {
      name,
      capability: parseModelCapability(form.get("model-capability")),
      max_tokens: Number(form.get("max-tokens")) || undefined,
      max_context_length: Number(form.get("context-length")) || undefined,
    };
    if (editingModel) {
      await runAction(
        () => updateProviderModel(context, editingModel.resource_id, input),
        "Model updated.",
        true,
      );
      return;
    }
    if (newModelProviderId) {
      const success = await runAction(
        () =>
          createProviderModel(context, newModelProviderId, {
            model_id: modelId,
            ...input,
          }),
        "Model registered. Test it before routing production work.",
        true,
      );
      if (success) setSetupPipelineOpen(true);
      return;
    }
    const connectionName = String(form.get("connection-name") ?? "").trim();
    const connectionUrl = String(form.get("connection-url") ?? "").trim();
    const connectionId = normalizeProviderId(`${connectionName}-${modelId}`);
    if (!connectionName || !connectionUrl || !connectionId) return;
    await runAction(
      async () => {
        const provider = await createProvider(context, {
          id: connectionId,
          display_name: connectionName,
          source: parseProviderSource(form.get("connection-source")),
          base_url: connectionUrl,
          protocol: parseProviderProtocol(form.get("connection-protocol")),
          status: "inactive",
        });
        const apiKey = String(form.get("api-key") ?? "").trim();
        if (apiKey)
          await upsertProviderCredential(context, provider.id, apiKey);
        return createProviderModel(context, provider.id, {
          model_id: modelId,
          ...input,
        });
      },
      "Model registered. Test it before routing production work.",
      true,
    );
  }

  async function confirmSwitch() {
    if (!pendingSwitch) return;
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

  async function confirmPendingAction() {
    if (!pendingConfirmation) return;
    const pending = pendingConfirmation;
    const success =
      pending.type === "delete-provider"
        ? await runAction(
            () => deleteProvider(context, pending.provider.id),
            "Provider deleted.",
          )
        : pending.type === "disable-provider"
          ? await runAction(
              () =>
                updateProvider(context, pending.provider.id, {
                  status: "inactive",
                }),
              `${pending.provider.display_name} deactivated.`,
            )
          : pending.type === "delete-model"
            ? await runAction(
                () => deleteProviderModel(context, pending.model.resource_id),
                "Model deleted.",
              )
            : await runAction(
                () =>
                  updateProviderModel(context, pending.model.resource_id, {
                    status: "inactive",
                  }),
                `${pending.model.name} deactivated.`,
              );
    if (success) setPendingConfirmation(null);
  }

  const confirmationCopy =
    pendingConfirmation?.type === "delete-provider"
      ? {
          title: `Delete ${pendingConfirmation.provider.display_name}?`,
          description:
            "This permanently deletes the provider, its stored credential, and all models attached to it.",
          confirmLabel: "Delete provider",
          destructive: true,
        }
      : pendingConfirmation?.type === "disable-provider"
        ? {
            title: `Deactivate ${pendingConfirmation.provider.display_name}?`,
            description:
              "This provider and its models will no longer be available for inference until it is activated again.",
            confirmLabel: "Deactivate provider",
          }
        : pendingConfirmation?.type === "delete-model"
          ? {
              title: `Delete ${pendingConfirmation.model.name}?`,
              description:
                "This permanently removes the model from this organization. It cannot be selected as a default afterwards.",
              confirmLabel: "Delete model",
              destructive: true,
            }
          : pendingConfirmation?.type === "disable-model"
            ? {
                title: `Deactivate ${pendingConfirmation.model.name}?`,
                description:
                  "This model will no longer be eligible as a default until it is activated again.",
                confirmLabel: "Deactivate model",
              }
            : null;

  return (
    <section className="grid gap-4" aria-labelledby="model-service-title">
      <Card className={cn(modelServiceSurface, "rounded-lg shadow-none")}>
        <header className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <p
                id="model-service-title"
                className="text-sm font-semibold text-foreground"
              >
                Organization model registry
              </p>
              <Badge variant="outline" className="max-w-full">
                <Building2Icon className="size-3.5 shrink-0" />
                <span className="truncate">
                  Organization · {user.organization_id}
                </span>
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs uppercase tracking-wide",
                  readinessBadgeClass(systemStatus.level),
                )}
              >
                {systemStatus.label}
              </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void registry.refresh()}
              disabled={registry.loading}
            >
              <RefreshCwIcon
                className={cn(registry.loading && "animate-spin")}
              />{" "}
              Refresh
            </Button>
            {canManage && (
              <Button onClick={() => openProviderDialog()}>Add provider</Button>
            )}
          </div>
        </header>
      </Card>
      {!canManage && (
        <Alert>
          <ShieldAlertIcon />
          <AlertTitle>Read-only Model Service access</AlertTitle>
          <AlertDescription>
            You can view available models and current assignments. Provider
            configuration, credentials, testing, and model changes require an
            organization admin.
          </AlertDescription>
        </Alert>
      )}
      {registry.error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Model registry unavailable</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{registry.error.message}</span>
            {registry.error.retryable && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void registry.refresh()}
              >
                <RefreshCwIcon /> Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {Object.keys(registry.modelLoadErrors).length > 0 && (
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>Partial model inventory</AlertTitle>
          <AlertDescription>
            Some provider model inventories could not be loaded. Provider
            connections and any previously loaded models remain available.
          </AlertDescription>
        </Alert>
      )}
      <ModelServiceSetupNotice
        provider={selectedProvider}
        models={
          selectedProvider
            ? (registry.modelsByProvider[selectedProvider.id] ?? [])
            : []
        }
        canManage={canManage}
        onOpen={() => setSetupPipelineOpen(true)}
      />
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as View)}
        className={cn(
          modelServiceSurface,
          "gap-0 overflow-hidden rounded-[28px]",
        )}
      >
        <div className="overflow-x-auto border-b p-2 sm:px-5">
          <TabsList className="min-w-max">
            <TabsTrigger value="assignments" className="shrink-0">
              Assignments
            </TabsTrigger>
            <TabsTrigger value="providers" className="shrink-0">
              Providers{" "}
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {registry.providers.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="assignments" className="m-0">
          <ModelServiceAssignments
            organizationId={user.organization_id}
            options={assignmentOptions}
            initialLoading={registry.isInitialLoading}
            updating={registry.isRefreshing}
            error={registry.error}
            canManage={canManage}
            onChoose={setAssignmentPicker}
            onAddModel={(capability) => openModelDialog(undefined, capability)}
            onRetry={() => void registry.refresh()}
          />
        </TabsContent>
        <TabsContent value="providers" className="m-0">
          <ModelServiceProviders
            provider={selectedProvider}
            providers={registry.providers}
            models={
              selectedProvider
                ? (registry.modelsByProvider[selectedProvider.id] ?? [])
                : []
            }
            initialLoading={registry.isInitialLoading}
            updating={registry.isRefreshing}
            error={registry.error}
            modelLoadError={
              selectedProvider
                ? (registry.modelLoadErrors[selectedProvider.id] ?? null)
                : null
            }
            onRetry={() => void registry.refresh()}
            busy={busy}
            canManage={canManage}
            testingProviderId={
              testingTarget?.kind === "provider" ? testingTarget.id : null
            }
            testingModelResourceId={
              testingTarget?.kind === "model" ? testingTarget.id : null
            }
            testFailureByTarget={testFailureByTarget}
            onSelect={setSelectedProviderId}
            onAddProvider={() => openProviderDialog()}
            onAddModel={() =>
              selectedProvider &&
              openModelDialog(undefined, "llm", selectedProvider.id)
            }
            onCredential={() => setDialogMode("credential")}
            onEditProvider={() =>
              selectedProvider && openProviderDialog(selectedProvider)
            }
            onTestProvider={() =>
              selectedProvider && void runProviderTest(selectedProvider)
            }
            onToggleProvider={() =>
              selectedProvider &&
              (selectedProvider.status === "active"
                ? setPendingConfirmation({
                    type: "disable-provider",
                    provider: selectedProvider,
                  })
                : void runAction(
                    () =>
                      updateProvider(context, selectedProvider.id, {
                        status: "active",
                      }),
                    `${selectedProvider.display_name} activated.`,
                  ))
            }
            onDeleteProvider={() =>
              selectedProvider &&
              setPendingConfirmation({
                type: "delete-provider",
                provider: selectedProvider,
              })
            }
            onEditModel={(model) => openModelDialog(model)}
            onTestModel={(model) => void runModelTest(model)}
            onToggleModel={(model) =>
              model.status === "active"
                ? setPendingConfirmation({ type: "disable-model", model })
                : void runAction(
                    () =>
                      updateProviderModel(context, model.resource_id, {
                        status: "active",
                      }),
                    `${model.name} activated.`,
                  )
            }
            onDeleteModel={(model) =>
              setPendingConfirmation({ type: "delete-model", model })
            }
          />
        </TabsContent>
      </Tabs>
      {canManage && (
        <>
          <ModelServiceProviderDialog
            open={dialogMode === "provider"}
            editingProvider={editingProvider}
            catalog={catalog}
            busy={busy}
            onOpenChange={(open) => !open && setDialogMode(null)}
            onSubmit={submitProvider}
          />
          <ModelServiceCredentialDialog
            open={dialogMode === "credential"}
            provider={selectedProvider}
            busy={busy}
            onOpenChange={(open) => !open && setDialogMode(null)}
            onSubmit={submitCredential}
          />
          <ModelServiceModelDialog
            open={dialogMode === "model"}
            model={editingModel}
            provider={
              newModelProviderId
                ? (registry.providers.find(
                    (provider) => provider.id === newModelProviderId,
                  ) ?? null)
                : null
            }
            capability={pendingCapability}
            busy={busy}
            onOpenChange={(open) => !open && setDialogMode(null)}
            onSubmit={submitModel}
          />
          <ModelServiceSwitchReviewDialog
            option={pendingSwitch}
            currentDefault={
              pendingSwitch
                ? (modelOptions.find(
                    (option) =>
                      option.provider.id === pendingSwitch.provider.id &&
                      option.model.capability ===
                        pendingSwitch.model.capability &&
                      option.model.is_default,
                  ) ?? null)
                : null
            }
            busy={busy}
            onOpenChange={(open) => !open && setPendingSwitch(null)}
            onConfirm={() => void confirmSwitch()}
          />
          <ModelServiceAssignmentPickerDialog
            capability={assignmentPicker}
            options={assignmentOptions}
            onOpenChange={(open) => !open && setAssignmentPicker(null)}
            onSelect={(option) => {
              setAssignmentPicker(null);
              setPendingSwitch(option);
            }}
          />
          <ModelServiceConfirmationDialog
            confirmation={confirmationCopy}
            busy={busy}
            onOpenChange={(open) => !open && setPendingConfirmation(null)}
            onConfirm={() => void confirmPendingAction()}
          />
        </>
      )}
      <ModelServiceSetupPipeline
        open={setupPipelineOpen}
        provider={selectedProvider}
        models={
          selectedProvider
            ? (registry.modelsByProvider[selectedProvider.id] ?? [])
            : []
        }
        busy={busy}
        onOpenChange={setSetupPipelineOpen}
        onAddProvider={() => {
          setSetupPipelineOpen(false);
          openProviderDialog();
        }}
        onCredential={() => {
          setSetupPipelineOpen(false);
          setDialogMode("credential");
        }}
        onTestConnection={() =>
          selectedProvider && void runProviderTest(selectedProvider)
        }
        onAddModel={() => {
          setSetupPipelineOpen(false);
          selectedProvider &&
            openModelDialog(undefined, "llm", selectedProvider.id);
        }}
        onAssignDefault={() => {
          setSetupPipelineOpen(false);
          setView("assignments");
        }}
      />
    </section>
  );
}
