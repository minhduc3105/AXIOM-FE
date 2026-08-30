import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allChatDataScope } from "../model/chatDataScope";
import { ChatComposer } from "./ChatComposer";

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
    expect(screen.queryByRole("button", { name: "Select LLM model" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Select execution mode" })).toBeNull();

    await actor.type(screen.getByRole("textbox", { name: "Ask AXIOM" }), "Review this");
    await actor.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith("Review this", "auto", []);
  });

  it("keeps mobile actions on one compact rail", () => {
    render(
      <ChatComposer
        dataScope={allChatDataScope}
        engine="auto"
        onDataScopeChange={vi.fn()}
        onEngineChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const actionRail = document.querySelector("[data-chat-composer-actions]");

    expect(actionRail).toBeTruthy();
    expect(actionRail?.className).toContain("flex-nowrap");
    expect(actionRail?.className).not.toContain("flex-wrap");
    expect(
      screen
        .getByRole("button", {
          name: "Select data scope, currently All workspace data",
        })
        .className,
    ).toContain("flex-1");
  });
});
