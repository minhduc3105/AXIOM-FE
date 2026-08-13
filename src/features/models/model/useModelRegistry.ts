import { useCallback, useEffect, useState } from "react";
import { listProviderModels, listProviders, type ModelRegistryContext } from "../api/modelServiceApi";
import type { ProviderModelView, ProviderView } from "./registryTypes";

export function useModelRegistry(context: ModelRegistryContext | null) {
  const [providers, setProviders] = useState<ProviderView[]>([]);
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, ProviderModelView[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!context) return;
    setLoading(true);
    setError(null);
    setWarning(null);
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
      const failedCount = results.length - modelResults.length;
      if (failedCount) {
        setWarning(
          `${failedCount} provider model ${failedCount === 1 ? "inventory" : "inventories"} could not be loaded. Existing results are still available.`,
        );
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Unable to load organization models.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return { providers, modelsByProvider, loading, error, warning, refresh };
}
