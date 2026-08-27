import {
  ArrowRightIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  ServerIcon,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/shared/lib/utils";
import {
  hasErrors,
  type FormErrors,
  validateCredential,
  validateHttpUrl,
  validateModelForm,
  validateProviderForm,
} from "../model/formValidation";
import { getModelReadiness, type ReadinessLevel } from "../model/readiness";
import type {
  ModelCapability,
  ProviderCatalogItem,
  ProviderModelView,
  ProviderView,
} from "../model/registryTypes";
import type { ModelOption } from "./modelServiceTypes";
import {
  capabilityLabel,
  modelCapabilities,
  modelServiceInput,
  modelServiceMutedText,
  readinessBadgeClass,
  readinessLabel,
} from "./modelServiceUi";

const consoleDialogClass =
  "w-[96vw] max-w-[96rem] max-h-[92vh] overflow-y-auto p-6 sm:p-7";
type SubmitHandler = (
  event: FormEvent<HTMLFormElement>,
) => void | Promise<void>;

function clearError(
  errors: FormErrors,
  key: string,
  setErrors: (value: FormErrors) => void,
) {
  if (errors[key]) setErrors({ ...errors, [key]: undefined });
}

function TextField({
  id,
  label,
  error,
  ...props
}: { id: string; label: string; error?: string } & Omit<
  ComponentProps<typeof Input>,
  "id" | "name"
>) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        className={modelServiceInput}
        {...props}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function DropdownField({
  id,
  label,
  error,
  options,
  value,
  defaultValue,
  onValueChange,
}: {
  id: string;
  label: string;
  error?: string;
  options: readonly { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const initialValue = value ?? defaultValue ?? options[0]?.value ?? "";
  const [selectedValue, setSelectedValue] = useState(initialValue);

  useEffect(() => {
    setSelectedValue(value ?? defaultValue ?? options[0]?.value ?? "");
  }, [defaultValue, options, value]);

  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  function handleValueChange(nextValue: string) {
    setSelectedValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input type="hidden" name={id} value={selectedValue} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={Boolean(error)}
              className={cn("w-full justify-between", modelServiceInput)}
            >
              <span className="truncate">
                {selectedOption?.label ?? "Choose an option"}
              </span>
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={selectedValue}
            onValueChange={handleValueChange}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  busy,
  submitLabel,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  busy: boolean;
  submitLabel: string;
  onSubmit: SubmitHandler;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={consoleDialogClass}>
        <form className="grid gap-6" onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 lg:grid-cols-2">
            {children}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ModelServiceModelDialog({
  open,
  model,
  provider,
  capability,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  model: ProviderModelView | null;
  provider: ProviderView | null;
  capability: ModelCapability;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: SubmitHandler;
}) {
  const [errors, setErrors] = useState<FormErrors>({});
  const usesExistingProvider = Boolean(provider);
  useEffect(() => {
    if (open) setErrors({});
  }, [open]);
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextErrors = validateModelForm(
      {
        modelId: String(form.get("model-id") ?? ""),
        name: String(form.get("model-name") ?? ""),
        capability: String(form.get("model-capability") ?? ""),
        maxTokens: String(form.get("max-tokens") ?? ""),
        contextLength: String(form.get("context-length") ?? ""),
      },
      Boolean(model),
    );
    if (!usesExistingProvider && !model) {
      nextErrors.connectionName = String(
        form.get("connection-name") ?? "",
      ).trim()
        ? undefined
        : "Connection name is required.";
      nextErrors.connectionUrl = validateHttpUrl(
        String(form.get("connection-url") ?? ""),
      );
    }
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) void onSubmit(event);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:h-[min(48rem,calc(100dvh-3rem))] sm:w-[min(96rem,calc(100vw-3rem))] sm:max-w-[min(96rem,calc(100vw-3rem))]">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={validate} noValidate>
          <DialogHeader className="shrink-0 border-b bg-muted/20 px-6 py-6 pr-14 sm:px-9 sm:py-8">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ServerIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl sm:text-2xl">{model ? "Edit model" : "Add model"}</DialogTitle>
                <DialogDescription className="mt-2 max-w-2xl leading-6">
                  {model ? "Update model metadata and workload limits." : usesExistingProvider ? `Register a model for ${provider?.display_name}. It will use this provider's connection configuration.` : "Register a model and its organization connection in one place."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-9 sm:py-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border bg-card p-5 sm:p-6">
                <div className="mb-5"><p className="text-sm font-semibold">Model identity</p><p className="mt-1 text-xs text-muted-foreground">How this model appears in AXIOM.</p></div>
                <div className="grid gap-4">
                  {!model && <TextField id="model-id" label="Model ID" placeholder="e.g. gpt-4.1-mini" onChange={() => clearError(errors, "modelId", setErrors)} error={errors.modelId} required />}
                  <TextField id="model-name" label="Display name" defaultValue={model?.name} placeholder="e.g. GPT-4.1 mini" onChange={() => clearError(errors, "name", setErrors)} error={errors.name} required />
                  <DropdownField id="model-capability" label="Workload" defaultValue={model?.capability ?? capability} error={errors.capability} onValueChange={() => clearError(errors, "capability", setErrors)} options={modelCapabilities.map((item) => ({ value: item.id, label: item.label }))} />
                </div>
              </section>
              <section className="rounded-xl border bg-card p-5 sm:p-6">
                <div className="mb-5"><p className="text-sm font-semibold">Runtime limits</p><p className="mt-1 text-xs text-muted-foreground">Keep requests within the provider’s supported bounds.</p></div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <TextField id="max-tokens" label="Max output tokens" type="number" min={1} step={1} defaultValue={model?.max_tokens?.toString()} onChange={() => clearError(errors, "maxTokens", setErrors)} error={errors.maxTokens || errors.limits} />
                  <TextField id="context-length" label="Context length" type="number" min={1000} step={1} defaultValue={model?.max_context_length?.toString()} onChange={() => clearError(errors, "contextLength", setErrors)} error={errors.contextLength} />
                </div>
              </section>
              {!model && !usesExistingProvider && <section className="rounded-xl border bg-card p-5 sm:col-span-2 sm:p-6"><div className="mb-5"><p className="text-sm font-semibold">Connection</p><p className="mt-1 text-xs text-muted-foreground">This model will create its own organization provider connection.</p></div><div className="grid gap-4 md:grid-cols-2"><TextField id="connection-name" label="Connection name" placeholder="e.g. OpenAI production" onChange={() => clearError(errors, "connectionName", setErrors)} error={errors.connectionName} required /><DropdownField id="connection-source" label="Connection type" defaultValue="cloud" options={[{ value: "cloud", label: "Cloud" }, { value: "custom", label: "Custom" }, { value: "local", label: "Local" }]} /><TextField id="connection-url" label="Base URL" placeholder="https://api.openai.com/v1" onChange={() => clearError(errors, "connectionUrl", setErrors)} error={errors.connectionUrl} required /><DropdownField id="connection-protocol" label="Protocol" defaultValue="openai_compatible" options={[{ value: "openai_compatible", label: "OpenAI compatible" }, { value: "openrouter", label: "OpenRouter" }, { value: "cohere_compatible", label: "Cohere compatible" }]} /><TextField id="api-key" label="API key (optional)" type="password" autoComplete="new-password" spellCheck={false} /></div></section>}
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-6 py-4 sm:px-9"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}{model ? "Save model" : "Register model"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ModelServiceProviderDialog({
  open,
  editingProvider,
  catalog,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editingProvider: ProviderView | null;
  catalog: ProviderCatalogItem[];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: SubmitHandler;
}) {
  const [templateId, setTemplateId] = useState("");
  const [values, setValues] = useState({
    id: "",
    name: "",
    source: "cloud",
    url: "",
    protocol: "openai_compatible",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  useEffect(() => {
    if (open) {
      setTemplateId("");
      setErrors({});
      setValues({
        id: editingProvider?.id ?? "",
        name: editingProvider?.display_name ?? "",
        source: editingProvider?.source ?? "cloud",
        url: editingProvider?.base_url ?? "",
        protocol: editingProvider?.protocol ?? "openai_compatible",
      });
    }
  }, [editingProvider, open]);
  function selectTemplate(id: string) {
    setTemplateId(id);
    const template = catalog.find((item) => item.id === id);
    if (template)
      setValues({
        id: `${template.id}-org`,
        name: template.display_name,
        source: template.source,
        url: template.default_base_url,
        protocol: template.protocol,
      });
  }
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProviderForm(
      { id: values.id, name: values.name, baseUrl: values.url },
      Boolean(editingProvider),
    );
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) void onSubmit(event);
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingProvider ? "Edit provider" : "Add provider"}
      description={
        editingProvider
          ? "Update the provider endpoint and protocol."
          : "Create an organization provider from a template or enter a custom endpoint. Its ID must be unique in this organization."
      }
      busy={busy}
      submitLabel={editingProvider ? "Save provider" : "Add provider"}
      onSubmit={validate}
    >
      {!editingProvider && catalog.length > 0 && (
        <DropdownField
          id="provider-template"
          label="Provider template"
          value={templateId}
          onValueChange={selectTemplate}
          options={[
            { value: "", label: "Custom provider" },
            ...catalog.map((item) => ({
              value: item.id,
              label: item.display_name,
            })),
          ]}
        />
      )}
      {!editingProvider && (
        <TextField
          id="provider-id"
          label="Provider ID"
          value={values.id}
          onChange={(event) => {
            setValues((current) => ({ ...current, id: event.target.value }));
            clearError(errors, "id", setErrors);
          }}
          error={errors.id}
          placeholder="e.g. research-openai"
          required
        />
      )}
      <TextField
        id="provider-name"
        label="Display name"
        value={values.name}
        onChange={(event) => {
          setValues((current) => ({ ...current, name: event.target.value }));
          clearError(errors, "name", setErrors);
        }}
        error={errors.name}
        placeholder="e.g. OpenAI research"
        required
      />
      <DropdownField
        id="provider-source"
        label="Source"
        value={values.source}
        onValueChange={(source) =>
          setValues((current) => ({ ...current, source }))
        }
        options={[
          { value: "cloud", label: "Cloud" },
          { value: "custom", label: "Custom" },
          { value: "local", label: "Local" },
        ]}
      />
      <TextField
        id="provider-url"
        label="Base URL"
        value={values.url}
        onChange={(event) => {
          setValues((current) => ({ ...current, url: event.target.value }));
          clearError(errors, "baseUrl", setErrors);
        }}
        error={errors.baseUrl}
        placeholder="https://api.openai.com/v1"
        required
      />
      <DropdownField
        id="provider-protocol"
        label="Protocol"
        value={values.protocol}
        onValueChange={(protocol) =>
          setValues((current) => ({ ...current, protocol }))
        }
        options={[
          ...new Set([
            "openai_compatible",
            "openrouter",
            "cohere_compatible",
            ...catalog.map((item) => item.protocol),
          ]),
        ].map((protocol) => ({ value: protocol, label: protocol }))}
      />
    </FormDialog>
  );
}

export function ModelServiceCredentialDialog({
  open,
  provider,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  provider: ProviderView | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: SubmitHandler;
}) {
  const [errors, setErrors] = useState<FormErrors>({});
  useEffect(() => {
    if (open) setErrors({});
  }, [open]);
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCredential(
      String(new FormData(event.currentTarget).get("api-key") ?? ""),
    );
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) void onSubmit(event);
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Store credential for ${provider?.display_name ?? "provider"}`}
      description="The API key is sent securely to Model Service and is never shown again."
      busy={busy}
      submitLabel="Save credential"
      onSubmit={validate}
    >
      <TextField
        id="api-key"
        label="API key"
        type="password"
        autoComplete="new-password"
        spellCheck={false}
        error={errors.apiKey}
        onChange={() => clearError(errors, "apiKey", setErrors)}
        required
      />
    </FormDialog>
  );
}

function selectionBlockReason(option: ModelOption) {
  const readiness = getModelReadiness(option.provider, option.model);
  return readiness.level === "ready"
    ? null
    : `${readiness.detail} Next: ${readiness.nextAction}`;
}
function blocked(option: ModelOption) {
  return Boolean(selectionBlockReason(option));
}

export function ModelServiceAssignmentPickerDialog({
  capability,
  options,
  onOpenChange,
  onSelect,
}: {
  capability: ModelCapability | null;
  options: ModelOption[];
  onOpenChange: (open: boolean) => void;
  onSelect: (option: ModelOption) => void;
}) {
  const definition = modelCapabilities.find((item) => item.id === capability);
  const candidates = capability
    ? options.filter((option) => option.model.capability === capability)
    : [];
  return (
    <Dialog open={Boolean(capability)} onOpenChange={onOpenChange}>
      <DialogContent className={consoleDialogClass}>
        <DialogHeader>
          <DialogTitle>
            Choose {definition?.label ?? "model"} default
          </DialogTitle>
          <DialogDescription>
            Only active, validated models can become a default. Each unavailable
            option explains what must be resolved first.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(520px,60vh)] overflow-y-auto rounded-lg border">
          {candidates.length ? (
            <div className="divide-y">
              {candidates.map((option) => {
                const readiness = getModelReadiness(
                  option.provider,
                  option.model,
                );
                const reason = selectionBlockReason(option);
                return (
                  <article
                    key={option.model.resource_id}
                    className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm">
                          {option.model.name}
                        </strong>
                        {option.model.is_default && (
                          <Badge variant="secondary">Current default</Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase tracking-wide",
                            readinessBadgeClass(readiness.level),
                          )}
                        >
                          {readiness.label ?? readinessLabel(readiness.level)}
                        </Badge>
                      </div>
                      <p
                        className={cn(
                          "mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs",
                          modelServiceMutedText,
                        )}
                      >
                        <ServerIcon className="size-3 shrink-0" />
                        <span>{option.provider.display_name}</span>
                        <ArrowRightIcon className="size-3 shrink-0" />
                        <code className="truncate text-[10px]">
                          {option.model.model_id}
                        </code>
                      </p>
                      {reason && (
                        <p className="mt-1 text-xs text-warning">
                          Unavailable: {reason}
                        </p>
                      )}
                    </div>
                    {option.model.is_default ? (
                      <Button size="sm" variant="secondary" disabled>
                        Current default
                      </Button>
                    ) : reason ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        title={reason}
                      >
                        Not eligible
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => onSelect(option)}>
                        Select model
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm font-medium">
                No {definition?.label ?? "matching"} models available
              </p>
              <p className={cn("mt-1 text-xs", modelServiceMutedText)}>
                Add a model with this capability and its connection
                configuration first.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ModelServiceSwitchReviewDialog({
  option,
  currentDefault,
  busy,
  onOpenChange,
  onConfirm,
}: {
  option: ModelOption | null;
  currentDefault: ModelOption | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  if (!option) return <Dialog open={false} onOpenChange={onOpenChange} />;
  const readiness = getModelReadiness(option.provider, option.model);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className={consoleDialogClass}>
        <DialogHeader>
          <DialogTitle>Review default model change</DialogTitle>
          <DialogDescription>
            This changes the default for {option.provider.display_name} /{" "}
            {capabilityLabel(option.model.capability)}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <ReviewModel
            label="Current default"
            option={currentDefault}
            empty="No default configured"
          />
          <ArrowRightIcon className="mx-auto size-4 self-center text-muted-foreground max-sm:rotate-90" />
          <ReviewModel label="New default" option={option} />
        </div>
        <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Readiness</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase tracking-wide",
                readinessBadgeClass(readiness.level),
              )}
            >
              {readiness.label ?? readinessLabel(readiness.level)}
            </Badge>
          </div>
          <p className="text-muted-foreground">{readiness.detail}</p>
          {blocked(option) && (
            <p className="flex gap-2 text-destructive">
              <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              Next: {readiness.nextAction}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button disabled={busy || blocked(option)} onClick={onConfirm}>
            {busy && (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            )}
            Confirm default change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ModelServiceConfirmationDialog({
  confirmation,
  busy,
  onOpenChange,
  onConfirm,
}: {
  confirmation: {
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
  } | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  if (!confirmation) return <Dialog open={false} onOpenChange={onOpenChange} />;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className={consoleDialogClass}>
        <DialogHeader>
          <DialogTitle>{confirmation.title}</DialogTitle>
          <DialogDescription>{confirmation.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant={confirmation.destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            )}
            {confirmation.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewModel({
  label,
  option,
  empty,
}: {
  label: string;
  option: ModelOption | null;
  empty?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      {option ? (
        <>
          <p className="mt-2 truncate text-sm font-semibold">
            {option.model.name}
          </p>
          <p className={cn("mt-1 truncate text-xs", modelServiceMutedText)}>
            {option.provider.display_name}
          </p>
          <code className="mt-2 block truncate text-[10px] text-muted-foreground">
            {option.model.model_id}
          </code>
        </>
      ) : (
        <p className={cn("mt-3 text-sm", modelServiceMutedText)}>{empty}</p>
      )}
    </div>
  );
}
