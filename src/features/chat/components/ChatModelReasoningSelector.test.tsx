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
    window.localStorage.clear();
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

  it("groups models by provider and lets users pin a favorite", async () => {
    const actor = userEvent.setup();
    const models = [
      {
        id: "openai:gpt-4o",
        alias: "openai:gpt-4o",
        label: "GPT-4o",
        providerId: "openai",
        providerName: "OpenAI",
        status: "active",
      },
      {
        id: "openai:o3",
        alias: "openai:o3",
        label: "o3",
        providerId: "openai",
        providerName: "OpenAI",
        status: "active",
      },
      {
        id: "anthropic:claude",
        alias: "anthropic:claude",
        label: "Claude Sonnet",
        providerId: "anthropic",
        providerName: "Anthropic",
        status: "active",
      },
    ];
    const { onModelChange } = renderSelector({
      models,
      selectedModelAlias: "openai:gpt-4o",
    });
    const trigger = screen.getByRole("button", {
      name: "Chat model: GPT-4o; Reasoning: Instant",
    });

    trigger.focus();
    await actor.keyboard("{Enter}");

    expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Anthropic").length).toBeGreaterThan(0);
    expect(screen.queryByText("More models")).toBeNull();

    await actor.click(screen.getByRole("button", { name: "Pin o3" }));

    expect(screen.getByText("Favorites")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Unpin o3" })).toBeTruthy();
    expect(window.localStorage.getItem("axiom.chat.favorite-models")).toContain(
      "openai:o3",
    );

    await actor.click(screen.getByRole("menuitem", { name: /Claude Sonnet/ }));
    expect(onModelChange).toHaveBeenCalledWith("anthropic:claude");
  });
});
