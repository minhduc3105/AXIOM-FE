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
  enabled: false,
};

describe("ToolCard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          tool_name: tool.name,
          enabled: true,
          changed: true,
          scope: "process",
          persistent: false,
        }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

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

  it("shows disabled tools as compact cards", () => {
    render(
      <ToolsProvider>
        <ToolCard tool={tool} onOpen={vi.fn()} />
      </ToolsProvider>,
    );

    expect(screen.getByText("Keyword Extract")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /enable keyword extract/i }),
    ).toBeTruthy();
    expect(screen.queryByText(tool.description)).toBeNull();
    expect(screen.queryByText(/parameters/i)).toBeNull();
  });

  it("enables the tool without opening tool detail", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <ToolsProvider>
        <ToolCard tool={tool} onOpen={onOpen} />
      </ToolsProvider>,
    );
    const enableButton = screen.getByRole("button", {
      name: /enable keyword extract/i,
    });

    await user.click(enableButton);

    expect(
      screen.getByRole("button", { name: /disable keyword extract/i }),
    ).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      "/methods-hub/api/v1/admin/tools/keyword_extract",
      expect.objectContaining({
        body: JSON.stringify({ enabled: true }),
        method: "PATCH",
      }),
    );
    expect(onOpen).not.toHaveBeenCalled();
  });
});
