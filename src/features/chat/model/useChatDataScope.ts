import { useCallback, useEffect, useRef, useState } from "react";
import {
  getChatDataScopePreference,
  listChatDataResources,
  replaceChatDataScopePreference,
} from "../api/chatDataScopeApi";
import {
  allChatDataScope,
  createChatDataScopeFromExclusions,
  isSelectableChatDataResource,
  type ChatDataResource,
  type ChatDataScope,
} from "./chatDataScope";

const PREFERENCE_WRITE_DEBOUNCE_MS = 150;

export function useChatDataScope(
  userId: string,
  organizationId: string,
  workspaceId: string,
) {
  const [resources, setResources] = useState<ChatDataResource[]>([]);
  const [scope, setScope] = useState<ChatDataScope>(allChatDataScope);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const writeVersionRef = useRef(0);
  const resourcesRef = useRef<ChatDataResource[]>([]);
  const excludedResourceIdsRef = useRef<string[]>([]);
  const preferenceKeyRef = useRef("");
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeAbortRef = useRef<AbortController | null>(null);
  const preferenceKey = `${userId}:${organizationId}:${workspaceId}`;

  const loadResources = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestIdRef.current;
      const loadWriteVersion = writeVersionRef.current;
      if (!userId || !organizationId || !workspaceId) {
        resourcesRef.current = [];
        excludedResourceIdsRef.current = [];
        setResources([]);
        setScope(allChatDataScope);
        setError(null);
        setPreferenceError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPreferenceError(null);
      const requestSignal = signal ?? new AbortController().signal;
      const [resourceResult, preferenceResult] = await Promise.allSettled([
        listChatDataResources(organizationId, workspaceId, requestSignal),
        getChatDataScopePreference(workspaceId, requestSignal),
      ]);

      if (requestSignal.aborted || requestId !== requestIdRef.current) return;

      let nextResources = resourcesRef.current;
      if (resourceResult.status === "fulfilled") {
        nextResources = resourceResult.value;
        resourcesRef.current = nextResources;
        setResources(nextResources);
      } else {
        setError(
          toErrorMessage(
            resourceResult.reason,
            "Unable to load workspace data.",
          ),
        );
      }

      const selectableIds = new Set(
        nextResources
          .filter(isSelectableChatDataResource)
          .map((resource) => resource.id),
      );
      const currentWriteIsUnchanged =
        loadWriteVersion === writeVersionRef.current;
      if (preferenceResult.status === "fulfilled" && currentWriteIsUnchanged) {
        excludedResourceIdsRef.current =
          preferenceResult.value.excludedResourceIds.filter((resourceId) =>
            selectableIds.has(resourceId),
          );
        setPreferenceError(null);
      } else if (preferenceResult.status === "rejected") {
        setPreferenceError(
          toErrorMessage(
            preferenceResult.reason,
            "Unable to load saved chat file selection.",
          ),
        );
        excludedResourceIdsRef.current = excludedResourceIdsRef.current.filter(
          (resourceId) => selectableIds.has(resourceId),
        );
      }

      setScope(
        createChatDataScopeFromExclusions(
          nextResources,
          excludedResourceIdsRef.current,
        ),
      );
      setLoading(false);
    },
    [organizationId, preferenceKey, userId, workspaceId],
  );

  const schedulePreferenceWrite = useCallback(
    (excludedResourceIds: string[], version: number, key: string) => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeAbortRef.current?.abort();
      writeAbortRef.current = null;

      writeTimerRef.current = setTimeout(() => {
        writeTimerRef.current = null;
        if (
          preferenceKeyRef.current !== key ||
          writeVersionRef.current !== version
        ) {
          return;
        }

        const controller = new AbortController();
        writeAbortRef.current = controller;
        void replaceChatDataScopePreference(
          workspaceId,
          excludedResourceIds,
          controller.signal,
        )
          .then(() => {
            if (
              !controller.signal.aborted &&
              preferenceKeyRef.current === key &&
              writeVersionRef.current === version
            ) {
              setPreferenceError(null);
            }
          })
          .catch((requestError: unknown) => {
            if (
              controller.signal.aborted ||
              preferenceKeyRef.current !== key ||
              writeVersionRef.current !== version
            ) {
              return;
            }
            setPreferenceError(
              toErrorMessage(
                requestError,
                "Unable to save chat file selection.",
              ),
            );
          });
      }, PREFERENCE_WRITE_DEBOUNCE_MS);
    },
    [workspaceId],
  );

  useEffect(() => {
    preferenceKeyRef.current = preferenceKey;
    writeVersionRef.current += 1;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = null;
    writeAbortRef.current?.abort();
    writeAbortRef.current = null;
    resourcesRef.current = [];
    excludedResourceIdsRef.current = [];
    setResources([]);
    setScope(allChatDataScope);
    setPreferenceError(null);

    const controller = new AbortController();
    void loadResources(controller.signal);

    return () => {
      controller.abort();
      writeAbortRef.current?.abort();
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    };
  }, [loadResources, preferenceKey]);

  const changeScope = useCallback(
    (nextScope: ChatDataScope) => {
      const selectableIds = resources
        .filter(isSelectableChatDataResource)
        .map((resource) => resource.id);
      const selectedIds = new Set(
        nextScope.mode === "all"
          ? selectableIds
          : nextScope.mode === "selected"
            ? nextScope.resourceIds
            : [],
      );
      const nextExcludedResourceIds =
        nextScope.mode === "all"
          ? []
          : selectableIds.filter((resourceId) => !selectedIds.has(resourceId));

      excludedResourceIdsRef.current = nextExcludedResourceIds;
      setScope(
        resources.length > 0
          ? createChatDataScopeFromExclusions(
              resources,
              nextExcludedResourceIds,
            )
          : nextScope,
      );
      setPreferenceError(null);
      const version = ++writeVersionRef.current;
      schedulePreferenceWrite(nextExcludedResourceIds, version, preferenceKey);
    },
    [preferenceKey, resources, schedulePreferenceWrite],
  );

  const refresh = useCallback(() => {
    void loadResources();
  }, [loadResources]);

  return {
    resources,
    scope,
    loading,
    error,
    preferenceError,
    changeScope,
    refresh,
  };
}

function toErrorMessage(value: unknown, fallback: string) {
  return value instanceof Error && value.message ? value.message : fallback;
}
