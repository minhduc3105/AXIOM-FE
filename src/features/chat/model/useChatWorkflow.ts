import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  cancelPendingResponse,
  createInvestigation,
  createProcessEvents,
  loadConversationHistory,
  reviseInvestigation,
  runWorkflow,
  submitUserInput as submitUserInputRequest,
} from "../api/chatApi";
import { createConversation } from "@/shared/lib/intelligence-api";
import { getChatError, type ChatError } from "./chatError";
import type {
  ChatAttachment,
  ChatEngine,
  ChatExecutionMode,
  ChatTranscriptItem,
  ChatTurn,
  ChatWorkflowState,
  EditableSpecification,
  Investigation,
  MockResult,
  PendingUserInput,
  ProcessEvent,
  UserInputAnswer,
} from "./types";
import { chatDataScopeLabel, type ChatDataScope } from "./chatDataScope";

const initialState: ChatWorkflowState = {
  activeConversationId: null,
  executionMode: "instant",
  stage: "welcome",
  evidenceOpen: false,
  investigation: null,
  draft: null,
  approvedSpecification: null,
  processEvents: createProcessEvents(),
  transcript: [],
  result: null,
  history: [],
  historyLoading: false,
  loading: false,
  error: null,
  pendingUserInput: null,
};

type Action =
  | { type: "answer/completed"; result: MockResult }
  | {
      type: "submit/start";
      investigation: Investigation;
      conversationId: string | null;
      executionMode: ChatExecutionMode;
      replaceCurrent: boolean;
    }
  | { type: "conversation/created"; conversationId: string }
  | {
      type: "submit/stream";
      investigation: Investigation;
      result: MockResult;
      executionMode: ChatExecutionMode;
    }
  | { type: "submit/confirmation"; investigation: Investigation }
  | {
      type: "submit/user-input-required";
      investigation: Investigation;
      interaction: PendingUserInput;
    }
  | { type: "user-input/start" }
  | {
      type: "user-input/completed";
      result: MockResult;
      processEvents: ProcessEvent[];
      transcript: ChatTranscriptItem[];
    }
  | {
      type: "user-input/required";
      interaction: PendingUserInput;
      processEvents: ProcessEvent[];
      transcript: ChatTranscriptItem[];
    }
  | { type: "user-input/cancelled" }
  | {
      type: "submit/completed";
      investigation: Investigation;
      result: MockResult;
      processEvents: ProcessEvent[];
      transcript: ChatTranscriptItem[];
      executionMode: ChatExecutionMode;
    }
  | { type: "draft/update"; specification: EditableSpecification }
  | { type: "draft/reset" }
  | { type: "draft/revise-start" }
  | { type: "draft/revise-success"; investigation: Investigation }
  | { type: "process/start"; specification: EditableSpecification }
  | { type: "process/events"; events: ProcessEvent[] }
  | { type: "process/transcript"; transcript: ChatTranscriptItem[] }
  | { type: "process/success"; result: MockResult; evidenceOpen: boolean }
  | { type: "request/failure"; error: ChatError }
  | { type: "request/stop" }
  | {
      type: "conversation/load-start";
      conversationId: string;
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
      error: ChatError | null;
      processEvents: ProcessEvent[];
      transcript: ChatTranscriptItem[];
      pendingInvestigation: Investigation | null;
      pendingQuestion: string | null;
      pendingExecutionMode: ChatExecutionMode;
      pendingResponse: boolean;
      pendingUserInput: PendingUserInput | null;
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
        executionMode: action.executionMode,
        stage: "pending",
        evidenceOpen: false,
        investigation: action.investigation,
        draft: null,
        approvedSpecification: null,
        processEvents: createProcessEvents(),
        transcript: [],
        result: null,
        pendingUserInput: null,
        history:
          !action.replaceCurrent &&
          state.investigation &&
          (state.result || state.error)
            ? [
                ...state.history,
                {
                  executionMode: state.executionMode,
                  investigation: state.investigation,
                  result: state.result,
                  error: state.error,
                  processEvents: state.processEvents,
                  transcript: state.transcript,
                },
              ]
            : state.history,
        loading: true,
        historyLoading: false,
        error: null,
      };
    case "conversation/created":
      return { ...state, activeConversationId: action.conversationId };
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
        executionMode: "thinking",
        stage: "intent",
        investigation: action.investigation,
        draft: {
          intent: action.investigation.intent,
          specMarkdown: action.investigation.specMarkdown,
        },
        loading: false,
        pendingUserInput: null,
      };
    case "submit/user-input-required":
      return {
        ...state,
        stage: "pending",
        investigation: action.investigation,
        draft: null,
        approvedSpecification: null,
        processEvents: createProcessEvents(),
        transcript: [],
        result: null,
        pendingUserInput: action.interaction,
        loading: false,
        error: null,
      };
    case "user-input/start":
      return { ...state, loading: true, error: null };
    case "user-input/completed":
      return {
        ...state,
        stage: "result",
        result: { ...action.result, responseComplete: true },
        processEvents: action.processEvents,
        transcript: action.transcript,
        pendingUserInput: null,
        loading: false,
        error: null,
      };
    case "user-input/required":
      return {
        ...state,
        stage: "pending",
        processEvents: action.processEvents,
        transcript: action.transcript,
        result: null,
        pendingUserInput: action.interaction,
        loading: false,
        error: null,
      };
    case "user-input/cancelled":
      return {
        ...state,
        pendingUserInput: null,
        loading: false,
        error: null,
      };
    case "answer/completed":
      return {
        ...state,
        stage: "result",
        result: { ...action.result, responseComplete: true },
      };
    case "submit/completed":
      return {
        ...state,
        executionMode: action.executionMode,
        stage: "result",
        evidenceOpen: false,
        investigation: action.investigation,
        draft: null,
        approvedSpecification: null,
        processEvents: action.processEvents,
        transcript: action.transcript,
        result: action.result,
        loading: false,
        error: null,
        pendingUserInput: null,
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
        transcript: [],
        result: null,
        loading: true,
        error: null,
      };
    case "process/events":
      return {
        ...state,
        processEvents: action.events,
      };
    case "process/transcript":
      return {
        ...state,
        transcript: action.transcript,
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
        historyLoading: false,
        error: action.error,
      };
    case "request/stop":
      return {
        ...state,
        loading: false,
        historyLoading: false,
      };
    case "conversation/load-start":
      return {
        ...state,
        activeConversationId: action.conversationId,
        executionMode: "thinking",
        stage: "welcome",
        evidenceOpen: false,
        investigation: null,
        draft: null,
        approvedSpecification: null,
        processEvents: createProcessEvents(),
        transcript: [],
        result: null,
        history: [],
        historyLoading: true,
        loading: false,
        error: null,
      };
    case "conversation/load-cached":
      return {
        ...state,
        ...action.cached,
        activeConversationId: action.conversationId,
        historyLoading: true,
        loading: true,
        error: null,
      };
    case "conversation/load-success":
      if (action.investigation && (action.result || action.error)) {
        return {
          ...state,
          executionMode: action.pendingExecutionMode,
          stage: "result",
          evidenceOpen: false,
          investigation: action.investigation,
          draft: null,
          approvedSpecification: null,
          processEvents: action.processEvents,
          transcript: action.transcript,
          result: action.result,
          history: action.history,
          loading: action.pendingResponse,
          historyLoading: false,
          error: action.error,
          pendingUserInput: null,
        };
      }
      if (action.pendingInvestigation) {
        return {
          ...state,
          executionMode: action.pendingExecutionMode,
          stage: "intent",
          evidenceOpen: false,
          investigation: action.pendingInvestigation,
          draft: {
            intent: action.pendingInvestigation.intent,
            specMarkdown: action.pendingInvestigation.specMarkdown,
          },
          approvedSpecification: null,
          processEvents: createProcessEvents(),
          transcript: [],
          result: null,
          history: action.history,
          loading: false,
          historyLoading: false,
          error: null,
          pendingUserInput: null,
        };
      }
      if (action.pendingUserInput && action.pendingQuestion) {
        return {
          ...state,
          executionMode: action.pendingExecutionMode,
          stage: "pending",
          evidenceOpen: false,
          investigation:
            action.pendingExecutionMode === "instant"
              ? instantEngineInvestigation(action.pendingQuestion)
              : optimisticInvestigation(action.pendingQuestion),
          draft: null,
          approvedSpecification: null,
          processEvents: createProcessEvents(),
          transcript: [],
          result: null,
          history: action.history,
          loading: false,
          historyLoading: false,
          error: null,
          pendingUserInput: action.pendingUserInput,
        };
      }
      if (action.pendingQuestion) {
        return {
          ...state,
          executionMode: action.pendingExecutionMode,
          stage: "pending",
          evidenceOpen: false,
          investigation:
            action.pendingExecutionMode === "instant"
              ? instantEngineInvestigation(action.pendingQuestion)
              : optimisticInvestigation(action.pendingQuestion),
          draft: null,
          approvedSpecification: null,
          processEvents: createProcessEvents(),
          transcript: [],
          result: null,
          history: action.history,
          loading: true,
          historyLoading: false,
          error: null,
          pendingUserInput: null,
        };
      }
      return {
        ...initialState,
        activeConversationId: state.activeConversationId,
        history: action.history,
        historyLoading: false,
      };
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

