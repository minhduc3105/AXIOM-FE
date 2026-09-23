import { useMemo, useState, type FormEvent } from "react";
import {
  CircleAlertIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuthUser } from "@/features/auth/model/types";
import { cn } from "@/shared/lib/utils";
import {
  createProvider,
  createProviderModel,
  discoverProviderModels,
  deleteProvider,
  deleteProviderModel,
  testProvider,
  testProviderModel,
  updateProvider,
  updateProviderModel,
  upsertProviderCredential,
  type ModelRegistryContext,
} from "../api/modelServiceApi";
import {
  modelMetadataFromCandidate,
  parseModelCapability,
} from "../model/registryForm";
import type {
  ModelCapability,
  ProviderModelView,
  ProviderView,
} from "../model/registryTypes";
import { useModelRegistry } from "../model/useModelRegistry";
import { useConsumerModelProfiles } from "../model/useConsumerModelProfiles";
import { ConsumerModelProfiles } from "./ConsumerModelProfiles";
import {
  ModelServiceCredentialDialog,
  ModelServiceModelDialog,
  ModelServiceConfirmationDialog,
  ModelServiceProviderDialog,
} from "./ModelServiceDialogs";
import { ModelServiceProviders } from "./ModelServiceProviders";
import type { ModelOption } from "./modelServiceTypes";
import {
  modelServiceSurface,
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
  const consumerProfiles = useConsumerModelProfiles(context);
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
  const [busy, setBusy] = useState(false);
  const [testingTarget, setTestingTarget] = useState<TestTarget | null>(null);
  const [testFailureByTarget, setTestFailureByTarget] = useState<
    Record<string, string>
  >({});
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
  const selectedProvider =
    registry.providers.find((provider) => provider.id === selectedProviderId) ??
    registry.providers[0] ??
    null;
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
      await consumerProfiles.refresh();
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

  async function runModelDiscovery() {
    if (!selectedProvider || busy || !canManage) return;
    await runAction(
      () => discoverProviderModels(context, selectedProvider.id),
      `Model candidates refreshed for ${selectedProvider.display_name}.`,
    );
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
    const displayName = String(form.get("provider-name") ?? "").trim();
    const baseUrl = String(form.get("provider-url") ?? "").trim();
    const apiKey = String(form.get("provider-api-key") ?? "").trim();
    if (!displayName || !baseUrl || (!editingProvider && !apiKey)) return;
    let createdProviderId: string | null = null;
    const success = await runAction(
      async () => {
        if (editingProvider)
          return updateProvider(context, editingProvider.id, {
            display_name: displayName,
            base_url: baseUrl,
          });
        const created = await createProvider(context, {
          display_name: displayName,
          base_url: baseUrl,
          api_key: apiKey,
          status: "active",
        });
        createdProviderId = created.id;
        return created;
      },
      editingProvider
        ? "Provider updated."
        : "Provider added. Manage its models from the provider detail.",
      true,
    );
    if (success && createdProviderId) {
      setSelectedProviderId(createdProviderId);
      setView("providers");
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
    await runAction(
      () => upsertProviderCredential(context, selectedProvider.id, apiKey),
      "Credential stored securely.",
      true,
    );
  }

  async function submitModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const modelName = String(form.get("model-name") ?? "").trim();
    if (!modelName) return;
    const input = {
      name: modelName,
      capability: parseModelCapability(form.get("model-capability")),
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
      const candidate = registry.providers
        .find((provider) => provider.id === newModelProviderId)
        ?.discovered_models.find((item) => item.model_id === modelName);
      await runAction(
        () =>
          createProviderModel(context, newModelProviderId, {
            model_id: modelName,
            ...input,
            status: "active",
            ...modelMetadataFromCandidate(candidate),
          }),
        "Model registered. Test it before routing production work.",
        true,
      );
      return;
    }
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
    <section className="grid gap-6" aria-labelledby="model-service-title">
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
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as View)}
        className={cn(
          modelServiceSurface,
          "gap-0 overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between gap-3 overflow-x-auto border-b p-2 sm:px-5">
          <TabsList className="min-w-max">
            <TabsTrigger value="assignments" className="shrink-0">
              Model profiles
            </TabsTrigger>
            <TabsTrigger value="providers" className="shrink-0">
              Providers{" "}
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {registry.providers.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => void registry.refresh()}
            disabled={registry.loading}
          >
            <RefreshCwIcon className={cn(registry.loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        <TabsContent value="assignments" className="m-0">
          <ConsumerModelProfiles
            organizationId={user.organization_id}
            profiles={consumerProfiles.profiles}
            draft={consumerProfiles.draft}
            options={modelOptions}
            initialLoading={
              registry.isInitialLoading || consumerProfiles.isInitialLoading
            }
            updating={registry.isRefreshing || consumerProfiles.isRefreshing}
            saving={consumerProfiles.saving}
            error={consumerProfiles.error ?? registry.error}
            conflict={consumerProfiles.conflict}
            canManage={canManage}
            dirty={consumerProfiles.dirty}
            onChoose={consumerProfiles.choose}
            onSave={async () => {
              const saved = await consumerProfiles.save();
              if (saved) toast.success("Consumer profiles saved.");
            }}
            onCancel={consumerProfiles.cancel}
            onAddModel={(role) =>
              openModelDialog(undefined, role === "ocr" ? "vlm" : role)
            }
            onRetry={() => {
              void registry.refresh();
              void consumerProfiles.refresh();
            }}
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
            onDiscoverModels={() => void runModelDiscovery()}
            onCredential={() => setDialogMode("credential")}
            onEditProvider={() =>
              selectedProvider && openProviderDialog(selectedProvider)
            }
            onTestProvider={() =>
              selectedProvider && void runProviderTest(selectedProvider)
            }
            onToggleProvider={(provider) =>
              provider.status === "active"
                ? setPendingConfirmation({
                    type: "disable-provider",
                    provider,
                  })
                : void runAction(
                    () =>
                      updateProvider(context, provider.id, {
                        status: "active",
                      }),
                    `${provider.display_name} activated.`,
                  )
            }
            onDeleteProvider={(provider) =>
              setPendingConfirmation({ type: "delete-provider", provider })
            }
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
            discoveredModels={
              newModelProviderId
                ? (registry.providers.find(
                    (provider) => provider.id === newModelProviderId,
                  )?.discovered_models ?? [])
                : []
            }
            capability={pendingCapability}
            busy={busy}
            onOpenChange={(open) => !open && setDialogMode(null)}
            onSubmit={submitModel}
          />
          <ModelServiceConfirmationDialog
            confirmation={confirmationCopy}
            busy={busy}
            onOpenChange={(open) => !open && setPendingConfirmation(null)}
            onConfirm={() => void confirmPendingAction()}
          />
        </>
      )}
    </section>
  );
}
