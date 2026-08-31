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
    activeProcessEventKey: null,
    onProcessEventSelect: vi.fn(),
    engine: "auto",
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
  const view = render(
    <ChatPage
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
      activeProcessEventKey={null}
      onProcessEventSelect={vi.fn()}
      engine="report"
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
  return view;
}

describe("ChatPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps process activity inline instead of opening Logs & Files", () => {
    renderChatPage();

    expect(screen.getByRole("region", { name: "Actions" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Logs & Files" })).toBeNull();
  });

  it("renders process activity inline as an expandable action timeline", async () => {
    render(
      <ChatPage
        {...chatPageProps({
          stage: "process",
          loading: true,
          processEvents: [
            {
              id: "read-file",
              label: "Read file",
              detail: "Reading the selected file",
              status: "done",
              phase: "tool",
            },
            {
              id: "execute-python",
              label: "Execute python",
              detail: "Running the analysis",
              status: "running",
              phase: "tool",
            },
          ],
        })}
      />,
    );

    expect(screen.getByRole("region", { name: "Actions" })).toBeTruthy();
    const actionMarker = screen.getByRole("button", {
      name: "Loaded a tool, read files, ran commands",
    });
    expect(actionMarker.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Read file" })).toBeNull();
    await userEvent.setup().click(actionMarker);
    expect(screen.getByRole("button", { name: "Read file" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Execute python" })).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Logs & Files" })).toBeNull();
  });

  it("summarizes actions and keeps each marker row compact", async () => {
    render(
      <ChatPage
        {...chatPageProps({
          stage: "process",
          processEvents: [
            {
              id: "read-file",
              label: "Read file",
              detail: "",
              status: "done",
              phase: "tool",
            },
            {
              id: "execute-python",
              label: "Execute python",
              detail: "",
              status: "done",
              phase: "tool",
            },
          ],
        })}
      />,
    );

    expect(
      screen.getByText("Loaded a tool, read files, ran commands"),
    ).toBeTruthy();
    const actionMarker = screen.getByRole("button", {
      name: "Loaded a tool, read files, ran commands",
    });
    expect(actionMarker.getAttribute("aria-expanded")).toBe("false");
    await userEvent.setup().click(actionMarker);
    expect(screen.getByRole("button", { name: "Read file" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Execute python" })).toBeTruthy();
  });

  it("uses marker rows as the interactive action controls", async () => {
    render(
      <ChatPage
        {...chatPageProps({
          stage: "process",
          processEvents: [
            {
              id: "read-file",
              label: "Read file",
              detail: "",
              status: "done",
              phase: "tool",
            },
          ],
        })}
      />,
    );

    const actionMarker = screen.getByRole("button", {
      name: "Loaded a tool, read files",
    });
    let markers = screen
      .getByRole("region", { name: "Actions" })
      .querySelectorAll('[data-slot="marker"]');

    expect(markers).toHaveLength(1);
    await userEvent.setup().click(actionMarker);
    markers = screen
      .getByRole("region", { name: "Actions" })
      .querySelectorAll('[data-slot="marker"]');
    expect(markers).toHaveLength(2);
    expect(
      Array.from(markers).every((marker) => marker.tagName === "BUTTON"),
    ).toBe(true);
  });

  it("expands an inline process step when it is selected in chat", async () => {
    const actor = userEvent.setup();
    renderChatPage();
    await actor.click(
      screen.getByRole("button", { name: "Loaded a tool, searched files" }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Search workspace files" }),
    );

    expect(
      screen
        .getByRole("button", { name: "Search workspace files" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.queryByRole("dialog", { name: "Logs & Files" })).toBeNull();
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
        activeProcessEventKey={null}
        onProcessEventSelect={vi.fn()}
        engine="auto"
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
    expect(welcome.firstElementChild?.className).toContain("items-center");
    expect(welcome.firstElementChild?.className).toContain(
      "pt-[clamp(12rem,30vh,32rem)]",
    );
  });

  it("shows a stable Thinking response instead of a skeleton while chat is pending", () => {
    render(
      <ChatPage
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
        activeProcessEventKey={null}
        onProcessEventSelect={vi.fn()}
        engine="auto"
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

    const thinking = screen.getByText("Thinking");
    expect(thinking).toBeTruthy();
    expect(
      thinking
        .closest("[data-chat-response]")
        ?.querySelector("[aria-hidden='true']"),
    ).toBeNull();
    expect(screen.queryByTestId("skeleton")).toBeNull();
  });

  it("replaces Thinking with a neutral error when no answer has streamed", () => {
    render(
      <ChatPage
        {...chatPageProps({
          error: {
            kind: "unavailable",
            message:
              "Chat is temporarily unavailable. Please try again in a moment.",
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
    expect(screen.queryByText("Thinking")).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy response" })).toBeNull();
  });

  it("shows history loading at the top of the chat column without a fake turn", () => {
    render(
      <ChatPage
        {...chatPageProps({
          stage: "welcome",
          investigation: null,
          historyLoading: true,
        })}
      />,
    );

    const loading = screen.getByText("Loading conversation…");
    const contentColumn = loading.closest(
      "[data-chat-response]",
    )?.parentElement;

    expect(contentColumn?.className).toContain("max-w-5xl");
    expect(contentColumn?.className).toContain("py-6");
    expect(contentColumn?.className).not.toContain("pt-[clamp(");
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
    expect(
      error.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

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