const optimisticInvestigation = (
  question: string,
  attachments: ChatAttachment[] = [],
  dataScope?: ChatDataScope,
): Investigation => ({
  question,
  attachments,
  dataScope,
  confidence: 94,
  intent: "generate_revenue_report",
  scope: dataScope ? chatDataScopeLabel(dataScope) : "Q3 revenue, payments",
  specMarkdown:
    "# Investigation plan\n\nAXIOM is preparing the workflow specification.",
  policy: "Strict · read-only sandbox · external network blocked",
  output: "Reviewed markdown answer with cited evidence",
});

const streamingDirectAnswerInvestigation = (
  question: string,
  attachments: ChatAttachment[] = [],
  dataScope?: ChatDataScope,
): Investigation => ({
  question,
  attachments,
  dataScope,
  confidence: 100,
  intent: "general_direct",
  scope: dataScope
    ? chatDataScopeLabel(dataScope)
    : "Answered from general knowledge or conversation context.",
  specMarkdown: "",
  policy: "No data workflow or engine execution was required.",
  output: "Direct answer",
});

const instantEngineInvestigation = (
  question: string,
  attachments: ChatAttachment[] = [],
  dataScope?: ChatDataScope,
): Investigation => ({
  question,
  attachments,
  dataScope,
  confidence: 100,
  intent: "instant_engine",
  scope: dataScope
    ? chatDataScopeLabel(dataScope)
    : "Executed immediately by the selected AXIOM engine.",
  specMarkdown: "",
  policy: "AXIOM engine routing and request-scoped authorization.",
  output: "Engine response and available artifact references",
});

