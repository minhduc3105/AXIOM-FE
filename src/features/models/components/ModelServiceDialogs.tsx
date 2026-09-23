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
  validateModelForm,
  validateProviderForm,
} from "../model/formValidation";
import { getModelReadiness } from "../model/readiness";
import type {
  ModelCapability,
  ProviderModelCandidate,
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
const formDialogClass =
  "w-[calc(100vw-2rem)] max-w-xl overflow-hidden rounded-2xl p-0";
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
        className={cn(modelServiceInput, "h-10 rounded-xl px-3")}
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
      <DialogContent className={formDialogClass}>
        <form className="grid gap-0" onSubmit={onSubmit} noValidate>
          <DialogHeader className="border-b bg-muted/20 px-6 py-6 pr-14 sm:px-7">
            <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
            <DialogDescription className="mt-2 max-w-lg leading-6">
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 sm:px-7 sm:py-7">
            <FieldGroup className="gap-5">{children}</FieldGroup>
          </div>
          <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4 sm:px-7">
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
  discoveredModels,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  model: ProviderModelView | null;
  provider: ProviderView | null;
  capability: ModelCapability;
  discoveredModels: ProviderModelCandidate[];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: SubmitHandler;
}) {
  const [errors, setErrors] = useState<FormErrors>({});
  const usesExistingProvider = Boolean(provider);
  const candidateOptions = discoveredModels.filter(
    (candidate) =>
      candidate.capability === null || candidate.capability === capability,
  );
  useEffect(() => {
    if (open) setErrors({});
  }, [open]);
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextErrors = validateModelForm({
      modelName: String(form.get("model-name") ?? ""),
      capability: String(form.get("model-capability") ?? ""),
    });
    setErrors(nextErrors);
    if (!hasErrors(nextErrors)) void onSubmit(event);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={validate}
          noValidate
        >
          <DialogHeader className="shrink-0 border-b bg-muted/20 px-5 py-5 pr-14 sm:px-7 sm:py-6">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-xl sm:text-2xl">
                  {model ? "Edit model" : "Add model"}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-2xl leading-6">
                  {model
                    ? "Update model metadata."
                    : usesExistingProvider
                      ? `Register a model for ${provider?.display_name}. It will use this provider's connection configuration.`
                      : "Select a provider first to register a model."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="mx-auto grid max-w-xl gap-5">
              <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <p className="text-sm font-semibold">Model identity</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    How this model appears in AXIOM.
                  </p>
                </div>
                <div className="grid gap-5">
                  <TextField
                    id="model-name"
                    label="Model name"
                    list="discovered-model-candidates"
                    defaultValue={model?.model_id ?? model?.name}
                    placeholder="e.g. poolside/laguna-xs-2.1"
                    onChange={() => clearError(errors, "modelName", setErrors)}
                    error={errors.modelName}
                    required
                  />
                  {candidateOptions.length > 0 && (
                    <datalist id="discovered-model-candidates">
                      {candidateOptions.map((candidate) => (
                        <option
                          key={candidate.model_id}
                          value={candidate.model_id}
                        >
                          {candidate.name}
                        </option>
                      ))}
                    </datalist>
                  )}
                  <DropdownField
                    id="model-capability"
                    label="Workload"
                    defaultValue={model?.capability ?? capability}
                    error={errors.capability}
                    onValueChange={() =>
                      clearError(errors, "capability", setErrors)
                    }
                    options={modelCapabilities.map((item) => ({
                      value: item.id,
                      label: item.label,
                    }))}
                  />
                </div>
              </section>
              {!model && !usesExistingProvider && (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  Select a provider first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-5 py-4 sm:px-7">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || (!model && !usesExistingProvider)}
            >
              {busy && (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              {model ? "Save model" : "Register model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ModelServiceProviderDialog({
  open,
  editingProvider,
  busy,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editingProvider: ProviderView | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: SubmitHandler;
}) {
  const [values, setValues] = useState({
    name: "",
    url: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  useEffect(() => {
    if (open) {
      setErrors({});
      setValues({
        name: editingProvider?.display_name ?? "",
        url: editingProvider?.base_url ?? "",
      });
    }
  }, [editingProvider, open]);
  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProviderForm({
      name: values.name,
      baseUrl: values.url,
    });
    if (!editingProvider) {
      const apiKeyErrors = validateCredential(
        String(new FormData(event.currentTarget).get("provider-api-key") ?? ""),
      );
      nextErrors.apiKey = apiKeyErrors.apiKey;
    }
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
          ? "Update the provider name or endpoint. The API key remains encrypted and is never shown again."
          : "Create an organization provider. Connection settings are inferred from the URL, and the API key is encrypted and never shown again."
      }
      busy={busy}
      submitLabel={editingProvider ? "Save provider" : "Add provider"}
      onSubmit={validate}
    >
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
      {!editingProvider && (
        <TextField
          id="provider-api-key"
          label="API key"
          type="password"
          autoComplete="new-password"
          spellCheck={false}
          error={errors.apiKey}
          onChange={() => clearError(errors, "apiKey", setErrors)}
          required
        />
      )}
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
      title={`${provider?.credential_configured ? "Change API key for" : "Add API key for"} ${provider?.display_name ?? "provider"}`}
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
