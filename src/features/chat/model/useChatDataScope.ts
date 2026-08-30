import { useCallback, useEffect, useRef, useState } from "react";
import { listChatDataResources } from "../api/chatDataScopeApi";
import {
  allChatDataScope,
  type ChatDataResource,
  type ChatDataScope,
} from "./chatDataScope";

export function useChatDataScope(
  organizationId: string,
  workspaceId: string,
) {
  const [resources, setResources] = useState<ChatDataResource[]>([]);
  const [scope, setScope] = useState<ChatDataScope>(allChatDataScope);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadResources = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestIdRef.current;
      if (!organizationId || !workspaceId) {
        setResources([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const nextResources = await listChatDataResources(
          organizationId,
          workspaceId,
          signal,
        );
        if (requestId === requestIdRef.current) {
          setResources(nextResources);
        }
      } catch (requestError: unknown) {
        if (signal?.aborted || requestId !== requestIdRef.current) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load workspace data.",
        );
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [organizationId, workspaceId],
  );

  useEffect(() => {
    setScope(allChatDataScope);
    const controller = new AbortController();
    void loadResources(controller.signal);

    return () => controller.abort();
  }, [loadResources]);

  const changeScope = useCallback((nextScope: ChatDataScope) => {
    setScope(nextScope);
  }, []);

  const refresh = useCallback(() => {
    void loadResources();
  }, [loadResources]);

  return {
    resources,
    scope,
    loading,
    error,
    changeScope,
    refresh,
  };
}
