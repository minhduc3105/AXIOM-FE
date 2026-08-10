import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  createInvestigation,
  createProcessEvents,
  loadConversationHistory,
  reviseInvestigation,
  runWorkflow,
} from "../api/chatApi";
import type {
  ChatEngine,
  ChatTurn,
  ChatWorkflowState,
  EditableSpecification,
  Investigation,
  MockResult,
  ProcessEvent,
} from "./types";

const initialState: ChatWorkflowState = {
  activeConversationId: null,
  stage: "welcome",
  evidenceOpen: false,
  investigation: null,
  draft: null,
  approvedSpecification: null,
  processEvents: createProcessEvents(),
  result: null,
  history: [],
  loading: false,
  error: null,
};

type Action =
  | {
      type: "submit/start";
      investigation: Investigation;
      conversationId: string | null;
    }
  | {
      type: "submit/stream";
      investigation: Investigation;
      result: MockResult;
    }
  | { type: "submit/confirmation"; investigation: Investigation }
  | {
      type: "submit/completed";
      investigation: Investigation;
      result: MockResult;
      processEvents: ProcessEvent[];
    }
  | { type: "draft/update"; specification: EditableSpecification }
  | { type: "draft/reset" }
  | { type: "draft/revise-start" }
  | { type: "draft/revise-success"; investigation: Investigation }
  | { type: "process/start"; specification: EditableSpecification }
  | { type: "process/events"; events: ProcessEvent[] }
  | { type: "process/success"; result: MockResult; evidenceOpen: boolean }
  | { type: "request/failure"; message: string }
  | {
      type: "conversation/load-start";
      conversationId: string;
      investigation: Investigation;
    }
  | {
      type: "conversation/load-cached";
      conversationId: string;
      cached: CachedConversationState;
    }
  | {
      type: "conversation/load-success";
      history: ChatTurn[];
      investigation: Investigation | null;
      result: MockResult | null;
      processEvents: ProcessEvent[];
      pendingInvestigation: Investigation | null;
      pendingQuestion: string | null;
      pendingResponse: boolean;
    }
  | { type: "evidence/open" }
  | { type: "evidence/close" }
  | { type: "chat/new" };

