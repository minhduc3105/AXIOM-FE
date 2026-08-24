import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
});
