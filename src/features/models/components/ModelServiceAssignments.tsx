import { CircleAlertIcon, RefreshCwIcon, ServerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type { RegistryLoadError } from "../model/useModelRegistry";
import { getModelReadiness, type ReadinessLevel } from "../model/readiness";
import type { ModelCapability } from "../model/registryTypes";
import type { ModelOption } from "./modelServiceTypes";
import {
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
  level: ReadinessLevel;
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

export function ModelServiceAssignments({
  organizationId,
  options,
  initialLoading,
  updating,
  error,
  canManage,
  onChoose,
  onAddModel,
  onRetry,
}: {
  organizationId: string;
  options: ModelOption[];
  initialLoading: boolean;
  updating: boolean;
  error: RegistryLoadError | null;
  canManage: boolean;
  onChoose: (capability: ModelCapability) => void;
  onAddModel: (capability: ModelCapability) => void;
  onRetry: () => void;
}) {
  return (
    <div>
      <div className={modelServiceSection}>
        <h2 className="text-base font-semibold">Default assignments</h2>
        <p
          className={cn(
            "mt-1 max-w-3xl text-xs leading-5",
            modelServiceMutedText,
          )}
        >
          {canManage
            ? "Review the active default for each capability, then choose a tested model when a change is needed."
            : "Current organization defaults by workload. Contact an organization admin to change an assignment."}
        </p>
      </div>
      {updating && (
        <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-xs text-muted-foreground">
          <RefreshCwIcon className="size-3.5 animate-spin" /> Updating
          assignments. Current configuration remains available.
        </div>
      )}
      {initialLoading ? (
        <AssignmentsSkeleton />
      ) : error && !options.length ? (
        <RegistryErrorState error={error} onRetry={onRetry} />
      ) : (
        <div className="divide-y">
          {modelCapabilities.map((capability) => {
            const candidates = options.filter(
              (option) => option.model.capability === capability.id,
            );
            const defaults = candidates.filter(
              (option) => option.model.is_default,
            );
            const eligibleCandidates = candidates.filter(
              (option) =>
                getModelReadiness(option.provider, option.model).level ===
                "ready",
            );
            const defaultReadiness = defaults.map((option) =>
              getModelReadiness(option.provider, option.model),
            );
            const readyDefaults = defaultReadiness.filter(
              (readiness) => readiness.level === "ready",
            );
            const level: ReadinessLevel = !defaults.length
              ? "not_configured"
              : readyDefaults.length === defaults.length
                ? "ready"
                : defaultReadiness.some(
                      (readiness) => readiness.level === "failed",
                    )
                  ? "failed"
                  : defaultReadiness.some(
                        (readiness) => readiness.level === "inactive",
                      )
                    ? "inactive"
                    : "unknown";
            const Icon = capability.icon;
            return (
              <article
                key={capability.id}
                className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {capability.label}
                      </h3>
                      <ReadinessBadge level={level} />
                    </div>
                    <p className={cn("mt-1 text-xs", modelServiceMutedText)}>
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
                          <div
                            key={option.model.resource_id}
                            className="min-w-0 rounded-lg border bg-background px-3 py-2.5"
                            aria-label={`${option.provider.display_name} assignment`}
                          >
                            <span
                              className={cn(
                                "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs",
                                modelServiceMutedText,
                              )}
                            >
                              <ServerIcon className="size-3 shrink-0" />
                              <span className="truncate">
                                Provider: {option.provider.display_name}
                              </span>
                              <span>· {capability.label}</span>
                              <span>· Organization: {organizationId}</span>
                            </span>
                            <span className="mt-1 flex min-w-0 items-center justify-between gap-2">
                              <strong className="truncate text-sm">
                                {option.model.name}
                              </strong>
                              <ReadinessBadge
                                level={readiness.level}
                                label={readiness.label}
                              />
                            </span>
                            <span
                              className={cn(
                                "mt-1 block text-xs",
                                modelServiceMutedText,
                              )}
                            >
                              Last checked:{" "}
                              {formatCheckedAt(option.model.updated_at)}
                            </span>
                            {readiness.level !== "ready" && (
                              <span className="mt-1 block text-xs leading-5 text-amber-700 dark:text-amber-300">
                                {readiness.detail} Next: {readiness.nextAction}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-3">
                      <p className="text-sm font-medium">
                        {canManage
                          ? "No default configured"
                          : "No current assignment"}
                      </p>
                      <p className={cn("mt-1 text-xs", modelServiceMutedText)}>
                        {canManage
                          ? candidates.length
                            ? `${eligibleCandidates.length} eligible ${capability.label} model${eligibleCandidates.length === 1 ? " is" : "s are"} available. Test or activate the others before selecting them.`
                            : `Register a ${capability.label} model before assigning a default.`
                          : `No ${capability.label} default is assigned. Contact an organization admin to configure one.`}
                      </p>
                    </div>
                  )}
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    variant={defaults.length ? "outline" : "default"}
                    className="w-full lg:w-auto"
                    onClick={() =>
                      candidates.length
                        ? onChoose(capability.id)
                        : onAddModel(capability.id)
                    }
                    aria-label={`${defaults.length ? "Change" : candidates.length ? "Assign" : "Add"} ${capability.label} model`}
                  >
                    {defaults.length
                      ? "Change model"
                      : candidates.length
                        ? "Assign model"
                        : "Add model"}
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssignmentsSkeleton() {
  return (
    <div
      className="divide-y"
      aria-label="Loading default assignments"
      aria-busy="true"
    >
      {[1, 2, 3, 4].map((key) => (
        <div
          key={key}
          className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}

function RegistryErrorState({
  error,
  onRetry,
}: {
  error: RegistryLoadError;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-72 place-items-center p-6 text-center">
      <div>
        <CircleAlertIcon className="mx-auto size-5 text-destructive" />
        <p className="mt-2 text-sm font-medium">
          Assignments could not be loaded
        </p>
        <p
          className={cn(
            "mx-auto mt-1 max-w-md text-xs leading-5",
            modelServiceMutedText,
          )}
        >
          {error.message}
        </p>
        {error.retryable && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={onRetry}
          >
            <RefreshCwIcon /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}