function reducer(state: ChatWorkflowState, action: Action): ChatWorkflowState {
  switch (action.type) {
    case "submit/start":
      return {
        ...state,
        activeConversationId: action.conversationId,
        stage: "pending",
        evidenceOpen: false,
        investigation: action.investigation,
        draft: {
          intent: action.investigation.intent,
          specMarkdown: action.investigation.specMarkdown,
        },
        approvedSpecification: null,
        processEvents: createProcessEvents(),
        result: null,
        history:
          state.investigation && state.result
            ? [
                ...state.history,
                {
                  investigation: state.investigation,
                  result: state.result,
                  processEvents: state.processEvents,
                },
              ]
            : state.history,
        loading: true,
        error: null,
      };
    case "submit/stream":
      return {
        ...state,
        stage: "result",
        evidenceOpen: false,
        investigation: action.investigation,
        draft: null,
        approvedSpecification: null,
        result: action.result,
        loading: true,
        error: null,
      };
    case "submit/confirmation":
      return {
        ...state,
        stage: "intent",
        investigation: action.investigation,
        draft: {
          intent: action.investigation.intent,
          specMarkdown: action.investigation.specMarkdown,
        },
        loading: false,
      };
    case "submit/completed":
      return {
        ...state,
        stage: "result",
        evidenceOpen: false,
        investigation: action.investigation,
        draft: null,
        approvedSpecification: null,
        processEvents: action.processEvents,
        result: action.result,
        loading: false,
        error: null,
      };
    case "draft/update":
      return state.stage === "intent"
        ? { ...state, draft: action.specification, error: null }
        : state;
    case "draft/reset":
      return state.investigation
        ? {
            ...state,
            draft: {
              intent: state.investigation.intent,
              specMarkdown: state.investigation.specMarkdown,
            },
            error: null,
          }
        : state;
    case "draft/revise-start":
      return { ...state, loading: true, error: null };
    case "draft/revise-success":
      return {
        ...state,
        stage: "intent",
        investigation: action.investigation,
        draft: {
          intent: action.investigation.intent,
          specMarkdown: action.investigation.specMarkdown,
        },
        loading: false,
        error: null,
      };
    case "process/start":
      return {
        ...state,
        stage: "process",
        evidenceOpen: false,
        investigation: state.investigation
          ? { ...state.investigation, ...action.specification }
          : state.investigation,
        draft: action.specification,
        approvedSpecification: action.specification,
        processEvents: createProcessEvents(),
        result: null,
        loading: true,
        error: null,
      };
    case "process/events":
      return {
        ...state,
        processEvents: action.events,
      };
    case "process/success":
      return {
        ...state,
        stage: "result",
        result: action.result,
        evidenceOpen: action.evidenceOpen,
        loading: false,
      };
    case "request/failure":
      return {
        ...state,
        processEvents:
          state.stage === "process"
            ? markActiveProcessEventFailed(state.processEvents)
            : state.processEvents,
        loading: false,
        error: action.message,
      };
    case "conversation/load-start":
      return {
        ...state,
        activeConversationId: action.conversationId,
        stage: "pending",
        evidenceOpen: false,
        investigation: action.investigation,
        draft: null,
        approvedSpecification: null,
        processEvents: createProcessEvents(),
        result: null,
        history: [],
        loading: true,
        error: null,
      };
    case "conversation/load-cached":
      return {
        ...state,
        ...action.cached,
        activeConversationId: action.conversationId,
        loading: true,
        error: null,
      };
    case "conversation/load-success":
      if (action.investigation && action.result) {
        return {
          ...state,
          stage: "result",
          evidenceOpen: false,
          investigation: action.investigation,
          draft: null,
          approvedSpecification: null,
          processEvents: action.processEvents,
          result: action.result,
          history: action.history,
          loading: action.pendingResponse,
          error: null,
        };
      }
      if (action.pendingInvestigation) {
        return {
          ...state,
          stage: "intent",
          evidenceOpen: false,
          investigation: action.pendingInvestigation,
          draft: {
            intent: action.pendingInvestigation.intent,
            specMarkdown: action.pendingInvestigation.specMarkdown,
          },
          approvedSpecification: null,
          processEvents: createProcessEvents(),
          result: null,
          history: action.history,
          loading: false,
          error: null,
        };
      }
      if (action.pendingQuestion) {
        return {
          ...state,
          stage: "pending",
          evidenceOpen: false,
          investigation: optimisticInvestigation(action.pendingQuestion),
          draft: null,
          approvedSpecification: null,
          processEvents: createProcessEvents(),
          result: null,
          history: action.history,
          loading: true,
          error: null,
        };
      }
      return { ...initialState, error: null };
    case "evidence/open":
      return state.result ? { ...state, evidenceOpen: true } : state;
    case "evidence/close":
      return { ...state, evidenceOpen: false };
    case "chat/new":
      return initialState;
    default:
      return state;
  }
}

const optimisticInvestigation = (question: string): Investigation => ({
  question,
  confidence: 94,
  intent: "generate_revenue_report",
  scope: "Q3 revenue, payments",
  specMarkdown:
    "# Investigation plan\n\nAXIOM is preparing the workflow specification.",
  policy: "Strict · read-only sandbox · external network blocked",
  output: "Reviewed markdown answer with cited evidence",
});

