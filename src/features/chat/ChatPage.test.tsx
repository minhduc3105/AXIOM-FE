import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { ChatPage } from "./ChatPage";

vi.mock("@/shared/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

const investigation = {
  question: "Review the attached operations report",
  confidence: 92,
  intent: "review",
  scope: "Operations workspace",
  specMarkdown: "# Review",
  policy: "Workspace sources only",
  output: "Reviewed answer",
};

function chatPageProps(
  overrides: Partial<ComponentProps<typeof ChatPage>> = {},
): ComponentProps<typeof ChatPage> {
  return {
    conversationId: "conversation-42",
    stage: "pending",
    evidenceOpen: false,
    investigation,
    draft: null,
    processEvents: [],
    result: null,
    history: [],
    error: null,
    historyLoading: false,
    loading: true,
    canRetry: false,
    inspectorItems: [],
    activeProcessEventKey: null,
    onProcessEventSelect: vi.fn(),
    engine: "auto",
    processInspectorOpen: false,
    onProcessInspectorClose: vi.fn(),
    onProcessInspectorOpen: vi.fn(),
    onSubmit: vi.fn(),
    onEngineChange: vi.fn(),
    onSpecificationChange: vi.fn(),
    onSpecificationRevise: vi.fn(),
    onResetSpecification: vi.fn(),
    onApproveAndRun: vi.fn(),
    onRetryProcess: vi.fn(),
    onCloseEvidence: vi.fn(),
    ...overrides,
  };
}

function renderChatPage() {
  const onProcessInspectorClose = vi.fn();
  const onProcessInspectorOpen = vi.fn();
  const view = render(
    <ChatPage
      conversationId="conversation-42"
      stage="process"
      evidenceOpen={false}
      investigation={investigation}
      draft={null}
      processEvents={[
        {
          id: "tool-1",
          label: "Search workspace files",
          detail: "Searching approved files",
          status: "done",
          phase: "tool",
        },
      ]}
      result={null}
      history={[]}
      error={null}
      historyLoading={false}
      loading={false}
      canRetry={false}
      inspectorItems={[
        {
          key: "current:tool-1",
          event: {
            id: "tool-1",
            label: "Search workspace files",
            detail: "Searching approved files",
            status: "done",
            phase: "tool",
          },
        },
      ]}
      activeProcessEventKey={null}
      onProcessEventSelect={vi.fn()}
      engine="report"
      processInspectorOpen
      onProcessInspectorClose={onProcessInspectorClose}
      onProcessInspectorOpen={onProcessInspectorOpen}
      onSubmit={vi.fn()}
      onEngineChange={vi.fn()}
      onSpecificationChange={vi.fn()}
      onSpecificationRevise={vi.fn()}
      onResetSpecification={vi.fn()}
      onApproveAndRun={vi.fn()}
      onRetryProcess={vi.fn()}
      onCloseEvidence={vi.fn()}
    />,
  );
  return { ...view, onProcessInspectorClose, onProcessInspectorOpen };
}

describe("ChatPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps Logs & Files as a compact-sheet fallback and closes it from its header", async () => {
    const actor = userEvent.setup();
    const { onProcessInspectorClose } = renderChatPage();

    expect(screen.getByRole("dialog", { name: "Logs & Files" })).toBeTruthy();
    await actor.click(screen.getByRole("button", { name: "Close Logs & Files" }));

    expect(onProcessInspectorClose).toHaveBeenCalledOnce();
  });

  it("opens the inspector when a process step is selected in chat", async () => {
    const actor = userEvent.setup();
    const { onProcessInspectorOpen } = renderChatPage();

    await actor.click(screen.getByRole("button", { name: "Analysis DetailsShow" }));
    await actor.click(
      screen.getByRole("button", { name: "Search workspace files" }),
    );

    expect(onProcessInspectorOpen).toHaveBeenCalledOnce();
  });

  it("does not render AXIOM identity or an avatar inside a process response", () => {
    const { container } = renderChatPage();
    const response = container.querySelector("[data-chat-response]");

    expect(response?.textContent).not.toContain("AXIOM");
    expect(response?.querySelector("img")).toBeNull();
  });

  it("positions the welcome workspace above the vertical center", () => {
    window.scrollTo = vi.fn();
    render(
      <ChatPage
        conversationId={null}
        stage="welcome"
        evidenceOpen={false}
        investigation={null}
        draft={null}
        processEvents={[]}
        result={null}
        history={[]}
        error={null}
        historyLoading={false}
        loading={false}
        canRetry={false}
        inspectorItems={[]}
        activeProcessEventKey={null}
        onProcessEventSelect={vi.fn()}
        engine="auto"
        processInspectorOpen={false}
        onProcessInspectorClose={vi.fn()}
        onProcessInspectorOpen={vi.fn()}
        onSubmit={vi.fn()}
        onEngineChange={vi.fn()}
        onSpecificationChange={vi.fn()}
        onSpecificationRevise={vi.fn()}
        onResetSpecification={vi.fn()}
        onApproveAndRun={vi.fn()}
        onRetryProcess={vi.fn()}
        onCloseEvidence={vi.fn()}
      />,
    );

    const welcome = screen.getByRole("region", { name: "New chat" });
    expect(welcome.className).toContain("items-start");
    expect(welcome.className).toContain("pt-[clamp(12rem,30vh,32rem)]");
  });

  it("shows a stable Thinking response instead of a skeleton while chat is pending", () => {
    render(
      <ChatPage
        conversationId="conversation-42"
        stage="pending"
        evidenceOpen={false}
        investigation={investigation}
        draft={null}
        processEvents={[]}
        result={null}
        history={[]}
        error={null}
        historyLoading={false}
        loading
        canRetry={false}
        inspectorItems={[]}
        activeProcessEventKey={null}
        onProcessEventSelect={vi.fn()}
        engine="auto"
        processInspectorOpen={false}
        onProcessInspectorClose={vi.fn()}
        onProcessInspectorOpen={vi.fn()}
        onSubmit={vi.fn()}
        onEngineChange={vi.fn()}
        onSpecificationChange={vi.fn()}
        onSpecificationRevise={vi.fn()}
        onResetSpecification={vi.fn()}
        onApproveAndRun={vi.fn()}
        onRetryProcess={vi.fn()}
        onCloseEvidence={vi.fn()}
      />,
    );

    const thinking = screen.getByText("Thinking…");
    expect(thinking).toBeTruthy();
    expect(thinking.closest("[data-chat-response]")?.querySelector("[aria-hidden='true']")).toBeNull();
    expect(screen.queryByTestId("skeleton")).toBeNull();
  });

  it("replaces Thinking with a neutral error when no answer has streamed", () => {
    render(
      <ChatPage
        {...chatPageProps({
          error: {
            kind: "unavailable",
            message: "Chat is temporarily unavailable. Please try again in a moment.",
            status: null,
            code: "runtime_unavailable",
            retryable: true,
            cause: null,
          },
          canRetry: true,
        })}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Chat is temporarily unavailable. Please try again in a moment.",
    );
    expect(screen.queryByText("Thinking…")).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy response" })).toBeNull();
  });

  it("shows history loading without a fake user turn or skeleton", () => {
    render(
      <ChatPage
        {...chatPageProps({
          stage: "welcome",
          investigation: null,
          historyLoading: true,
        })}
      />,
    );

    expect(screen.getByText("Loading conversation…")).toBeTruthy();
    expect(screen.queryByText("Loading conversation history...")).toBeNull();
    expect(screen.queryByTestId("skeleton")).toBeNull();
  });

  it("keeps partial output and renders a safe retryable error in the response region", async () => {
    const actor = userEvent.setup();
    const onRetryProcess = vi.fn();
    const { container } = render(
      <ChatPage
        {...chatPageProps({
          stage: "result",
          loading: false,
          canRetry: true,
          onRetryProcess,
          result: {
            title: "Answer",
            summary: "",
            markdown: "Partial response",
            metrics: [],
            flags: [],
            evidence: [],
            artifacts: [],
          },
          error: {
            kind: "busy",
            message: "Chat is busy right now. Please try again in a moment.",
            status: 503,
            code: null,
            retryable: true,
            cause: new Error("AXIOM returned 503."),
          },
        })}
      />,
    );

    const response = container.querySelector("[data-chat-response]");
    expect(response?.textContent).toContain("Partial response");
    expect(response?.textContent).not.toContain("AXIOM returned");
    expect(screen.getByRole("alert").textContent).toContain(
      "Chat is busy right now. Please try again in a moment.",
    );

    const error = screen.getByRole("alert");
    const copy = screen.getByRole("button", { name: "Copy response" });
    const finalAnswer = screen.getByRole("region", { name: "Final answer" });

    expect(finalAnswer.contains(error)).toBe(true);
    expect(finalAnswer.contains(copy)).toBe(true);
    expect(error.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await actor.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryProcess).toHaveBeenCalledOnce();
  });

  it("uses a stable composer dock without a second surface border", () => {
    const { container } = render(<ChatPage {...chatPageProps()} />);
    const dock = container.querySelector("[data-chat-composer-dock]");

    expect(dock).toBeTruthy();
    expect(dock?.className).not.toContain("border-t");
  });

  it("renders a historical failure without offering retry", () => {
    render(
      <ChatPage
        {...chatPageProps({
          history: [
            {
              executionMode: "instant",
              investigation,
              result: null,
              error: {
                kind: "cancelled",
                message: "That response was stopped.",
                status: null,
                code: "cancelled",
                retryable: false,
                cause: null,
              },
              processEvents: [],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("That response was stopped.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });
});
