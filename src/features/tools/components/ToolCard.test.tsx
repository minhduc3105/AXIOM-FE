import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolsProvider } from "../model/ToolsProvider";
import type { ToolSummary } from "../model/types";
import { ToolCard } from "./ToolCard";

const tool: ToolSummary = {
  name: "keyword_extract",
  kind: "utility_method",
  description: "Extract relevant keywords from text.",
  required_params: ["text"],
  param_count: 2,
};

describe("ToolCard", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("opens tool detail when the card is selected", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <ToolsProvider>
        <ToolCard tool={tool} onOpen={onOpen} />
      </ToolsProvider>,
    );

    await user.click(screen.getByRole("link", { name: /open keyword extract/i }));

    expect(onOpen).toHaveBeenCalledWith("keyword_extract");
  });

  it("toggles status without opening tool detail", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <ToolsProvider>
        <ToolCard tool={tool} onOpen={onOpen} />
      </ToolsProvider>,
    );
    const statusSwitch = screen.getByRole("switch", {
      name: /enable keyword extract/i,
    });

    await user.click(statusSwitch);

    expect(statusSwitch).toHaveAttribute("aria-checked", "true");
    expect(onOpen).not.toHaveBeenCalled();
  });
});
