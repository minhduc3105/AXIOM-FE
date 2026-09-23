import { useCallback, useEffect, useState } from "react";
import {
  getTaskAssignments,
  listModelTasks,
  ModelServiceApiError,
  updateTaskAssignments,
  type ModelRegistryContext,
} from "../api/modelServiceApi";
import type {
  ModelTask,
  TaskAssignment,
  TaskAssignmentBatchInput,
  TaskAssignmentChange,
} from "../api/modelServiceContract";
import type { RegistryLoadError } from "./useModelRegistry";

export type TaskAssignmentDraft = Omit<TaskAssignmentChange, "task_id">;

type RefreshOptions = {
  preserveDraft?: boolean;
  signal?: AbortSignal;
};

function toLoadError(cause: unknown): RegistryLoadError {
  if (cause instanceof ModelServiceApiError) {
    if (cause.status === 401) {
      return {
        message:
          "Your session has expired. Sign in again to view task assignments.",
        status: 401,
        retryable: false,
      };
    }
    if (cause.status === 403) {
      return {
        message: "You do not have permission to view task assignments.",
        status: 403,
        retryable: false,
      };
    }
    if (cause.status >= 500) {
      return {
        message:
          "Model Service is temporarily unavailable. Please try again shortly.",
        status: cause.status,
        retryable: true,
      };
    }
    return {
      message: cause.message || "Unable to load task assignments.",
      status: cause.status,
      retryable: cause.status === 409,
    };
  }
  return {
    message:
      "Network error while loading task assignments. Check your connection and retry.",
    status: null,
    retryable: true,
  };
}

function isAbortError(cause: unknown) {
  return cause instanceof DOMException && cause.name === "AbortError";
}

export function useModelTaskAssignments(context: ModelRegistryContext | null) {
  const [tasks, setTasks] = useState<ModelTask[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [revision, setRevision] = useState(0);
  const [configRevision, setConfigRevision] = useState(0);
  const [draftByTask, setDraftByTask] = useState<
    Record<string, TaskAssignmentDraft>
  >({});
  const [loading, setLoading] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<RegistryLoadError | null>(null);
  const [conflict, setConflict] = useState(false);

  const refresh = useCallback(
    async (options: RefreshOptions = {}) => {
      if (!context) return;
      const preserveDraft = options.preserveDraft ?? true;
      setLoading(true);
      setError(null);
      try {
        const [nextTasks, nextAssignments] = await Promise.all([
          listModelTasks(context, options.signal),
          getTaskAssignments(context, options.signal),
        ]);
        if (options.signal?.aborted) return;
        setTasks(nextTasks);
        setAssignments(nextAssignments.assignments);
        setRevision(nextAssignments.revision);
        setConfigRevision(nextAssignments.config_revision);
        if (!preserveDraft) {
          setDraftByTask({});
          setConflict(false);
        }
      } catch (cause) {
        if (options.signal?.aborted || isAbortError(cause)) return;
        setError(toLoadError(cause));
      } finally {
        if (!options.signal?.aborted) {
          setHasResolved(true);
          setLoading(false);
        }
      }
    },
    [context],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh({ preserveDraft: false, signal: controller.signal });
    return () => controller.abort();
  }, [refresh]);

  const setDraftAssignment = useCallback(
    (taskId: string, selection: TaskAssignmentDraft) => {
      setDraftByTask((current) => ({ ...current, [taskId]: selection }));
      setError(null);
    },
    [],
  );

  const cancel = useCallback(() => {
    setDraftByTask({});
    setConflict(false);
    setError(null);
  }, []);

  const save = useCallback(async () => {
    if (!context || saving) return false;
    const changes: TaskAssignmentChange[] = Object.entries(draftByTask).map(
      ([taskId, selection]) => ({ task_id: taskId, ...selection }),
    );
    if (!changes.length) return true;
    setSaving(true);
    setError(null);
    try {
      const input: TaskAssignmentBatchInput = {
        expected_revision: revision,
        changes,
      };
      const next = await updateTaskAssignments(context, input);
      setAssignments(next.assignments);
      setRevision(next.revision);
      setConfigRevision(next.config_revision);
      setDraftByTask({});
      setConflict(false);
      return true;
    } catch (cause) {
      if (cause instanceof ModelServiceApiError && cause.status === 409) {
        setConflict(true);
        // Reconcile the revision and server rows, but deliberately keep the
        // local draft so an admin can review and retry the same batch.
        await refresh({ preserveDraft: true });
      } else {
        setError(toLoadError(cause));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [context, draftByTask, refresh, revision, saving]);

  return {
    tasks,
    assignments,
    revision,
    configRevision,
    draftByTask,
    dirty: Object.keys(draftByTask).length > 0,
    loading,
    isInitialLoading: loading && !hasResolved,
    isRefreshing: loading && hasResolved,
    saving,
    error,
    conflict,
    refresh,
    setDraftAssignment,
    save,
    cancel,
  };
}
