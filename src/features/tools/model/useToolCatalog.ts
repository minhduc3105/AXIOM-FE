import { useEffect, useState } from "react";
import { listTools } from "../api/toolsApi";
import { getMockToolCatalog } from "./mockTools";
import type {
  CatalogSource,
  ToolCatalogFilters,
  ToolCatalogResponse,
} from "./types";

export function useToolCatalog(filters: ToolCatalogFilters) {
  const [catalog, setCatalog] = useState<ToolCatalogResponse | null>(null);
  const [source, setSource] = useState<CatalogSource>("api");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void listTools(filters, controller.signal)
        .then((response) => {
          setCatalog(response);
          setSource("api");
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;
          setCatalog(getMockToolCatalog(filters));
          setSource("sample");
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Methods-Hub is unavailable.",
          );
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
    source,
    loading,
    error,
    refresh: () => setRefreshToken((current) => current + 1),
  };
}
