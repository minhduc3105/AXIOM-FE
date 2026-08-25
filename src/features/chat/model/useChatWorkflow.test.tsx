import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const chatApi = vi.hoisted(() => ({
  createInvestigation: vi.fn(),
  createProcessEvents: vi.fn(() => []),
  loadConversationHistory: vi.fn(),
  reviseInvestigation: vi.fn(),
  runWorkflow: vi.fn(),
}));

const intelligenceApi = vi.hoisted(() => ({
  createConversation: vi.fn(),
}));

vi.mock("../api/chatApi", () => chatApi);
vi.mock("@/shared/lib/intelligence-api", () => intelligenceApi);

import { useChatWorkflow } from "./useChatWorkflow";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const completedOutcome = (markdown: string) => ({
  kind: "completed" as const,
  investigation: {
    question: "Retry this response",
    confidence: 100,
    intent: "instant_engine",
    scope: "Executed immediately by the selected AXIOM engine.",
    specMarkdown: "",
    policy: "AXIOM engine routing and request-scoped authorization.",
    output: "Engine response and available artifact references",
  },
  result: {
    title: "AXIOM response",
    summary: markdown,
    markdown,
    metrics: [],
    flags: [],
    evidence: [],
    artifacts: [],
  },
  processEvents: [],
});

