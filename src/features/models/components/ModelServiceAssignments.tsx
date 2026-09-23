import {
  ChevronDownIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SaveIcon,
  ServerIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ModelTask,
  TaskAssignment,
  TaskAssignmentStatus,
} from "../api/modelServiceContract";
import type { RegistryLoadError } from "../model/useModelRegistry";
import type { ModelCapability } from "../model/registryTypes";
import type { TaskAssignmentDraft } from "../model/useModelTaskAssignments";
import type { ModelOption } from "./modelServiceTypes";
import {
  getEligibleTaskCandidates,
  taskAssignmentSelection,
  taskAssignmentSelectionKey,
} from "./taskAssignmentUtils";
import {
  modelServiceMutedText,
  modelServiceSection,
} from "./modelServiceUi";

type AssignmentSelection = TaskAssignmentDraft;

function groupLabel(group: string) {
  return group
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function selectionKey(selection: AssignmentSelection | null) {
  return selection
    ? taskAssignmentSelectionKey(selection.provider_id, selection.model_id)
    : "";
}

function assignmentSelection(assignment: TaskAssignment | undefined) {
  return assignment?.provider_id && assignment.model_id
    ? {
        provider_id: assignment.provider_id,
        model_id: assignment.model_id,
      }
    : null;
}

function statusLabel(status: TaskAssignmentStatus) {
  if (status === "assigned") return "Assigned";
  if (status === "unavailable") return "Unavailable";
  return "Unconfigured";
}

function statusClass(status: TaskAssignmentStatus) {
  if (status === "assigned") return "border-success/30 bg-success/10 text-success";
  if (status === "unavailable") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-border bg-muted text-muted-foreground";
}

function candidateLabel(option: ModelOption) {
  // Provider and model IDs are API identifiers. Keep them literal so an
  // admin can verify exactly what will be submitted in the batch.
  return `${option.provider.id} / ${option.model.model_id}`;
}

export function ModelServiceAssignments({
  organizationId,
  tasks,
  assignments,
  options,
  initialLoading,
  updating,
  saving,
  error,
  conflict,
  canManage,
  draftByTask,
  dirty,
  onChoose,
  onSave,
  onCancel,
  onAddModel,
  onRetry,
}: {
  organizationId: string;
  tasks: ModelTask[];
  assignments: TaskAssignment[];
  options: ModelOption[];
  initialLoading: boolean;
  updating: boolean;
  saving: boolean;
  error: RegistryLoadError | null;
  conflict: boolean;
  canManage: boolean;
  draftByTask: Record<string, AssignmentSelection>;
  dirty: boolean;
  onChoose: (taskId: string, selection: AssignmentSelection) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  onAddModel: (capability: ModelCapability) => void;
  onRetry: () => void;
}) {
  const groups = tasks.reduce<Map<string, ModelTask[]>>((result, task) => {
    const group = result.get(task.group) ?? [];
    group.push(task);
    result.set(task.group, group);
    return result;
  }, new Map());

  return (
    <div>
      <div className={modelServiceSection}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Task assignments</h2>
            <p className={cn("mt-1 max-w-3xl text-xs leading-5", modelServiceMutedText)}>
              {canManage
                ? `Route each Model Service task to an active eligible model for ${organizationId}. Changes are saved together.`
                : "Current task routes are read-only. Contact an organization admin to change an assignment."}
            </p>
          </div>
          {canManage && dirty && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCancel}
                disabled={saving}
              >
                <XIcon /> Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void onSave()}
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                {saving ? "Saving" : "Save changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
      {updating && (
        <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-xs text-muted-foreground">
          <RefreshCwIcon className="size-3.5 animate-spin" /> Updating task
          assignments. Current configuration remains available.
        </div>
      )}
      {conflict && (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            The assignment configuration changed while you were editing. The
            latest server revision is loaded; your draft remains available to
            review and save again.
          </span>
        </div>
      )}
      {initialLoading ? (
        <AssignmentsSkeleton />
      ) : error && !tasks.length ? (
        <AssignmentErrorState error={error} onRetry={onRetry} />
      ) : tasks.length ? (
        <div className="divide-y">
          {[...groups.entries()].map(([group, groupTasks]) => (
            <section key={group} aria-labelledby={`task-group-${group}`}>
              <div className="border-b bg-muted/20 px-4 py-2.5 sm:px-5">
                <h3
                  id={`task-group-${group}`}
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {groupLabel(group)}
                </h3>
              </div>
              <div className="divide-y">
                {groupTasks.map((task) => (
                  <TaskRow
                    key={task.task_id}
                    task={task}
                    assignment={assignments.find(
                      (item) => item.task_id === task.task_id,
                    )}
                    options={options}
                    draft={draftByTask[task.task_id] ?? null}
                    canManage={canManage}
                    onChoose={onChoose}
                    onAddModel={onAddModel}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center p-6 text-center">
          <div>
            <p className="text-sm font-medium">No model tasks are registered</p>
            <p className={cn("mt-1 text-xs", modelServiceMutedText)}>
              Model Service returned an empty task catalog.
            </p>
          </div>
        </div>
      )}
      {error && tasks.length > 0 && (
        <div className="border-t bg-destructive/5 px-4 py-3 text-xs text-destructive sm:px-5">
          {error.message}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  assignment,
  options,
  draft,
  canManage,
  onChoose,
  onAddModel,
}: {
  task: ModelTask;
  assignment?: TaskAssignment;
  options: ModelOption[];
  draft: AssignmentSelection | null;
  canManage: boolean;
  onChoose: (taskId: string, selection: AssignmentSelection) => void;
  onAddModel: (capability: ModelCapability) => void;
}) {
  const candidates = getEligibleTaskCandidates(task, options);
  const serverSelection = assignmentSelection(assignment);
  const selected = draft ?? serverSelection;
  const selectedKey = selectionKey(selected);
  const currentCandidate = candidates.find(
    (option) => selectionKey(taskAssignmentSelection(option)) === selectedKey,
  );
  const missingDraft = Boolean(draft && !currentCandidate);
  const missingAssignment = Boolean(
    serverSelection && !currentCandidate && !draft,
  );
  const selectedLabel = currentCandidate
    ? candidateLabel(currentCandidate)
    : missingDraft && draft
      ? `${draft.provider_id} / ${draft.model_id} (draft unavailable)`
      : missingAssignment && serverSelection
        ? `${serverSelection.provider_id} / ${serverSelection.model_id} (current unavailable)`
        : "Choose an active model";
  const status = assignment?.status ?? "unconfigured";

  return (
    <article className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold">{task.display_name}</h4>
          <Badge
            variant="outline"
            className={cn("text-[10px] uppercase tracking-wide", statusClass(status))}
          >
            {statusLabel(status)}
          </Badge>
          {task.requires_index_profile && (
            <Badge variant="secondary" className="text-[10px]">
              Index profile
            </Badge>
          )}
          {task.vision_optional && (
            <Badge variant="secondary" className="text-[10px]">
              Vision optional
            </Badge>
          )}
        </div>
        <p className={cn("mt-1 text-xs leading-5", modelServiceMutedText)}>
          {task.required_capabilities.length
            ? `Requires ${task.required_capabilities.join(", ")}`
            : "No capability requirement"}
          {task.required_features.length
            ? ` · Features: ${task.required_features.join(", ")}`
            : ""}
        </p>
        {assignment?.reason && (
          <p className="mt-1 text-xs leading-5 text-warning">{assignment.reason}</p>
        )}
        {canManage && missingDraft && draft && (
          <p className="mt-1 text-xs leading-5 text-warning">
            Draft: {draft.provider_id} / {draft.model_id} is no longer in the
            active eligible inventory. Review before saving.
          </p>
        )}
        {canManage && missingAssignment && (
          <p className="mt-1 text-xs leading-5 text-destructive">
            Current assignment is unavailable in the active eligible inventory.
          </p>
        )}
        {!canManage && !serverSelection && (
          <p className={cn("mt-1 text-xs", modelServiceMutedText)}>
            No current model assigned.
          </p>
        )}
        {serverSelection && (
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <ServerIcon className="size-3 shrink-0" />
            <code className="truncate">
              {serverSelection.provider_id} / {serverSelection.model_id}
            </code>
          </p>
        )}
      </div>
      {canManage ? (
        <div className="flex min-w-0 items-center gap-2">
          {candidates.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Assign ${task.display_name}`}
                    className="h-9 min-w-0 flex-1 justify-between bg-background text-xs"
                  >
                    <span className="min-w-0 truncate text-left">
                      {selectedLabel}
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
                  value={selectedKey}
                  onValueChange={(value) => {
                    const selectedOption = candidates.find(
                      (option) =>
                        taskAssignmentSelectionKey(
                          option.provider.id,
                          option.model.model_id,
                        ) === value,
                    );
                    if (selectedOption) {
                      onChoose(
                        task.task_id,
                        taskAssignmentSelection(selectedOption),
                      );
                    }
                  }}
                >
                  {candidates.map((option) => {
                    const value = taskAssignmentSelectionKey(
                      option.provider.id,
                      option.model.model_id,
                    );
                    return (
                      <DropdownMenuRadioItem key={value} value={value}>
                        {candidateLabel(option)}
                      </DropdownMenuRadioItem>
                    );
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="min-w-0 flex-1 rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              No active eligible models match this task.
            </div>
          )}
          {!candidates.length && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                const capability = task.required_capabilities[0];
                if (capability) onAddModel(capability as ModelCapability);
              }}
            >
              Add model
            </Button>
          )}
        </div>
      ) : (
        <div className="min-w-0 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {serverSelection
            ? `${serverSelection.provider_id} / ${serverSelection.model_id}`
            : "No current model assigned"}
        </div>
      )}
    </article>
  );
}

function AssignmentsSkeleton() {
  return (
    <div className="divide-y" aria-label="Loading task assignments" aria-busy="true">
      {[1, 2, 3, 4].map((key) => (
        <div key={key} className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:items-center">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function AssignmentErrorState({
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
        <p className="mt-2 text-sm font-medium">Task assignments could not be loaded</p>
        <p className={cn("mx-auto mt-1 max-w-md text-xs leading-5", modelServiceMutedText)}>
          {error.message}
        </p>
        {error.retryable && (
          <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
            <RefreshCwIcon /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}