const streamingDirectAnswerInvestigation = (question: string): Investigation => ({
  question,
  confidence: 100,
  intent: "general_direct",
  scope: "Answered from general knowledge or conversation context.",
  specMarkdown: "",
  policy: "No data workflow or engine execution was required.",
  output: "Direct answer",
});

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function markActiveProcessEventFailed(events: ProcessEvent[]): ProcessEvent[] {
  if (events.length === 0) return events;

  let runningIndex = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.status === "running") {
      runningIndex = index;
      break;
    }
  }
  const failedIndex = runningIndex >= 0 ? runningIndex : events.length - 1;

  return events.map((event, index) =>
    index === failedIndex ? { ...event, status: "failed" } : event,
  );
}

type CachedConversationState = Pick<
  ChatWorkflowState,
  | "stage"
  | "evidenceOpen"
  | "investigation"
  | "draft"
  | "approvedSpecification"
  | "processEvents"
  | "result"
  | "history"
  | "loading"
  | "error"
>;

const conversationStateCache = new Map<string, CachedConversationState>();

function cacheConversationState(state: ChatWorkflowState) {
  if (!state.activeConversationId || state.stage === "welcome") return;
  conversationStateCache.set(state.activeConversationId, {
    stage: state.stage,
    evidenceOpen: state.evidenceOpen,
    investigation: state.investigation,
    draft: state.draft,
    approvedSpecification: state.approvedSpecification,
    processEvents: state.processEvents,
    result: state.result,
    history: state.history,
    loading: state.loading,
    error: state.error,
  });
}

function waitForPendingConversationPoll(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, 700);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException("The request was aborted.", "AbortError"));
      },
      { once: true },
    );
  });
}

