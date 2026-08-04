import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listDeployments,
  listModels,
  listProviders,
} from "../api/modelServiceApi";
import type {
  DeploymentView,
  LogicalModelView,
  ModelCapability,
  ProviderView,
} from "./registryTypes";

export function useModelRegistry(capability?: ModelCapability) {
  const [providers, setProviders] = useState<ProviderView[]>([]);
  const [models, setModels] = useState<LogicalModelView[]>([]);
  const [deployments, setDeployments] = useState<
    Record<string, DeploymentView[]>
  >({});
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () =>
      models.find((model) => model.id === selectedModelId) ?? models[0] ?? null,
    [models, selectedModelId],
  );

  const selectedDeployments = selectedModel
    ? (deployments[selectedModel.id] ?? [])
    : [];

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [nextProviders, nextModels] = await Promise.all([
          listProviders(signal),
          listModels(signal, capability),
        ]);
        const deploymentResults = await Promise.allSettled(
          nextModels.map(
            async (model) =>
              [model.id, await listDeployments(model.id, signal)] as const,
          ),
        );
        setProviders(nextProviders);
        setModels(nextModels);
        setDeployments(
          Object.fromEntries(
            deploymentResults
              .filter((result) => result.status === "fulfilled")
              .map((result) => result.value),
          ),
        );
        setSelectedModelId((current) => {
          if (current && nextModels.some((model) => model.id === current)) {
            return current;
          }
          return nextModels[0]?.id ?? null;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load Model Service registry.",
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [capability],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!selectedModel || deployments[selectedModel.id]) return;
    const controller = new AbortController();

    listDeployments(selectedModel.id, controller.signal)
      .then((items) =>
        setDeployments((current) => ({
          ...current,
          [selectedModel.id]: items,
        })),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load model deployments.",
        );
      });

    return () => controller.abort();
  }, [deployments, selectedModel]);

  const refreshDeployments = useCallback(async (modelId: string) => {
    const items = await listDeployments(modelId);
    setDeployments((current) => ({ ...current, [modelId]: items }));
  }, []);

  return {
    providers,
    models,
    deployments,
    selectedModel,
    selectedDeployments,
    loading,
    error,
    setSelectedModelId,
    refresh,
    refreshDeployments,
  };
}
