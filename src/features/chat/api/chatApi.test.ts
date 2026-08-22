import { afterEach, describe, expect, it, vi } from "vitest";
import { createInvestigation, loadConversationHistory } from "./chatApi";

function sseResponse(events: Record<string, unknown>[]) {
  const body = events
    .map((event) => `event: ${String(event.type)}\ndata: ${JSON.stringify(event)}\n\n`)
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
      vi.fn(async () =>
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
      vi.fn(async () =>
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
      vi.fn(async () =>
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
      vi.fn(async () =>
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

  it("restores uploaded file attachments from persisted user messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
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
