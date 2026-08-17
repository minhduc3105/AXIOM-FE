import { useEffect, useState } from "react";
import { getToolsErrorKind, listTools } from "../api/toolsApi";
import type { ToolCatalogFilters, ToolCatalogResponse } from "./types";

export function useToolCatalog(filters: ToolCatalogFilters) {
  const [catalog, setCatalog] = useState<ToolCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ReturnType<typeof getToolsErrorKind> | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setErrorKind(null);
    const timer = window.setTimeout(() => {
      void listTools(filters, controller.signal)
        .then((response) => {
          setCatalog(response);
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Methods-Hub is unavailable.",
          );
          setErrorKind(getToolsErrorKind(requestError));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters.kind, filters.query, refreshToken]);

  return {
    catalog,
    loading,
    error,
    errorKind,
    refresh: () => setRefreshToken((current) => current + 1),
  };
}
