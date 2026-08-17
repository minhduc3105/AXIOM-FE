import { useCallback, useEffect, useState } from "react";
import { ModelServiceApiError, listProviderModels, listProviders, type ModelRegistryContext } from "../api/modelServiceApi";
import type { ProviderModelView, ProviderView } from "./registryTypes";

export type RegistryLoadError = {
  message: string;
  status: number | null;
  retryable: boolean;
};

function toLoadError(cause: unknown, subject: string): RegistryLoadError {
  if (cause instanceof ModelServiceApiError) {
    if (cause.status === 401) return { message: "Your session has expired. Sign in again to view Model Service.", status: 401, retryable: false };
    if (cause.status === 403) return { message: "You do not have permission to view this Model Service configuration.", status: 403, retryable: false };
    if (cause.status === 409) return { message: "This configuration changed while it was loading. Try again to retrieve the latest version.", status: 409, retryable: true };
    if (cause.status >= 500) return { message: "Model Service is temporarily unavailable. Please try again shortly.", status: cause.status, retryable: true };
    return { message: cause.message || `Unable to load ${subject}.`, status: cause.status, retryable: false };
  }
  return { message: `Network error while loading ${subject}. Check your connection and retry.`, status: null, retryable: true };
}

export function useModelRegistry(context: ModelRegistryContext | null) {
  const [providers, setProviders] = useState<ProviderView[]>([]);
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, ProviderModelView[]>>({});
  const [loading, setLoading] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);
  const [error, setError] = useState<RegistryLoadError | null>(null);
  const [modelLoadErrors, setModelLoadErrors] = useState<Record<string, RegistryLoadError>>({});

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!context) return;
    setLoading(true);
    setError(null);
    try {
      const nextProviders = await listProviders(context, signal);
      const results = await Promise.allSettled(
        nextProviders.map(async (provider) =>
          [provider.id, await listProviderModels(context, provider.id, signal)] as const,
        ),
      );
      if (signal?.aborted) return;
      const modelResults = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      setProviders(nextProviders);
      setModelsByProvider((current) => ({
        ...current,
        ...Object.fromEntries(modelResults),
      }));
      setModelLoadErrors(Object.fromEntries(
        results.flatMap((result, index) => result.status === "rejected"
          ? ([[nextProviders[index].id, toLoadError(result.reason, `models for ${nextProviders[index].display_name}`)]] as const)
          : []),
      ));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(toLoadError(cause, "providers"));
    } finally {
      if (!signal?.aborted) {
        setHasResolved(true);
        setLoading(false);
      }
    }
  }, [context]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const replaceProvider = useCallback((nextProvider: ProviderView) => {
    setProviders((current) => current.map((provider) =>
      provider.id === nextProvider.id ? nextProvider : provider,
    ));
  }, []);

  const replaceModel = useCallback((nextModel: ProviderModelView) => {
    setModelsByProvider((current) => ({
      ...current,
      [nextModel.provider_id]: (current[nextModel.provider_id] ?? []).map((model) =>
        model.resource_id === nextModel.resource_id ? nextModel : model,
      ),
    }));
  }, []);

  return {
    providers,
    modelsByProvider,
    loading,
    isInitialLoading: loading && !hasResolved,
    isRefreshing: loading && hasResolved,
    error,
    modelLoadErrors,
    refresh,
    replaceProvider,
    replaceModel,
  };
}