function chatAttachmentsFromFiles(files: File[]): ChatAttachment[] {
  return files.map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type || undefined,
  }));
}

function attachSubmissionContext(
  investigation: Investigation,
  attachments: ChatAttachment[],
  dataScope?: ChatDataScope,
  replyContext?: string,
): Investigation {
  return {
    ...investigation,
    ...(attachments.length ? { attachments } : {}),
    ...(dataScope ? { dataScope, scope: chatDataScopeLabel(dataScope) } : {}),
    ...(replyContext ? { replyContext } : {}),
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError";
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
  | "executionMode"
  | "evidenceOpen"
  | "investigation"
  | "draft"
  | "approvedSpecification"
  | "processEvents"
  | "transcript"
  | "result"
  | "history"
  | "loading"
  | "error"
  | "pendingUserInput"
>;

const conversationStateCache = new Map<string, CachedConversationState>();

export type ChatSubmission = {
  question: string;
  replyContext?: string;
  conversationId: string | null;
  engine: ChatEngine;
  executionMode: ChatExecutionMode;
  files: File[];
  organizationId?: string | null;
  workspaceId?: string | null;
  modelAlias?: string | null;
  dataScope?: ChatDataScope;
  onConversationCreated?: (conversationId: string) => void;
};

type LastSubmission = Omit<ChatSubmission, "onConversationCreated">;

function cacheConversationState(state: ChatWorkflowState) {
  if (!state.activeConversationId || state.stage === "welcome") return;
  conversationStateCache.set(state.activeConversationId, {
    stage: state.stage,
    executionMode: state.executionMode,
    evidenceOpen: state.evidenceOpen,
    investigation: state.investigation,
    draft: state.draft,
    approvedSpecification: state.approvedSpecification,
    processEvents: state.processEvents,
    transcript: state.transcript,
    result: state.result,
    history: state.history,
    loading: state.loading,
    error: state.error,
    pendingUserInput: state.pendingUserInput,
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
  const lastSubmissionRef = useRef<LastSubmission | null>(null);

  useEffect(() => {
    cacheConversationState(state);
  }, [state]);

  const cancelCurrentRequest = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  const ownsRequest = useCallback(
    (controller: AbortController) =>
      requestRef.current === controller && !controller.signal.aborted,
    [],
  );

  useEffect(() => cancelCurrentRequest, [cancelCurrentRequest]);

  const submitQuestion = useCallback(
    async (submission: ChatSubmission, replaceCurrent = false) => {
      const {
        question,
        replyContext,
        engine,
        files,
        organizationId,
        workspaceId,
        modelAlias,
        dataScope,
        executionMode,
        onConversationCreated,
      } = submission;
      cancelCurrentRequest();
      const attachments = chatAttachmentsFromFiles(files);
      lastSubmissionRef.current = {
        question,
        replyContext,
        conversationId: submission.conversationId,
        engine,
        executionMode,
        files,
        organizationId,
        workspaceId,
        modelAlias,
        dataScope,
      };
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch({
        type: "submit/start",
        investigation: attachSubmissionContext(
          executionMode === "instant"
            ? instantEngineInvestigation(question, attachments, dataScope)
            : optimisticInvestigation(question, attachments, dataScope),
          attachments,
          dataScope,
          replyContext,
        ),
        conversationId: submission.conversationId,
        executionMode,
        replaceCurrent,
      });

      try {
        let conversationId = submission.conversationId;
        if (!conversationId) {
          const conversation = await createConversation(
            question.slice(0, 80),
            controller.signal,
          );
          if (!ownsRequest(controller)) return;
          conversationId = conversation.conversation_id;
          lastSubmissionRef.current = {
            question,
            replyContext,
            conversationId,
            engine,
            executionMode,
            files,
            organizationId,
            workspaceId,
            modelAlias,
            dataScope,
          };
          dispatch({ type: "conversation/created", conversationId });
          if (ownsRequest(controller)) onConversationCreated?.(conversationId);
        }
        const outcome = await createInvestigation(
          question,
          conversationId,
          engine,
          executionMode,
          controller.signal,
          {
            files,
            organizationId,
            workspaceId,
            modelAlias,
            dataScope,
            replyContext,
            onTranscript: (transcript) => {
              if (!ownsRequest(controller)) return;
              dispatch({ type: "process/transcript", transcript });
            },
            onOutputText: (result) => {
              if (!ownsRequest(controller)) return;
              dispatch({
                type: "submit/stream",
                investigation: attachSubmissionContext(
                  executionMode === "instant"
                    ? instantEngineInvestigation(
                        question,
                        attachments,
                        dataScope,
                      )
                    : streamingDirectAnswerInvestigation(
                        question,
                        attachments,
                        dataScope,
                      ),
                  attachments,
                  dataScope,
                  replyContext,
                ),
                result,
                executionMode,
              });
            },
            onCompleted: (result) => {
              if (!ownsRequest(controller)) return;
              dispatch({ type: "answer/completed", result });
            },
            onProcessEvents: (events) => {
              if (!ownsRequest(controller)) return;
              dispatch({ type: "process/events", events });
            },
          },
        );
        if (!ownsRequest(controller)) return;
        if (outcome.kind === "user_input_required") {
          dispatch({
            type: "submit/user-input-required",
            investigation: outcome.investigation,
            interaction: outcome.interaction,
          });
        } else if (outcome.kind === "completed") {
          dispatch({
            type: "submit/completed",
            investigation: attachSubmissionContext(
              outcome.investigation,
              attachments,
              dataScope,
              replyContext,
            ),
            result: outcome.result,
            processEvents: outcome.processEvents,
            transcript: outcome.transcript,
            executionMode,
          });
        } else if (outcome.kind === "resuming") {
          dispatch({
            type: "submit/user-input-required",
            investigation: outcome.investigation,
            interaction: outcome.interaction,
          });
        } else {
          dispatch({
            type: "submit/confirmation",
            investigation: attachSubmissionContext(
              outcome.investigation,
              attachments,
              dataScope,
              replyContext,
            ),
          });
        }
      } catch (error) {
        if (ownsRequest(controller) && !isAbortError(error)) {
          dispatch({
            type: "request/failure",
            error: getChatError(error),
          });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [cancelCurrentRequest, ownsRequest],
  );

  const answerUserInput = useCallback(
    async (answer: UserInputAnswer) => {
      const interaction = state.pendingUserInput;
      const investigation = state.investigation;
      if (!interaction || !investigation || state.loading) return;

      cancelCurrentRequest();
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch({ type: "user-input/start" });

      try {
        const outcome = await submitUserInputRequest(
          interaction,
          answer,
          investigation,
          controller.signal,
          {
            onTranscript: (transcript) => {
              if (!ownsRequest(controller)) return;
              dispatch({ type: "process/transcript", transcript });
            },
            onOutputText: (result) => {
              if (!ownsRequest(controller)) return;
              dispatch({ type: "submit/stream", investigation, result, executionMode: state.executionMode });
            },
            onCompleted: (result) => {
              if (!ownsRequest(controller)) return;
              dispatch({ type: "answer/completed", result });
            },
            onProcessEvents: (events) => {
              if (!ownsRequest(controller)) return;
              dispatch({ type: "process/events", events });
            },
          },
        );
        if (!ownsRequest(controller)) return;
        if (outcome.kind === "completed") {
          dispatch({
            type: "user-input/completed",
            result: outcome.result,
            processEvents: outcome.processEvents,
            transcript: outcome.transcript,
          });
        } else if (outcome.kind === "user_input_required") {
          dispatch({
            type: "user-input/required",
            interaction: outcome.interaction,
            processEvents: outcome.processEvents,
            transcript: outcome.transcript,
          });
        } else if (outcome.kind === "resuming") {
          dispatch({
            type: "user-input/required",
            interaction: outcome.interaction,
            processEvents: outcome.processEvents,
            transcript: outcome.transcript,
          });
        } else {
          throw new Error("The response could not resume from the selected answer.");
        }
      } catch (error) {
        if (ownsRequest(controller) && !isAbortError(error)) {
          dispatch({ type: "request/failure", error: getChatError(error) });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [cancelCurrentRequest, ownsRequest, state.executionMode, state.investigation, state.loading, state.pendingUserInput],
  );

  const cancelUserInput = useCallback(async () => {
    const interaction = state.pendingUserInput;
    if (!interaction || state.loading) return;
    try {
      await cancelPendingResponse(interaction.responseId);
      dispatch({ type: "user-input/cancelled" });
    } catch (error) {
      dispatch({ type: "request/failure", error: getChatError(error) });
    }
  }, [state.loading, state.pendingUserInput]);

  const startProcess = useCallback(
    async (specification: EditableSpecification) => {
      cancelCurrentRequest();
      const controller = new AbortController();
      requestRef.current = controller;
      dispatch({ type: "process/start", specification });

      try {
        const result = await runWorkflow(
          specification,
          (events) => {
            if (!ownsRequest(controller)) return;
            dispatch({ type: "process/events", events });
          },
          controller.signal,
          (transcript) => {
            if (!ownsRequest(controller)) return;
            dispatch({ type: "process/transcript", transcript });
          },
          (result) => {
            if (!ownsRequest(controller)) return;
            dispatch({ type: "answer/completed", result });
          },
        );
        if (!ownsRequest(controller)) return;
        dispatch({ type: "process/success", result, evidenceOpen: false });
      } catch (error) {
        if (ownsRequest(controller) && !isAbortError(error)) {
          dispatch({
            type: "request/failure",
            error: getChatError(error),
          });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [cancelCurrentRequest, ownsRequest],
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
        if (!ownsRequest(controller)) return;
        dispatch({ type: "draft/revise-success", investigation });
      } catch (error) {
        if (ownsRequest(controller) && !isAbortError(error)) {
          dispatch({
            type: "request/failure",
            error: getChatError(error),
          });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [
      cancelCurrentRequest,
      ownsRequest,
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
        error: getChatError(
          new Error(
            "Intent and specification are required before running the workflow.",
          ),
        ),
      });
      return;
    }
    void startProcess(specification);
  }, [startProcess, state.draft, state.loading, state.stage]);

  const retryProcess = useCallback(() => {
    if (state.loading) return;
    const submission = lastSubmissionRef.current;
    if (
      !submission ||
      submission.conversationId !== state.activeConversationId
    ) {
      return;
    }
    if (state.executionMode === "thinking" && state.approvedSpecification) {
      void startProcess(state.approvedSpecification);
      return;
    }
    void submitQuestion(submission, true);
  }, [
    startProcess,
    state.activeConversationId,
    state.approvedSpecification,
    state.executionMode,
    state.loading,
    submitQuestion,
  ]);

  const loadConversation = useCallback(
    async (conversationId: string) => {
      cancelCurrentRequest();
      lastSubmissionRef.current = null;
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
        });
      }

      try {
        let snapshot = await loadConversationHistory(
          conversationId,
          controller.signal,
        );
        if (!ownsRequest(controller)) return;
        let shouldContinuePolling = true;

        while (shouldContinuePolling) {
          if (!ownsRequest(controller)) return;
          const activeTurn = snapshot.turns[snapshot.turns.length - 1] || null;
          const hasHydratedContent =
            Boolean(activeTurn || snapshot.pendingInvestigation) || !cached;
          if (hasHydratedContent) {
            dispatch({
              type: "conversation/load-success",
              history: activeTurn
                ? snapshot.turns.slice(0, -1)
                : snapshot.turns,
              investigation: activeTurn?.investigation || null,
              result: activeTurn?.result || null,
              error: activeTurn?.error || null,
              processEvents: activeTurn?.processEvents || createProcessEvents(),
              transcript: activeTurn?.transcript || [],
              pendingInvestigation: snapshot.pendingInvestigation,
              pendingQuestion: snapshot.pendingQuestion,
              pendingExecutionMode:
                activeTurn?.executionMode ?? snapshot.pendingExecutionMode,
              pendingResponse: snapshot.pendingResponse,
              pendingUserInput: snapshot.pendingUserInput ?? null,
            });
          }

          shouldContinuePolling = Boolean(
            (snapshot.pendingResponse ||
              (!activeTurn &&
                !snapshot.pendingInvestigation &&
                snapshot.pendingQuestion &&
                !snapshot.pendingUserInput)) &&
            !controller.signal.aborted,
          );
          if (shouldContinuePolling) {
            await waitForPendingConversationPoll(controller.signal);
            if (!ownsRequest(controller)) return;
            snapshot = await loadConversationHistory(
              conversationId,
              controller.signal,
            );
            if (!ownsRequest(controller)) return;
          }
        }
      } catch (error) {
        if (ownsRequest(controller) && !isAbortError(error)) {
          dispatch({
            type: "request/failure",
            error: getChatError(error),
          });
        }
      } finally {
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [cancelCurrentRequest, ownsRequest],
  );

  const newChat = useCallback(() => {
    cancelCurrentRequest();
    lastSubmissionRef.current = null;
    dispatch({ type: "chat/new" });
  }, [cancelCurrentRequest]);

  const stopGeneration = useCallback(() => {
    cancelCurrentRequest();
    dispatch({ type: "request/stop" });
  }, [cancelCurrentRequest]);

  const openEvidence = useCallback(
    () => dispatch({ type: "evidence/open" }),
    [],
  );
  const closeEvidence = useCallback(
    () => dispatch({ type: "evidence/close" }),
    [],
  );

  const lastSubmission = lastSubmissionRef.current;
  const canRetry =
    Boolean(
      lastSubmission &&
      lastSubmission.conversationId === state.activeConversationId,
    ) &&
    !state.loading &&
    !state.historyLoading &&
    state.error?.retryable === true;

  return {
    ...state,
    canRetry,
    submitQuestion,
    updateSpecification,
    resetSpecification,
    reviseSpecification,
    approveAndRun,
    retryProcess,
    loadConversation,
    newChat,
    answerUserInput,
    cancelUserInput,
    stopGeneration,
    openEvidence,
    closeEvidence,
  };
}
