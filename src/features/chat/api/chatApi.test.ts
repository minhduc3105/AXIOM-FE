import { afterEach, describe, expect, it, vi } from "vitest";
import { createInvestigation, loadConversationHistory } from "./chatApi";
import { createConversation } from "@/shared/lib/intelligence-api";
import { getChatError } from "../model/chatError";

function sseResponse(events: Record<string, unknown>[]) {
  const body = events
    .map(
      (event) =>
        `event: ${String(event.type)}\ndata: ${JSON.stringify(event)}\n\n`,
    )
    .join("");
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("createInvestigation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retains structured HTTP error code and retryability without exposing server text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "runtime_unavailable",
                message: "internal runtime allocation failure",
                retryable: true,
              },
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    await expect(
      createInvestigation("Explain PostgreSQL", "conversation-1"),
    ).rejects.toMatchObject({
      name: "ChatApiError",
      status: 503,
      code: "runtime_unavailable",
      retryable: true,
      message: "Chat request failed.",
      cause: "internal runtime allocation failure",
    });
  });

  it("retains structured SSE failure code and retryability without exposing server text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          {
            type: "response.failed",
            error: {
              code: "runtime_unavailable",
              message: "runtime pool drain details",
              retryable: true,
            },
          },
        ]),
      ),
    );

    await expect(
      createInvestigation("Explain PostgreSQL", "conversation-1"),
    ).rejects.toMatchObject({
      name: "ChatApiError",
      status: null,
      code: "runtime_unavailable",
      retryable: true,
      message: "Chat request failed.",
      cause: "runtime pool drain details",
    });
  });

  it.each(["response.cancelled", "response.canceled"])(
    "normalizes %s into the existing non-retryable stopped response",
    async (type) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          sseResponse([
            {
              type,
              error: {
                code: "upstream_cancelled",
                message: "worker cancellation details",
                retryable: true,
              },
            },
          ]),
        ),
      );

      let failure: unknown;
      try {
        await createInvestigation("Explain PostgreSQL", "conversation-1");
      } catch (error) {
        failure = error;
      }

      expect(failure).toMatchObject({
        name: "ChatApiError",
        status: null,
        code: "cancelled",
        retryable: false,
        cause: "worker cancellation details",
      });
      expect(getChatError(failure)).toMatchObject({
        kind: "cancelled",
        code: "cancelled",
        retryable: false,
        message: "That response was stopped.",
      });
    },
  );

  it("keeps structured create-conversation failures available to the chat error mapper", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "runtime_unavailable",
                message: "allocator routing diagnostic",
                retryable: true,
              },
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    let failure: unknown;
    try {
      await createConversation("Explain PostgreSQL");
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      name: "IntelligenceApiError",
      status: 503,
      code: "runtime_unavailable",
      retryable: true,
      cause: "allocator routing diagnostic",
    });
    expect(getChatError(failure)).toMatchObject({
      kind: "unavailable",
      code: "runtime_unavailable",
      retryable: true,
    });
  });

  it("keeps structured conversation-history failures available to the chat error mapper", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              detail: {
                code: "history_temporarily_unavailable",
                message: "history shard diagnostic",
                retryable: true,
              },
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    let failure: unknown;
    try {
      await loadConversationHistory("conversation-1");
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      name: "IntelligenceApiError",
      status: 502,
      code: "history_temporarily_unavailable",
      retryable: true,
      cause: "history shard diagnostic",
    });
    expect(getChatError(failure)).toMatchObject({
      kind: "busy",
      code: "history_temporarily_unavailable",
      retryable: true,
    });
  });

  it("loads every conversation message page so completed responses survive refresh", async () => {
    const firstPageMessages = [
      storedMessage({
        message_id: "message-user",
        role: "user",
        status: "created",
        content: {
          type: "response.request",
          input: "Create a report",
          execution_mode: "instant",
        },
      }),
      ...Array.from({ length: 19 }, (_, index) =>
        storedMessage({
          message_id: `runtime-${index}`,
          role: "runtime",
          status: "completed",
          content: { type: "runtime.event" },
        }),
      ),
    ];
    const secondPageMessages = [
      storedMessage({
        message_id: "message-assistant",
        role: "assistant",
        status: "completed",
        content: {
          type: "response.completed",
          output_text: "Restored answer",
        },
      }),
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const page = Number(url.searchParams.get("page") || "1");
      const items = page === 2 ? secondPageMessages : firstPageMessages;
      return new Response(
        JSON.stringify({
          items,
          pagination: {
            page,
            limit: 20,
            total_items: 21,
            total_pages: 2,
            has_next: page === 1,
            has_previous: page === 2,
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await loadConversationHistory("conversation-1");

    expect(snapshot.turns).toHaveLength(1);
    expect(snapshot.turns[0]?.result?.markdown).toBe("Restored answer");
    expect(snapshot.pendingQuestion).toBeNull();
    expect(snapshot.pendingResponse).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("page=2");
  });

  it("cancels an active stream reader and ignores its late read after abort", async () => {
    let resolveRead!: (value: ReadableStreamReadResult<Uint8Array>) => void;
    const reader = {
      read: vi.fn(
        () =>
          new Promise<ReadableStreamReadResult<Uint8Array>>((resolve) => {
            resolveRead = resolve;
          }),
      ),
      cancel: vi.fn(async () => undefined),
      releaseLock: vi.fn(),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: true,
            body: { getReader: () => reader },
          }) as unknown as Response,
      ),
    );
    const controller = new AbortController();
    const pending = createInvestigation(
      "Explain PostgreSQL",
      "conversation-1",
      "auto",
      "thinking",
      controller.signal,
    );

    await vi.waitFor(() => expect(reader.read).toHaveBeenCalledOnce());
    controller.abort();
    resolveRead({ done: true, value: undefined });

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(reader.cancel).toHaveBeenCalledOnce();
  });

  it("returns a completed outcome when the orchestrator answers directly", async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse([
        {
          type: "response.output_text.delta",
          response_id: "resp-direct",
          delta: "PostgreSQL is an open-source ",
        },
        {
          type: "response.output_text.delta",
          response_id: "resp-direct",
          delta: "relational database.",
        },
        {
          type: "response.completed",
          response_id: "resp-direct",
          response: {
            id: "resp-direct",
            status: "completed",
          },
          evidence: null,
          metadata: { route: "general_direct" },
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onOutputText = vi.fn();

    const outcome = await createInvestigation(
      "What is PostgreSQL?",
      "conversation-1",
      "auto",
      "thinking",
      undefined,
      {
        workspaceId: "workspace-b",
        onOutputText,
      },
    );

    expect(outcome).toMatchObject({
      kind: "completed",
      investigation: { question: "What is PostgreSQL?" },
      result: {
        markdown: "PostgreSQL is an open-source relational database.",
      },
    });
    expect(onOutputText).toHaveBeenLastCalledWith(
      expect.objectContaining({
        markdown: "PostgreSQL is an open-source relational database.",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"workspace_id":"workspace-b"'),
      }),
    );
  });

  it("returns a confirmation outcome when the orchestrator delegates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          {
            type: "response.requires_confirmation",
            response_id: "resp-confirmation",
            confirmation_token: "confirmation-token",
            revision: 1,
            intent: { value: "report", confidence: 0.92 },
            spec_markdown: "# Report plan\n\nRetrieve relevant ingested files.",
          },
        ]),
      ),
    );

    const outcome = await createInvestigation(
      "Create a report from my files",
      null,
      "report",
      "thinking",
    );

    expect(outcome).toMatchObject({
      kind: "confirmation",
      investigation: {
        intent: "report",
        specMarkdown: "# Report plan\n\nRetrieve relevant ingested files.",
      },
    });
  });

  it("posts Instant mode and returns an engine-neutral investigation", async () => {
    let postedBody = "";
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        postedBody = String(init?.body ?? "");
        return sseResponse([
          {
            type: "response.output_text.delta",
            response_id: "resp-instant",
            delta: "# NAPH report",
          },
          {
            type: "response.completed",
            response_id: "resp-instant",
            response: { id: "resp-instant", status: "completed" },
            metadata: { engine_name: "report" },
          },
        ]);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await createInvestigation(
      "Create a report about NAPH",
      "conversation-1",
      "report",
      "instant",
    );

    expect(JSON.parse(postedBody)).toMatchObject({
      execution_mode: "instant",
      runtime_options: { engine: "report" },
    });
    expect(outcome).toMatchObject({
      kind: "completed",
      investigation: {
        intent: "instant_engine",
        specMarkdown: "",
      },
    });
  });

  it("sends the selected retrieval scope with the chat request", async () => {
    let postedBody = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        postedBody = String(init?.body ?? "");
        return sseResponse([
          {
            type: "response.completed",
            response_id: "resp-scoped",
            response: {
              id: "resp-scoped",
              status: "completed",
              output_text: "Scoped answer",
            },
          },
        ]);
      }),
    );

    await createInvestigation(
      "Compare revenue and payments",
      "conversation-1",
      "auto",
      "instant",
      undefined,
      {
        dataScope: {
          mode: "selected",
          resourceIds: ["dataset:revenue-q3", "datasource:stripe-payments"],
          resourceNames: ["Q3 Revenue.xlsx", "Stripe payments"],
        },
      },
    );

    expect(JSON.parse(postedBody)).toMatchObject({
      selected_files: {
        mode: "selected",
        resource_ids: [
          "dataset:revenue-q3",
          "datasource:stripe-payments",
        ],
        resource_names: ["Q3 Revenue.xlsx", "Stripe payments"],
      },
    });
  });

  it("streams tool progress and upserts lifecycle events by tool call", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          {
            type: "pipeline.progress",
            response_id: "resp-instant",
            event_id: "evt-tool-started",
            event_type: "report.tool.started",
            phase: "tool",
            status: "started",
            label: "read_file",
            tool_call_id: "call_read_1",
            inputs: { path: "input.csv" },
          },
          {
            type: "pipeline.progress",
            response_id: "resp-instant",
            event_id: "evt-tool-completed",
            event_type: "report.tool.completed",
            phase: "tool",
            status: "completed",
            label: "read_file",
            tool_call_id: "call_read_1",
            inputs: { path: "input.csv" },
            outputs: { success: true, output: "ok" },
          },
          {
            type: "response.completed",
            response_id: "resp-instant",
            response: {
              id: "resp-instant",
              status: "completed",
              output_text: "Report complete",
            },
            metadata: { engine_name: "report" },
          },
        ]),
      ),
    );
    const onProcessEvents = vi.fn();

    const outcome = await createInvestigation(
      "Create a report",
      "conversation-1",
      "report",
      "instant",
      undefined,
      { onProcessEvents },
    );

    if (outcome.kind !== "completed") {
      throw new Error("Expected the Instant report to complete.");
    }
    expect(outcome.processEvents).toHaveLength(1);
    expect(outcome.processEvents[0]).toMatchObject({
      id: "call_read_1",
      label: "Read file",
      status: "done",
      phase: "tool",
      eventType: "report.tool.completed",
      inputs: { path: "input.csv" },
      outputs: { success: true, output: "ok" },
    });
    expect(onProcessEvents).toHaveBeenLastCalledWith(outcome.processEvents);
  });

  it("captures finalized report artifacts as a process event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          {
            type: "response.completed",
            response_id: "resp-artifacts",
            response: {
              id: "resp-artifacts",
              status: "completed",
              output_text: "Report complete",
            },
            metadata: {
              engine_name: "report",
              artifacts: [
                {
                  artifact_id: "asset-1",
                  filename: "report.html",
                  url: "http://storage/report.html?X-Amz-Signature=abc",
                },
              ],
            },
          },
        ]),
      ),
    );

    const outcome = await createInvestigation(
      "Create a report",
      "conversation-1",
      "report",
      "instant",
    );

    if (outcome.kind !== "completed") {
      throw new Error("Expected the Instant report to complete.");
    }
    expect(outcome.processEvents).toEqual([
      expect.objectContaining({
        id: "artifacts:resp-artifacts",
        label: "Generated files",
        phase: "artifact",
        eventType: "runtime.completed",
        outputs: {
          artifacts: [
            expect.objectContaining({
              filename: "report.html",
              url: "http://storage/report.html?X-Amz-Signature=abc",
            }),
          ],
        },
      }),
    ]);
  });

  it("accepts the legacy runtime progress envelope emitted under pipeline progress", async () => {
    const legacyProgress = (status: "started" | "completed") =>
      `event: pipeline.progress\ndata: ${JSON.stringify({
        type: "runtime.progress",
        operation_id: "op-direct",
        response_id: "resp-instant",
        payload: {
          event_id: `evt-${status}`,
          event_type: `report.tool.${status}`,
          phase: "tool",
          status,
          label: "execute_python",
          tool_name: "execute_python",
          tool_call_id: "call-python-1",
          inputs: status === "started" ? { code: "print('ok')" } : undefined,
        },
      })}\n\n`;
    const completed = `event: response.completed\ndata: ${JSON.stringify({
      type: "response.completed",
      response_id: "resp-instant",
      response: {
        id: "resp-instant",
        status: "completed",
        output_text: "Report complete",
      },
      metadata: { engine_name: "report" },
    })}\n\n`;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            legacyProgress("started") + legacyProgress("completed") + completed,
            { headers: { "Content-Type": "text/event-stream" } },
          ),
      ),
    );

    const outcome = await createInvestigation(
      "Create a report",
      "conversation-1",
      "report",
      "instant",
    );

    if (outcome.kind !== "completed") {
      throw new Error("Expected the Instant report to complete.");
    }
    expect(outcome.processEvents).toEqual([
      expect.objectContaining({
        id: "call-python-1",
        label: "Execute python",
        status: "done",
        phase: "tool",
        eventType: "report.tool.completed",
        inputs: { code: "print('ok')" },
      }),
    ]);
  });

  it("restores inputs and outputs from persisted legacy runtime progress events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                storedMessage({
                  message_id: "message-user",
                  role: "user",
                  status: "created",
                  content: {
                    type: "response.request",
                    input: "Create a report",
                    execution_mode: "instant",
                  },
                }),
                storedMessage({
                  message_id: "message-assistant",
                  role: "assistant",
                  status: "completed",
                  content: {
                    type: "response.completed",
                    output_text: "Report complete",
                    process_events: [
                      {
                        type: "runtime.progress",
                        operation_id: "op-direct",
                        response_id: "resp-instant",
                        payload: {
                          event_type: "report.tool.started",
                          event_id: "evt-started",
                          phase: "tool",
                          status: "started",
                          label: "execute_python",
                          tool_call_id: "call-python-1",
                          inputs: { code: "print('ok')" },
                        },
                      },
                      {
                        type: "runtime.progress",
                        operation_id: "op-direct",
                        response_id: "resp-instant",
                        payload: {
                          event_type: "report.tool.completed",
                          event_id: "evt-completed",
                          phase: "tool",
                          status: "completed",
                          label: "execute_python",
                          tool_call_id: "call-python-1",
                          inputs: { code: "print('ok')" },
                          outputs: { stdout: "ok\n", stderr: "", exit_code: 0 },
                        },
                      },
                    ],
                  },
                }),
              ],
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const snapshot = await loadConversationHistory("conversation-1");

    expect(snapshot.turns[0].processEvents).toEqual([
      expect.objectContaining({
        id: "call-python-1",
        inputs: { code: "print('ok')" },
        outputs: { stdout: "ok\n", stderr: "", exit_code: 0 },
      }),
    ]);
  });

  it("restores finalized report artifacts from completed message metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                storedMessage({
                  message_id: "message-user",
                  role: "user",
                  status: "created",
                  content: {
                    type: "response.request",
                    input: "Create a report",
                    execution_mode: "instant",
                  },
                }),
                storedMessage({
                  message_id: "message-assistant",
                  role: "assistant",
                  status: "completed",
                  content: {
                    type: "response.completed",
                    output_text: "Report complete",
                    metadata: {
                      artifacts: [
                        {
                          artifact_id: "asset-1",
                          filename: "report.html",
                          url: "http://storage/report.html?X-Amz-Signature=abc",
                        },
                      ],
                    },
                  },
                }),
              ],
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const snapshot = await loadConversationHistory("conversation-1");

    expect(snapshot.turns[0].processEvents).toEqual([
      expect.objectContaining({
        id: "artifacts:response-1",
        phase: "artifact",
        outputs: {
          artifacts: [expect.objectContaining({ filename: "report.html" })],
        },
      }),
    ]);
  });

  it("rejects confirmation events during Instant execution", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          {
            type: "response.requires_confirmation",
            response_id: "resp-invalid-instant",
            confirmation_token: "token",
            revision: 1,
            intent: { value: "report" },
            spec_markdown: "# Plan",
          },
        ]),
      ),
    );

    await expect(
      createInvestigation(
        "Create a report",
        "conversation-1",
        "report",
        "instant",
      ),
    ).rejects.toThrow("Instant execution unexpectedly requested confirmation.");
  });

  it("reconstructs Instant report turns without a synthetic stored plan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                storedMessage({
                  message_id: "message-user",
                  role: "user",
                  status: "created",
                  content: {
                    type: "response.request",
                    input: "Create a report about NAPH",
                    execution_mode: "instant",
                  },
                }),
                storedMessage({
                  message_id: "message-assistant",
                  role: "assistant",
                  status: "completed",
                  content: {
                    type: "response.completed",
                    output_text: "# NAPH report",
                  },
                }),
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const snapshot = await loadConversationHistory("conversation-1");

    expect(snapshot.turns[0]).toMatchObject({
      executionMode: "instant",
      investigation: {
        intent: "instant_engine",
        specMarkdown: "",
      },
    });
  });

  it("hydrates failed and cancelled history as typed errors, retaining partial output only", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                storedMessage({
                  message_id: "message-user-failed",
                  role: "user",
                  status: "created",
                  content: {
                    input: "Create a report",
                    execution_mode: "instant",
                  },
                }),
                storedMessage({
                  message_id: "message-assistant-failed",
                  role: "assistant",
                  status: "failed",
                  content: {
                    type: "response.failed",
                    output_text: "Partial report output",
                    error: {
                      code: "runtime_unavailable",
                      message: "runtime pool drain details",
                      retryable: true,
                    },
                  },
                }),
                storedMessage({
                  message_id: "message-user-cancelled",
                  role: "user",
                  status: "created",
                  content: { input: "Continue", execution_mode: "instant" },
                }),
                storedMessage({
                  message_id: "message-assistant-cancelled",
                  role: "assistant",
                  status: "cancelled",
                  content: {
                    type: "response.failed",
                    error: { message: "client aborted" },
                  },
                }),
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const snapshot = await loadConversationHistory("conversation-1");

    expect(snapshot.turns).toHaveLength(2);
    expect(snapshot.turns[0]).toMatchObject({
      result: { markdown: "Partial report output" },
      error: {
        kind: "unavailable",
        code: "runtime_unavailable",
        retryable: true,
        message:
          "Chat is temporarily unavailable. Please try again in a moment.",
        cause: "runtime pool drain details",
      },
    });
    expect(snapshot.turns[1]).toMatchObject({
      result: null,
      error: {
        kind: "cancelled",
        code: "cancelled",
        retryable: false,
        message: "That response was stopped.",
        cause: "client aborted",
      },
    });
  });

  it("restores uploaded file attachments from persisted user messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                storedMessage({
                  message_id: "message-user",
                  role: "user",
                  status: "created",
                  content: {
                    type: "response.request",
                    input: "Summarize the attached files",
                    execution_mode: "instant",
                    uploaded_files: [
                      {
                        filename: "revenue.csv",
                        size: 2048,
                        content_type: "text/csv",
                        metadata: { file_ref: { file_id: "asset-1" } },
                      },
                    ],
                  },
                }),
                storedMessage({
                  message_id: "message-assistant",
                  role: "assistant",
                  status: "completed",
                  content: {
                    type: "response.completed",
                    output_text: "Revenue summary",
                  },
                }),
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const snapshot = await loadConversationHistory("conversation-1");

    expect(snapshot.turns[0].investigation.attachments).toEqual([
      { name: "revenue.csv", size: 2048, type: "text/csv" },
    ]);
  });
});

function storedMessage(
  overrides: Partial<{
    message_id: string;
    role: string;
    status: string;
    content: unknown;
  }>,
) {
  return {
    message_id: "message-1",
    conversation_id: "conversation-1",
    role: "user",
    content: {},
    response_id: "response-1",
    artifact_ref: null,
    status: "created",
    metadata: {},
    created_at:
      overrides.role === "assistant"
        ? "2026-08-16T00:00:01Z"
        : "2026-08-16T00:00:00Z",
    updated_at: "2026-08-16T00:00:00Z",
    ...overrides,
  };
}
