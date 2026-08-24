import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatModelReasoningSelector } from "./ChatModelReasoningSelector";

const longModelLabel = "Very Long Operations Reasoning Model Name";

const defaultModels = [
  {
    id: "model-long",
    alias: "model-long",
    label: longModelLabel,
    status: "active",
  },
  {
    id: "model-fast",
    alias: "model-fast",
    label: "Fast model",
    status: "active",
  },
];

function renderSelector({
  models = defaultModels,
  selectedModelAlias = "model-long",
}: {
  models?: Parameters<typeof ChatModelReasoningSelector>[0]["models"];
  selectedModelAlias?: string;
} = {}) {
  const onModelChange = vi.fn();
  const onExecutionModeChange = vi.fn();
  render(
    <TooltipProvider>
      <ChatModelReasoningSelector
        models={models}
        selectedModelAlias={selectedModelAlias}
        executionMode="instant"
        onModelChange={onModelChange}
        onExecutionModeChange={onExecutionModeChange}
      />
    </TooltipProvider>,
  );
  return { onModelChange, onExecutionModeChange };
}

describe("ChatModelReasoningSelector", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the active model and mode with an accessible full label", () => {
    renderSelector();

    const trigger = screen.getByRole("button", {
      name: `Chat model: ${longModelLabel}; Reasoning: Instant`,
    });

    expect(trigger.getAttribute("title")).toBe(`${longModelLabel} · Instant`);
    expect(trigger.querySelector(".truncate")).toBeTruthy();
  });

  it("selects a model using keyboard menu navigation", async () => {
    const actor = userEvent.setup();
    const { onModelChange } = renderSelector();
    const trigger = screen.getByRole("button", {
      name: `Chat model: ${longModelLabel}; Reasoning: Instant`,
    });

    trigger.focus();
    await actor.keyboard("{Enter}");

    expect(screen.getByText("Model")).toBeTruthy();
    expect(screen.getByText("Reasoning")).toBeTruthy();

    await actor.keyboard("{ArrowDown}{Enter}");
    expect(onModelChange).toHaveBeenCalledWith("model-fast");
  });

  it("selects a reasoning mode with the keyboard", async () => {
    const actor = userEvent.setup();
    const { onExecutionModeChange } = renderSelector();
    const trigger = screen.getByRole("button", {
      name: `Chat model: ${longModelLabel}; Reasoning: Instant`,
    });

    trigger.focus();
    await actor.keyboard("{Enter}");
    screen
      .getByRole("menuitemradio", {
        name: "ThinkingReview plan before running",
      })
      .focus();
    await actor.keyboard("{Enter}");

    expect(onExecutionModeChange).toHaveBeenCalledWith("thinking");
  });

  it("moves overflow models into a keyboard-accessible More models submenu", async () => {
    const actor = userEvent.setup();
    const models = Array.from({ length: 6 }, (_, index) => ({
      id: `model-${index + 1}`,
      alias: `model-${index + 1}`,
      label: `Model ${index + 1}`,
      status: "active",
    }));
    const { onModelChange } = renderSelector({
      models,
      selectedModelAlias: "model-1",
    });
    const trigger = screen.getByRole("button", {
      name: "Chat model: Model 1; Reasoning: Instant",
    });

    trigger.focus();
    await actor.keyboard("{Enter}");

    expect(screen.getByRole("menuitemradio", { name: "Model 3" })).toBeTruthy();
    expect(screen.queryByRole("menuitemradio", { name: "Model 4" })).toBeNull();

    const moreModels = screen.getByRole("menuitem", { name: "More models" });
    moreModels.focus();
    await actor.keyboard("{ArrowRight}");

    const overflowModel = screen.getByRole("menuitemradio", { name: "Model 4" });
    overflowModel.focus();
    await actor.keyboard("{Enter}");

    expect(onModelChange).toHaveBeenCalledWith("model-4");
  });
});
