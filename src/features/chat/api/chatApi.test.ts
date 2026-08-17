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

  it("posts Instant mode and returns a report-direct investigation", async () => {
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
        intent: "report_direct",
        specMarkdown: "",
      },
    });
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
        intent: "report_direct",
        specMarkdown: "",
      },
    });
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
