import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InitialChatOutcome } from "../api/chatApi";
import { useChatWorkflow } from "./useChatWorkflow";

const createInvestigationMock = vi.hoisted(() => vi.fn());

vi.mock("../api/chatApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/chatApi")>();
  return {
    ...actual,
    createInvestigation: createInvestigationMock,
  };
});

describe("useChatWorkflow", () => {
  afterEach(() => {
    createInvestigationMock.mockReset();
  });

  it("moves directly to the result stage for an orchestrator answer", async () => {
    createInvestigationMock.mockResolvedValue({
      kind: "completed",
      investigation: {
        question: "What is PostgreSQL?",
        confidence: 100,
        intent: "general_direct",
        scope: "Answered directly.",
        specMarkdown: "",
        policy: "No engine required.",
        output: "Direct answer",
      },
      result: {
        title: "AXIOM response",
        summary: "PostgreSQL is a relational database.",
        markdown: "PostgreSQL is a relational database.",
        metrics: [],
        flags: [],
        evidence: [],
        artifacts: [],
      },
      processEvents: [],
    } satisfies InitialChatOutcome);
    const { result } = renderHook(() => useChatWorkflow());

    act(() => {
      void result.current.submitQuestion(
        "What is PostgreSQL?",
        "conversation-1",
        "auto",
      );
    });

    await waitFor(() => expect(result.current.stage).toBe("result"));
    expect(result.current.draft).toBeNull();
    expect(result.current.result?.markdown).toBe(
      "PostgreSQL is a relational database.",
    );
  });
});