describe("useChatWorkflow", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("enters pending before a new conversation is created", () => {
    intelligenceApi.createConversation.mockReturnValue(
      new Promise(() => undefined),
    );
    const { result } = renderHook(() => useChatWorkflow());

    act(() => {
      void result.current.submitQuestion({
        question: "Explain PostgreSQL",
        conversationId: null,
        engine: "auto",
        executionMode: "instant",
        files: [],
      });
    });

    expect(result.current.stage).toBe("pending");
    expect(result.current.loading).toBe(true);
    expect(result.current.investigation?.question).toBe("Explain PostgreSQL");
    expect(intelligenceApi.createConversation).toHaveBeenCalledOnce();
    expect(chatApi.createInvestigation).not.toHaveBeenCalled();
  });

  it("keeps the final hydrated partial response and typed error in the active response state", async () => {
    chatApi.loadConversationHistory.mockResolvedValue({
      turns: [
        {
          executionMode: "instant",
          investigation: {
            question: "Create a report",
            confidence: 100,
            intent: "instant_engine",
            scope: "Executed immediately by the selected AXIOM engine.",
            specMarkdown: "",
            policy: "AXIOM engine routing and request-scoped authorization.",
            output: "Engine response and available artifact references",
          },
          result: {
            title: "AXIOM response",
            summary: "Partial report output",
            markdown: "Partial report output",
            metrics: [],
            flags: [],
            evidence: [],
            artifacts: [],
          },
          error: {
            kind: "unavailable",
            code: "runtime_unavailable",
            retryable: true,
            message: "Chat is temporarily unavailable. Please try again in a moment.",
            status: null,
            cause: "runtime pool drain details",
          },
          processEvents: [],
        },
      ],
      pendingInvestigation: null,
      pendingQuestion: null,
      pendingExecutionMode: "instant",
      pendingResponse: false,
    });
    const { result } = renderHook(() => useChatWorkflow());

    await act(async () => {
      await result.current.loadConversation("conversation-1");
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.result?.markdown).toBe("Partial report output");
    expect(result.current.error).toMatchObject({
      code: "runtime_unavailable",
      retryable: true,
    });
  });

  it("only enables retry for a retryable current failure", async () => {
    chatApi.createInvestigation
      .mockRejectedValueOnce({ code: "cancelled", retryable: false })
      .mockRejectedValueOnce({ code: "runtime_unavailable", retryable: true });
    const { result } = renderHook(() => useChatWorkflow());

    await act(async () => {
      await result.current.submitQuestion({
        question: "Stop this response",
        conversationId: "conversation-1",
        engine: "auto",
        executionMode: "instant",
        files: [],
      });
    });
    expect(result.current.canRetry).toBe(false);

    await act(async () => {
      await result.current.submitQuestion({
        question: "Retry this response",
        conversationId: "conversation-1",
        engine: "auto",
        executionMode: "instant",
        files: [],
      });
    });
    expect(result.current.canRetry).toBe(true);
  });

  it("archives a partial response with its typed error before submitting the next question", async () => {
    const partialResult = {
      title: "AXIOM response",
      summary: "Partial response",
      markdown: "Partial response",
      metrics: [],
      flags: [],
      evidence: [],
      artifacts: [],
    };
    chatApi.createInvestigation
      .mockImplementationOnce(async (...args: unknown[]) => {
        const options = args[5] as { onOutputText?: (result: typeof partialResult) => void };
        options.onOutputText?.(partialResult);
        throw { code: "runtime_unavailable", retryable: true };
      })
      .mockReturnValueOnce(new Promise(() => undefined));
    const { result } = renderHook(() => useChatWorkflow());

    await act(async () => {
      await result.current.submitQuestion({
        question: "Create a report",
        conversationId: "conversation-1",
        engine: "auto",
        executionMode: "instant",
        files: [],
      });
    });

    act(() => {
      void result.current.submitQuestion({
        question: "Start another report",
        conversationId: "conversation-1",
        engine: "auto",
        executionMode: "instant",
        files: [],
      });
    });

    expect(result.current.history[0]).toMatchObject({
      result: { markdown: "Partial response" },
      error: { code: "runtime_unavailable", retryable: true },
    });
  });

  it("archives a no-output failed response before an ordinary new submission", async () => {
    chatApi.createInvestigation
      .mockRejectedValueOnce({ code: "cancelled", retryable: false })
      .mockReturnValueOnce(new Promise(() => undefined));
    const { result } = renderHook(() => useChatWorkflow());
    const firstSubmission = {
      question: "Stop this response",
      conversationId: "conversation-1",
      engine: "auto" as const,
      executionMode: "instant" as const,
      files: [],
    };

    await act(async () => {
      await result.current.submitQuestion(firstSubmission);
    });
    expect(result.current).toMatchObject({
      result: null,
      error: { code: "cancelled", retryable: false },
      history: [],
    });

    act(() => {
      void result.current.submitQuestion({
        ...firstSubmission,
        question: "Start another response",
      });
    });

    expect(result.current.history).toMatchObject([
      {
        investigation: { question: "Stop this response" },
        result: null,
        error: { code: "cancelled", retryable: false },
      },
    ]);
  });

  it("keeps a replacement response when the earlier request streams and fails late", async () => {
    const firstRequest = deferred<ReturnType<typeof completedOutcome>>();
    const secondRequest = deferred<ReturnType<typeof completedOutcome>>();
    let staleOutput: ((result: ReturnType<typeof completedOutcome>["result"]) => void) | undefined;
    chatApi.createInvestigation
      .mockImplementationOnce((...args: unknown[]) => {
        staleOutput = (args[5] as { onOutputText?: typeof staleOutput })
          .onOutputText;
        return firstRequest.promise;
      })
      .mockReturnValueOnce(secondRequest.promise);
    const { result } = renderHook(() => useChatWorkflow());
    const submission = {
      question: "Retry this response",
      conversationId: "conversation-1",
      engine: "auto" as const,
      executionMode: "instant" as const,
      files: [],
    };

    act(() => {
      void result.current.submitQuestion(submission);
      void result.current.submitQuestion(submission);
    });

    await act(async () => {
      secondRequest.resolve(completedOutcome("New retry response"));
      await Promise.resolve();
    });
    expect(result.current.result?.markdown).toBe("New retry response");

    act(() => {
      staleOutput?.({
        ...completedOutcome("Stale stream response").result,
      });
    });
    await act(async () => {
      firstRequest.reject({ code: "runtime_unavailable", retryable: true });
      await Promise.resolve();
    });

    expect(result.current.result?.markdown).toBe("New retry response");
    expect(result.current.error).toBeNull();
  });

  it("retries a retryable failure into pending and shows the retry result without reloading", async () => {
    const retryRequest = deferred<ReturnType<typeof completedOutcome>>();
    chatApi.createInvestigation
      .mockRejectedValueOnce({ code: "runtime_unavailable", retryable: true })
      .mockReturnValueOnce(retryRequest.promise);
    const { result } = renderHook(() => useChatWorkflow());
    const submission = {
      question: "Retry this response",
      conversationId: "conversation-1",
      engine: "auto" as const,
      executionMode: "instant" as const,
      files: [],
    };

    await act(async () => {
      await result.current.submitQuestion(submission);
    });
    expect(result.current.canRetry).toBe(true);

    act(() => result.current.retryProcess());
    expect(result.current).toMatchObject({
      stage: "pending",
      loading: true,
      result: null,
      error: null,
    });

    await act(async () => {
      retryRequest.resolve(completedOutcome("Recovered retry response"));
      await Promise.resolve();
    });
    expect(result.current.result?.markdown).toBe("Recovered retry response");
    expect(result.current.error).toBeNull();
  });

  it("replaces a failed partial response when retrying instead of archiving it", async () => {
    const retryRequest = deferred<ReturnType<typeof completedOutcome>>();
    const partialResult = completedOutcome("Partial response").result;
    chatApi.createInvestigation
      .mockImplementationOnce(async (...args: unknown[]) => {
        const options = args[5] as {
          onOutputText?: (result: typeof partialResult) => void;
        };
        options.onOutputText?.(partialResult);
        throw { code: "runtime_unavailable", retryable: true };
      })
      .mockReturnValueOnce(retryRequest.promise);
    const { result } = renderHook(() => useChatWorkflow());
    const submission = {
      question: "Retry this response",
      conversationId: "conversation-1",
      engine: "auto" as const,
      executionMode: "instant" as const,
      files: [],
    };

    await act(async () => {
      await result.current.submitQuestion(submission);
    });
    expect(result.current).toMatchObject({
      result: { markdown: "Partial response" },
      error: { retryable: true },
      history: [],
    });

    act(() => result.current.retryProcess());
    expect(result.current).toMatchObject({
      stage: "pending",
      result: null,
      error: null,
      history: [],
    });

    await act(async () => {
      retryRequest.resolve(completedOutcome("Final retry response"));
      await Promise.resolve();
    });
    expect(result.current).toMatchObject({
      result: { markdown: "Final retry response" },
      history: [],
    });
  });

  it("does not retry a submission from another conversation", async () => {
    chatApi.createInvestigation.mockRejectedValueOnce({
      code: "runtime_unavailable",
      retryable: true,
    });
    chatApi.loadConversationHistory.mockResolvedValue({
      turns: [
        {
          executionMode: "instant",
          investigation: completedOutcome("unused").investigation,
          result: null,
          error: {
            kind: "unavailable",
            code: "runtime_unavailable",
            retryable: true,
            message: "Chat is temporarily unavailable. Please try again in a moment.",
            status: null,
            cause: "runtime unavailable",
          },
          processEvents: [],
        },
      ],
      pendingInvestigation: null,
      pendingQuestion: null,
      pendingExecutionMode: "instant",
      pendingResponse: false,
    });
    const { result } = renderHook(() => useChatWorkflow());

    await act(async () => {
      await result.current.submitQuestion({
        question: "Conversation A request",
        conversationId: "conversation-a",
        engine: "auto",
        executionMode: "instant",
        files: [],
      });
    });
    expect(result.current.canRetry).toBe(true);

    await act(async () => {
      await result.current.loadConversation("conversation-b");
    });
    expect(result.current).toMatchObject({
      activeConversationId: "conversation-b",
      error: { retryable: true },
      canRetry: false,
    });

    act(() => result.current.retryProcess());
    expect(chatApi.createInvestigation).toHaveBeenCalledOnce();
  });
});
