import { useEffect, useState } from "react";
import { getTool } from "../api/toolsApi";
import { getMockToolDetail } from "./mockTools";
import type { CatalogSource, ToolDetail } from "./types";

export function useToolDetail(toolName: string) {
  const [tool, setTool] = useState<ToolDetail | null>(null);
  const [source, setSource] = useState<CatalogSource>("api");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setTool(null);

    void getTool(toolName, controller.signal)
      .then((response) => {
        setTool(response.tool);
        setSource("api");
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setTool(getMockToolDetail(toolName));
        setSource("sample");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load this tool.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [toolName, refreshToken]);

  return {
    tool,
    source,
    loading,
    error,
    refresh: () => setRefreshToken((current) => current + 1),
  };
}
