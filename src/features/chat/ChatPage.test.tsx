import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPage } from "./ChatPage";

vi.mock("@/shared/hooks/use-media-query", () => ({
  useMediaQuery: () => true,
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

function renderChatPage() {
  const onProcessInspectorClose = vi.fn();
  const onProcessInspectorOpen = vi.fn();
  render(
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
      loading={false}
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
  return { onProcessInspectorClose, onProcessInspectorOpen };
}

describe("ChatPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders Logs & Files in the chat workspace and closes it from its header", async () => {
    const actor = userEvent.setup();
    const { onProcessInspectorClose } = renderChatPage();

    expect(screen.getByRole("complementary", { name: "Process details" })).toBeTruthy();
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
        loading={false}
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
});
