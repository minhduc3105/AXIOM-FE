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
  | { type: "submit/start"; investigation: Investigation }
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
  | { type: "conversation/load-start"; investigation: Investigation }
  | {
      type: "conversation/load-success";
      history: ChatTurn[];
      investigation: Investigation | null;
      result: MockResult | null;
      processEvents: ProcessEvent[];
      pendingInvestigation: Investigation | null;
      pendingQuestion: string | null;
    }
  | { type: "evidence/open" }
  | { type: "evidence/close" }
  | { type: "chat/new" };

function reducer(state: ChatWorkflowState, action: Action): ChatWorkflowState {
  switch (action.type) {
    case "submit/start":
      return {
        ...state,
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
      return { ...state, loading: false, error: action.message };
    case "conversation/load-start":
      return {
        ...state,
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
          loading: false,
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
          loading: false,
          error:
            "This conversation does not have a completed assistant response yet.",
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

export function useChatWorkflow() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const requestRef = useRef<AbortController | null>(null);

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
    ) => {
      cancelCurrentRequest();
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch({
        type: "submit/start",
        investigation: optimisticInvestigation(question),
      });

      try {
        const outcome = await createInvestigation(
          question,
          conversationId,
          engine,
          controller.signal,
          (result) =>
            dispatch({
              type: "submit/stream",
              investigation: streamingDirectAnswerInvestigation(question),
              result,
            }),
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
      dispatch({
        type: "conversation/load-start",
        investigation: optimisticInvestigation(
          "Loading conversation history...",
        ),
      });

      try {
        const snapshot = await loadConversationHistory(
          conversationId,
          controller.signal,
        );
        const activeTurn = snapshot.turns[snapshot.turns.length - 1] || null;
        dispatch({
          type: "conversation/load-success",
          history: activeTurn ? snapshot.turns.slice(0, -1) : snapshot.turns,
          investigation: activeTurn?.investigation || null,
          result: activeTurn?.result || null,
          processEvents: activeTurn?.processEvents || createProcessEvents(),
          pendingInvestigation: snapshot.pendingInvestigation,
          pendingQuestion: snapshot.pendingQuestion,
        });
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
