import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { allChatDataScope } from "../model/chatDataScope";
import type { ChatEngine } from "../model/types";
import { ChatComposer } from "./ChatComposer";

function ReplyContextComposer({
  onSubmit,
  onClearReplyContext,
}: {
  onSubmit: (
    message: string,
    engine: ChatEngine,
    files: File[],
    replyContext?: string,
  ) => void;
  onClearReplyContext: () => void;
}) {
  const [replyContext, setReplyContext] = useState<string | null>(
    "verified result",
  );

  return (
    <ChatComposer
      engine="auto"
      onEngineChange={vi.fn()}
      onSubmit={onSubmit}
      replyContext={replyContext}
      onClearReplyContext={() => {
        onClearReplyContext();
        setReplyContext(null);
      }}
    />
  );
}

describe("ChatComposer", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps attachment, response type, and send without model controls", async () => {
    const actor = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ChatComposer
        engine="auto"
        onEngineChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("button", { name: "Attach files" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Select response type" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Select LLM model" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Select execution mode" }),
    ).toBeNull();

    await actor.type(
      screen.getByRole("textbox", { name: "Ask AXIOM" }),
      "Review this",
    );
    await actor.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith("Review this", "auto", []);
  });

  it("shows and submits the selected answer quote as reply context", async () => {
    const actor = userEvent.setup();
    const onSubmit = vi.fn();
    const onClearReplyContext = vi.fn();
    render(
      <ChatComposer
        engine="auto"
        onEngineChange={vi.fn()}
        onSubmit={onSubmit}
        replyContext="verified result"
        onClearReplyContext={onClearReplyContext}
      />,
    );

    const preview = document.querySelector("[data-reply-context-preview]");
    expect(preview?.textContent).toContain("verified result");
    expect(screen.queryByText("Replying to")).toBeNull();
    expect(preview?.querySelector("svg")).toBeTruthy();
    await actor.type(
      screen.getByRole("textbox", { name: "Ask AXIOM" }),
      "Explain this",
    );
    await actor.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
      "Explain this",
      "auto",
      [],
      "verified result",
    );
    expect(onClearReplyContext).toHaveBeenCalledOnce();
  });

  it("clears a staged reply quote without submitting", async () => {
    const actor = userEvent.setup();
    const onSubmit = vi.fn();
    const onClearReplyContext = vi.fn();
    render(
      <ReplyContextComposer
        onSubmit={onSubmit}
        onClearReplyContext={onClearReplyContext}
      />,
    );

    expect(document.querySelector("[data-reply-context-preview]")).toBeTruthy();
    await actor.click(
      screen.getByRole("button", { name: "Clear reply context" }),
    );

    expect(document.querySelector("[data-reply-context-preview]")).toBeNull();
    expect(onClearReplyContext).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps mobile actions on one compact rail", () => {
    render(
      <ChatComposer
        engine="auto"
        onEngineChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const actionRail = document.querySelector("[data-chat-composer-actions]");

    expect(actionRail).toBeTruthy();
    expect(actionRail?.className).toContain("flex-nowrap");
    expect(actionRail?.className).not.toContain("flex-wrap");
    expect(
      screen.queryByRole("button", { name: /Select data scope/ }),
    ).toBeNull();
  });

  it("opens chat files from the composer action rail", async () => {
    const actor = userEvent.setup();
    const onDataScopeOpen = vi.fn();

    render(
      <ChatComposer
        engine="auto"
        onEngineChange={vi.fn()}
        onSubmit={vi.fn()}
        dataScope={allChatDataScope}
        onDataScopeOpen={onDataScopeOpen}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Open chat files" }));

    expect(onDataScopeOpen).toHaveBeenCalledOnce();
  });

  it("shows only the clarification controls and restores the composer afterward", async () => {
    const actor = userEvent.setup();
    const onUserInputSubmit = vi.fn();
    const onUserInputCancel = vi.fn();
    const { rerender } = render(
      <ChatComposer
        engine="auto"
        onEngineChange={vi.fn()}
        onSubmit={vi.fn()}
        dataScope={allChatDataScope}
        onDataScopeOpen={vi.fn()}
        onStop={vi.fn()}
        pendingUserInput={{
          responseId: "response-1",
          interactionId: "interaction-1",
          reason: "method_definition",
          question: "Which method should I use?",
          options: [
            { id: "simple", label: "Simple average", source: "Policy A" },
            { id: "weighted", label: "Weighted average" },
          ],
        }}
        onUserInputSubmit={onUserInputSubmit}
        onUserInputCancel={onUserInputCancel}
      />,
    );

    expect(
      screen.getByRole("radio", { name: /Simple average.*Policy A/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Weighted average" }),
    ).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Other" })).toBeTruthy();
    expect(document.querySelector('[data-slot="card"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="field-set"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="radio-group"]')).not.toBeNull();
    const clarificationRegion = screen.getByRole("region", {
      name: "Which method should I use?",
    });
    const composerFrame = clarificationRegion.closest("form");
    expect(composerFrame?.className).not.toContain("border-border");
    expect(composerFrame?.className).not.toContain("focus-within:");

    const simpleAverage = screen.getByRole("radio", {
      name: /Simple average.*Policy A/,
    });
    await actor.click(simpleAverage);
    const selectedOption = simpleAverage.closest('[data-slot="field-label"]');
    expect(selectedOption?.className).toContain(
      "has-data-checked:border-border",
    );
    expect(selectedOption?.className).toContain(
      "has-data-checked:bg-transparent",
    );
    expect(selectedOption?.className).not.toContain(
      "has-data-checked:border-primary/30",
    );
    expect(selectedOption?.className).not.toContain(
      "has-data-checked:bg-primary/5",
    );

    expect(screen.queryByRole("textbox", { name: "Ask AXIOM" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Attach files" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Select response type" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Open chat files" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();

    await actor.click(screen.getByRole("radio", { name: "Other" }));
    expect(
      screen.getByRole("button", { name: "Continue" }).hasAttribute("disabled"),
    ).toBe(true);
    await actor.type(
      screen.getByRole("textbox", { name: "Your answer" }),
      "Use the median",
    );
    await actor.click(screen.getByRole("button", { name: "Continue" }));

    expect(onUserInputSubmit).toHaveBeenCalledWith({
      otherText: "Use the median",
    });
    await actor.click(screen.getByRole("button", { name: "Cancel question" }));
    expect(onUserInputCancel).toHaveBeenCalledOnce();

    rerender(
      <ChatComposer
        engine="auto"
        onEngineChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Ask AXIOM" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Attach files" })).toBeTruthy();
  });

  it("restores the regular composer while a clarification answer is resuming", () => {
    render(
      <ChatComposer
        engine="auto"
        onEngineChange={vi.fn()}
        onSubmit={vi.fn()}
        onStop={vi.fn()}
        sendDisabled
        pendingUserInput={{
          responseId: "response-1",
          interactionId: "interaction-1",
          reason: "method_definition",
          question: "Which method should I use?",
          options: [{ id: "simple", label: "Simple average" }],
        }}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Ask AXIOM" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Attach files" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Simple average" })).toBeNull();
  });

  it("shows finding impact and evidence while awaiting a safeguard choice", () => {
    render(
      <ChatComposer
        engine="auto"
        onEngineChange={vi.fn()}
        onSubmit={vi.fn()}
        pendingUserInput={{
          responseId: "response-safeguard",
          interactionId: "interaction-safeguard",
          reason: "data_quality_issue",
          question: "Continue with the available months?",
          options: [{ id: "continue", label: "Continue with available data" }],
          safeguardAssessment: {
            decision: "needs_user_input",
            findings: [
              {
                id: "missing-period",
                category: "data_quality",
                severity: "moderate",
                title: "Missing period",
                detail: "April is absent from the source.",
                impact: "The monthly average may be understated.",
                affectedScope: "April",
                evidenceRefs: ["source://ledger"],
                blocking: false,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("Missing period")).toBeTruthy();
    expect(
      screen.getByText("The monthly average may be understated."),
    ).toBeTruthy();
    expect(screen.getByText("April")).toBeTruthy();
    expect(screen.getByText("source://ledger")).toBeTruthy();
  });
});
