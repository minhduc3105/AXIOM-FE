import { useCallback, useEffect, useState } from "react";
import {
  ConsumerProfileApiError,
  getConsumerModelProfiles,
  updateConsumerModelProfiles,
} from "../api/consumerProfileApi";
import type {
  ConsumerModelProfilesView,
  ConsumerProfileBatchInput,
  ConsumerProfileChange,
} from "../api/consumerProfileContract";
import type { ModelRegistryContext } from "../api/modelServiceApi";
import type { RegistryLoadError } from "./useModelRegistry";

type RefreshOptions = {
  preserveDraft?: boolean;
  signal?: AbortSignal;
};

function loadError(cause: unknown): RegistryLoadError {
  if (cause instanceof ConsumerProfileApiError) {
    return {
      message:
        cause.status === 403
          ? "You do not have permission to edit model profiles."
          : cause.message,
      status: cause.status,
      retryable: cause.status === 409 || cause.status >= 500,
    };
  }
  return {
    message: "Network error while loading consumer model profiles.",
    status: null,
    retryable: true,
  };
}

export function useConsumerModelProfiles(context: ModelRegistryContext | null) {
  const [data, setData] = useState<ConsumerModelProfilesView | null>(null);
  const [draft, setDraft] = useState<Record<string, ConsumerProfileChange>>({});
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);
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
        const next = await getConsumerModelProfiles(context, options.signal);
        if (options.signal?.aborted) return;
        setData(next);
        if (!preserveDraft) {
          setDraft({});
          setConflict(false);
        }
      } catch (cause) {
        if (options.signal?.aborted) return;
        setError(loadError(cause));
      } finally {
        if (!options.signal?.aborted) {
          setLoading(false);
          setResolved(true);
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

  const choose = useCallback(
    (
      consumerId: ConsumerProfileChange["consumer_id"],
      role: ConsumerProfileChange["role"],
      providerId: string,
      modelId: string,
    ) => {
      const key = `${consumerId}:${role}`;
      setDraft((current) => ({
        ...current,
        [key]: {
          consumer_id: consumerId,
          role,
          provider_id: providerId,
          model_id: modelId,
        },
      }));
      setError(null);
    },
    [],
  );

  const cancel = useCallback(() => {
    setDraft({});
    setConflict(false);
  }, []);

  const save = useCallback(async () => {
    if (!context || !data || saving) return false;
    const input: ConsumerProfileBatchInput = {
      expected_revision: data.revision,
      changes: Object.values(draft),
    };
    if (!input.changes.length) return true;
    setSaving(true);
    try {
      const next = await updateConsumerModelProfiles(context, input);
      setData(next);
      setDraft({});
      setConflict(false);
      return true;
    } catch (cause) {
      if (cause instanceof ConsumerProfileApiError && cause.status === 409) {
        setConflict(true);
        await refresh({ preserveDraft: true });
      } else {
        setError(loadError(cause));
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [context, data, draft, refresh, saving]);

  return {
    profiles: data?.profiles ?? [],
    revision: data?.revision ?? 0,
    draft,
    dirty: Object.keys(draft).length > 0,
    loading,
    isInitialLoading: loading && !resolved,
    isRefreshing: loading && resolved,
    saving,
    error,
    conflict,
    refresh,
    choose,
    cancel,
    save,
  };
}
