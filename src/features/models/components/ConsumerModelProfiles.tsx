import {
  BrainCircuitIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  DatabaseIcon,
  EyeIcon,
  LoaderCircleIcon,
  SaveIcon,
  type LucideIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type {
  ConsumerProfile,
  ConsumerProfileChange,
  ConsumerRole,
  ModelRole,
} from "../api/consumerProfileContract";
import {
  consumerProfileConsumers,
  modelRolesForConsumer,
  modelRoleLabels,
} from "../api/consumerProfileContract";
import type { RegistryLoadError } from "../model/useModelRegistry";
import type { ModelOption } from "./modelServiceTypes";

const roleMeta: Record<
  ModelRole,
  { icon: LucideIcon; description: string; iconClass: string }
> = {
  llm: {
    icon: BrainCircuitIcon,
    description: "Reasoning and text generation",
    iconClass: "bg-primary/10 text-primary",
  },
  vlm: {
    icon: EyeIcon,
    description: "Images and document understanding",
    iconClass: "bg-secondary text-secondary-foreground",
  },
  embedding: {
    icon: DatabaseIcon,
    description: "Search and indexing vectors",
    iconClass: "bg-accent text-accent-foreground",
  },
  ocr: {
    icon: EyeIcon,
    description: "OCR and document text extraction",
    iconClass: "bg-secondary text-secondary-foreground",
  },
};

function statusLabel(status: ConsumerRole["status"]) {
  if (status === "not_used") return "Not used";
  if (status === "unconfigured") return "Needs setup";
  if (status === "conflict") return "Conflict";
  return status === "assigned" ? "Configured" : "Unavailable";
}

function statusClass(status: ConsumerRole["status"]) {
  if (status === "assigned") {
    return "border-success/30 bg-success/10 text-success";
  }
  if (status === "unavailable" || status === "conflict") {
    return "border-destructive/25 bg-destructive/10 text-destructive";
  }
  return "border-border bg-muted/70 text-muted-foreground";
}

function fallbackRole(role: ModelRole): ConsumerRole {
  return {
    role,
    status: "not_used",
    required: false,
    used: false,
    provider_id: null,
    model_id: null,
    features: {},
    required_features: [],
    reason: null,
    inherited: false,
    source_consumer_id: null,
    warning: null,
  };
}

function roleWithDraft(
  profile: ConsumerProfile,
  role: ModelRole,
  draft: Record<string, ConsumerProfileChange>,
): ConsumerRole {
  const current =
    profile.roles.find((item) => item.role === role) ?? fallbackRole(role);
  const change = draft[`${profile.consumer_id}:${role}`];
  if (!change) return current;
  const assigned = Boolean(change.provider_id && change.model_id);
  return {
    ...current,
    status: assigned ? "assigned" : "unconfigured",
    provider_id: change.provider_id,
    model_id: change.model_id,
    reason: assigned ? null : "no model is assigned to this role",
    inherited: false,
    source_consumer_id: null,
    warning: null,
  };
}

function displayedRoles(
  profile: ConsumerProfile,
  draft: Record<string, ConsumerProfileChange>,
  systemEmbedding: ConsumerRole,
): ConsumerRole[] {
  return modelRolesForConsumer(profile.consumer_id).map((role) => {
    const current = roleWithDraft(profile, role, draft);
    if (
      profile.consumer_id !== "de-rd" ||
      role !== "embedding" ||
      current.inherited ||
      !current.provider_id ||
      !current.model_id ||
      !systemEmbedding.provider_id ||
      !systemEmbedding.model_id ||
      (current.provider_id === systemEmbedding.provider_id &&
        current.model_id === systemEmbedding.model_id)
    ) {
      return current;
    }
    return {
      ...current,
      warning:
        "DE-RD uses a different embedding model from System; existing vectors may need to be reindexed.",
    };
  });
}

function supportsRequiredFeatures(
  option: ModelOption,
  requiredFeatures: string[],
) {
  return requiredFeatures.every(
    (feature) =>
      option.model.features?.[
        feature as keyof NonNullable<typeof option.model.features>
      ] === true,
  );
}

export function ConsumerModelProfiles({
  organizationId,
  profiles,
  draft,
  options,
  initialLoading,
  updating,
  saving,
  error,
  conflict,
  canManage,
  dirty,
  onChoose,
  onSave,
  onCancel,
  onAddModel,
  onRetry,
}: {
  organizationId: string;
  profiles: ConsumerProfile[];
  draft: Record<string, ConsumerProfileChange>;
  options: ModelOption[];
  initialLoading: boolean;
  updating: boolean;
  saving: boolean;
  error: RegistryLoadError | null;
  conflict: boolean;
  canManage: boolean;
  dirty: boolean;
  onChoose: (
    consumerId: ConsumerProfile["consumer_id"],
    role: ModelRole,
    providerId: string,
    modelId: string,
  ) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onAddModel: (role: ModelRole) => void;
  onRetry: () => void;
}) {
  const profileFor = (
    consumerId: ConsumerProfile["consumer_id"],
  ): ConsumerProfile =>
    profiles.find((item) => item.consumer_id === consumerId) ?? {
      consumer_id: consumerId,
      display_name:
        consumerProfileConsumers.find((item) => item.id === consumerId)
          ?.label ?? consumerId,
      roles: [],
    };
  const systemEmbedding = roleWithDraft(
    profileFor("data-intelligence"),
    "embedding",
    draft,
  );
  const allRoles = consumerProfileConsumers.flatMap((consumer) =>
    displayedRoles(profileFor(consumer.id), draft, systemEmbedding),
  );
  const activeRoles = allRoles.filter((role) => role.used !== false);
  const configuredRoles = activeRoles.filter(
    (role) => role.status === "assigned",
  );
  const attentionRoles = activeRoles.filter(
    (role) => role.status !== "assigned",
  );

  return (
    <div className="bg-card">
      <header className="border-b px-4 py-5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Organization models
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Configure the shared LLM, VLM, and embedding models for every
              AXIOM runtime in {organizationId}. DE-RD can override them and
              select an OCR model.
            </p>
          </div>
          {canManage && dirty && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCancel}
                disabled={saving}
              >
                <XIcon data-icon="inline-start" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void onSave()}
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                {saving ? "Saving" : "Save changes"}
              </Button>
            </div>
          )}
        </div>
        <div className="mt-5 grid max-w-3xl grid-cols-3 divide-x rounded-lg border bg-muted/30">
          <SummaryStat
            label="Profiles"
            value={consumerProfileConsumers.length.toString()}
          />
          <SummaryStat
            label="Configured roles"
            value={`${configuredRoles.length}/${activeRoles.length}`}
            tone="success"
          />
          <SummaryStat
            label="Needs attention"
            value={attentionRoles.length.toString()}
            tone={attentionRoles.length ? "warning" : "success"}
          />
        </div>
      </header>

      {updating && (
        <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
          <LoaderCircleIcon className="size-3.5 animate-spin" />
          Refreshing the latest organization profile…
        </div>
      )}
      {conflict && (
        <div
          role="alert"
          className="flex gap-2 border-b border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning sm:px-5"
        >
          <CircleAlertIcon className="size-4 shrink-0" />
          This profile changed while you were editing. Review the latest
          revision and save again.
        </div>
      )}

      {initialLoading ? (
        <ProfilesSkeleton />
      ) : error && !profiles.length ? (
        <Alert variant="destructive" className="m-4 sm:m-6">
          <CircleAlertIcon />
          <AlertTitle>Model profiles unavailable</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{error.message}</span>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
          {consumerProfileConsumers.map((consumer) => {
            const profile = profileFor(consumer.id);
            const roles = displayedRoles(profile, draft, systemEmbedding);
            const used = roles.filter((role) => role.used !== false);
            const configured = used.filter(
              (role) => role.status === "assigned",
            ).length;
            return (
              <Card
                key={consumer.id}
                aria-labelledby={`consumer-profile-${consumer.id}`}
                className="rounded-xl border shadow-sm"
              >
                <CardHeader className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                      {consumer.label.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm font-semibold">
                        <h3 id={`consumer-profile-${consumer.id}`}>
                          {profile.display_name || consumer.label}
                        </h3>
                      </CardTitle>
                      <CardDescription className="mt-0.5 truncate font-mono text-[11px]">
                        {consumer.id}
                      </CardDescription>
                    </div>
                  </div>
                  <CardAction className="shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium",
                        configured === used.length
                          ? statusClass("assigned")
                          : statusClass("unconfigured"),
                      )}
                    >
                      {configured === used.length && (
                        <CircleCheckIcon
                          data-icon="inline-start"
                          className="size-3"
                        />
                      )}
                      {configured}/{used.length} ready
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="grid gap-2 p-3 sm:grid-cols-2">
                  {roles.map((role) => (
                    <RoleRow
                      key={role.role}
                      consumerId={consumer.id}
                      role={role}
                      options={options}
                      canManage={canManage}
                      onChoose={onChoose}
                      onAddModel={onAddModel}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {error && profiles.length > 0 && (
        <div className="border-t bg-destructive/5 px-4 py-3 text-xs text-destructive sm:px-5">
          {error.message}
        </div>
      )}
    </div>
  );
}

function ProfilesSkeleton() {
  return (
    <div
      className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2"
      aria-label="Loading model profiles"
      aria-busy="true"
    >
      {consumerProfileConsumers.map((consumer) => (
        <Card key={consumer.id} className="rounded-xl">
          <CardHeader className="flex items-center gap-3 border-b px-4 py-4 sm:px-5">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </CardHeader>
          <CardContent className="grid gap-2 p-3 sm:grid-cols-2">
            {modelRolesForConsumer(consumer.id).map((role) => (
              <Skeleton key={role} className="h-32 rounded-xl" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="px-3 py-3 sm:px-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tracking-tight",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}

type ChooseProfileModel = (
  consumerId: ConsumerProfile["consumer_id"],
  role: ModelRole,
  providerId: string,
  modelId: string,
) => void;

function RoleRow({
  consumerId,
  role,
  options,
  canManage,
  onChoose,
  onAddModel,
}: {
  consumerId: ConsumerProfile["consumer_id"];
  role: ConsumerRole;
  options: ModelOption[];
  canManage: boolean;
  onChoose: ChooseProfileModel;
  onAddModel: (role: ModelRole) => void;
}) {
  const meta = roleMeta[role.role];
  const Icon = meta.icon;
  const candidates = options.filter(
    (option) =>
      option.model.status === "active" &&
      option.provider.status === "active" &&
      option.model.capability === (role.role === "ocr" ? "vlm" : role.role) &&
      supportsRequiredFeatures(option, role.required_features),
  );
  const selected =
    role.provider_id && role.model_id
      ? `${role.provider_id}/${role.model_id}`
      : "";
  const selectedOption = candidates.find(
    (option) => `${option.provider.id}/${option.model.model_id}` === selected,
  );
  const canSelect = canManage && role.status !== "not_used";

  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border p-3 transition-colors",
        role.status === "assigned"
          ? "border-primary/20 bg-primary/[0.025]"
          : "border-border/70 bg-muted/[0.18]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            meta.iconClass,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">
              {modelRoleLabels[role.role]}
            </p>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                statusClass(role.status),
              )}
            >
              {statusLabel(role.status)}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {role.inherited
              ? "Inherited from System"
              : role.required
                ? "Required"
                : role.used
                  ? "Optional"
                  : meta.description}
          </p>
        </div>
      </div>

      {role.status === "not_used" ? (
        <p className="mt-3 rounded-lg border border-dashed px-2.5 py-2 text-[11px] text-muted-foreground">
          Not used by this consumer
        </p>
      ) : canSelect ? (
        <div className="mt-3">
          {selected &&
            (role.status === "unavailable" || role.status === "conflict") && (
              <div className="mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-dashed bg-background/60 px-2.5 py-2 text-[10px]">
                <span className="shrink-0 font-semibold uppercase tracking-wide text-muted-foreground">
                  Current
                </span>
                <span className="truncate font-mono text-foreground">
                  {selected}
                </span>
              </div>
            )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  id={`${consumerId}-${role.role}-model`}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`${modelRoleLabels[role.role]} model`}
                  disabled={!candidates.length}
                  className="h-9 w-full justify-between bg-background text-xs"
                >
                  <span className="min-w-0 truncate">
                    {selectedOption
                      ? `${selectedOption.provider.id} / ${selectedOption.model.model_id}`
                      : "Choose an active model"}
                  </span>
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              }
            />
            <DropdownMenuContent
              align="start"
              className="max-w-[calc(100vw-2rem)]"
            >
              <DropdownMenuRadioGroup
                value={selected}
                onValueChange={(value) => {
                  const [providerId, ...modelParts] = value.split("/");
                  if (providerId && modelParts.length) {
                    onChoose(
                      consumerId,
                      role.role,
                      providerId,
                      modelParts.join("/"),
                    );
                  }
                }}
              >
                {candidates.map((option) => {
                  const value = `${option.provider.id}/${option.model.model_id}`;
                  return (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {option.provider.id} / {option.model.model_id}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {!candidates.length && (
            <button
              type="button"
              className="mt-2 text-[11px] font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => onAddModel(role.role)}
            >
              Add an eligible model
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 min-w-0 rounded-lg border bg-background/70 px-2.5 py-2">
          <p className="truncate font-mono text-[10px] text-foreground">
            {selected || "No model assigned"}
          </p>
        </div>
      )}
      {role.reason && (
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
          {role.reason}
        </p>
      )}
      {role.warning && (
        <p className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-2 text-[10px] leading-4 text-warning">
          {role.warning}
        </p>
      )}
    </div>
  );
}
