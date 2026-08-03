import { afterEach, describe, expect, it, vi } from "vitest";
import { createInvestigation } from "./chatApi";

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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
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
      ),
    );
    const onOutputText = vi.fn();

    const outcome = await createInvestigation(
      "What is PostgreSQL?",
      "conversation-1",
      "auto",
      undefined,
      onOutputText,
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
    );

    expect(outcome).toMatchObject({
      kind: "confirmation",
      investigation: {
        intent: "report",
        specMarkdown: "# Report plan\n\nRetrieve relevant ingested files.",
      },
    });
  });
});
