import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    setScope(allChatDataScope);
    setResources([]);
    setError(null);
    if (!organizationId || !workspaceId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    void listChatDataResources(organizationId, workspaceId, controller.signal)
      .then(setResources)
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load workspace data.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [organizationId, workspaceId]);

  const changeScope = useCallback((nextScope: ChatDataScope) => {
    setScope(nextScope);
  }, []);

  return {
    resources,
    scope,
    loading,
    error,
    changeScope,
  };
}