export function useChatWorkflow() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    cacheConversationState(state);
  }, [state]);

  const cancelCurrentRequest = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  useEffect(() => cancelCurrentRequest, [cancelCurrentRequest]);

  const submitQuestion = useCallback(
    async (
      question: string,
      conversationId: string | null = null,
      engine: ChatEngine = "auto",
      files: File[] = [],
    ) => {
      cancelCurrentRequest();
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch({
        type: "submit/start",
        investigation: optimisticInvestigation(question),
        conversationId,
      });

      try {
        const outcome = await createInvestigation(
          question,
          conversationId,
          engine,
          controller.signal,
          {
            files,
            onOutputText: (result) =>
              dispatch({
                type: "submit/stream",
                investigation: streamingDirectAnswerInvestigation(question),
                result,
              }),
            onProcessEvents: (events) =>
              dispatch({ type: "process/events", events }),
          },
        );
        if (outcome.kind === "completed") {
          dispatch({
            type: "submit/completed",
            investigation: outcome.investigation,
            result: outcome.result,
            processEvents: outcome.processEvents,
          });
        } else {
          dispatch({
            type: "submit/confirmation",
            investigation: outcome.investigation,
          });
        }
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "request/failure",
            message:
              error instanceof Error
                ? error.message
                : "Unable to create investigation.",
          });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [cancelCurrentRequest],
  );

  const startProcess = useCallback(
    async (specification: EditableSpecification) => {
      cancelCurrentRequest();
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch({ type: "process/start", specification });

      try {
        const result = await runWorkflow(
          specification,
          (events) => dispatch({ type: "process/events", events }),
          controller.signal,
        );
        dispatch({ type: "process/success", result, evidenceOpen: false });
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "request/failure",
            message:
              error instanceof Error
                ? error.message
                : "The workflow request failed.",
          });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [cancelCurrentRequest],
  );

  const updateSpecification = useCallback(
    (specification: EditableSpecification) => {
      dispatch({ type: "draft/update", specification });
    },
    [],
  );

  const resetSpecification = useCallback(
    () => dispatch({ type: "draft/reset" }),
    [],
  );

  const reviseSpecification = useCallback(
    async (feedback: string) => {
      const prompt = feedback.trim();
      if (
        state.loading ||
        state.stage !== "intent" ||
        !state.draft ||
        !state.investigation ||
        !prompt
      )
        return;

      cancelCurrentRequest();
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch({ type: "draft/revise-start" });

      try {
        const investigation = await reviseInvestigation(
          {
            intent: state.draft.intent.trim(),
            specMarkdown: state.draft.specMarkdown.trim(),
          },
          prompt,
          state.investigation.question,
          controller.signal,
        );
        dispatch({ type: "draft/revise-success", investigation });
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "request/failure",
            message:
              error instanceof Error
                ? error.message
                : "Unable to revise the specification.",
          });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [
      cancelCurrentRequest,
      state.draft,
      state.investigation,
      state.loading,
      state.stage,
    ],
  );

  const approveAndRun = useCallback(() => {
    if (state.loading || state.stage !== "intent" || !state.draft) return;
    const specification = {
      intent: state.draft.intent.trim(),
      specMarkdown: state.draft.specMarkdown.trim(),
    };
    if (!specification.intent || !specification.specMarkdown) {
      dispatch({
        type: "request/failure",
        message:
          "Intent and specification are required before running the workflow.",
      });
      return;
    }
    void startProcess(specification);
  }, [startProcess, state.draft, state.loading, state.stage]);

  const retryProcess = useCallback(() => {
    if (state.loading || !state.approvedSpecification) return;
    void startProcess(state.approvedSpecification);
  }, [startProcess, state.approvedSpecification, state.loading]);

  const loadConversation = useCallback(
    async (conversationId: string) => {
      cancelCurrentRequest();
      const controller = new AbortController();
      requestRef.current = controller;
      const cached = conversationStateCache.get(conversationId) ?? null;
      if (cached) {
        dispatch({
          type: "conversation/load-cached",
          conversationId,
          cached,
        });
      } else {
        dispatch({
          type: "conversation/load-start",
          conversationId,
          investigation: optimisticInvestigation(
            "Loading conversation history...",
          ),
        });
      }

      try {
        let snapshot = await loadConversationHistory(
          conversationId,
          controller.signal,
        );
        let shouldContinuePolling = true;

        while (shouldContinuePolling) {
          const activeTurn = snapshot.turns[snapshot.turns.length - 1] || null;
          const hasHydratedContent =
            Boolean(activeTurn || snapshot.pendingInvestigation) || !cached;
          if (hasHydratedContent) {
            dispatch({
              type: "conversation/load-success",
              history: activeTurn ? snapshot.turns.slice(0, -1) : snapshot.turns,
              investigation: activeTurn?.investigation || null,
              result: activeTurn?.result || null,
              processEvents: activeTurn?.processEvents || createProcessEvents(),
              pendingInvestigation: snapshot.pendingInvestigation,
              pendingQuestion: snapshot.pendingQuestion,
              pendingResponse: snapshot.pendingResponse,
            });
          }

          shouldContinuePolling = Boolean(
            (snapshot.pendingResponse ||
              (!activeTurn &&
                !snapshot.pendingInvestigation &&
                snapshot.pendingQuestion)) &&
              !controller.signal.aborted,
          );
          if (shouldContinuePolling) {
            await waitForPendingConversationPoll(controller.signal);
            snapshot = await loadConversationHistory(
              conversationId,
              controller.signal,
            );
          }
        }
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "request/failure",
            message:
              error instanceof Error
                ? error.message
                : "Unable to load conversation history.",
          });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [cancelCurrentRequest],
  );

  const newChat = useCallback(() => {
    cancelCurrentRequest();
    dispatch({ type: "chat/new" });
  }, [cancelCurrentRequest]);

  const openEvidence = useCallback(
    () => dispatch({ type: "evidence/open" }),
    [],
  );
  const closeEvidence = useCallback(
    () => dispatch({ type: "evidence/close" }),
    [],
  );

  return {
    ...state,
    submitQuestion,
    updateSpecification,
    resetSpecification,
    reviseSpecification,
    approveAndRun,
    retryProcess,
    loadConversation,
    newChat,
    openEvidence,
    closeEvidence,
  };
}
