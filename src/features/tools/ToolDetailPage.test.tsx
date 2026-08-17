import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ToolDetailPage } from "./ToolDetailPage";
import { ToolsProvider } from "./model/ToolsProvider";

describe("ToolDetailPage error states", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a missing tool separately from a Methods-Hub outage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "Tool not found" }), { status: 404 })));
    render(
      <ToolsProvider>
        <ToolDetailPage
          toolName="missing_tool"
          onBack={vi.fn()}
          availabilityScope={{ organizationName: "AXIOM", workspaceName: "Research" }}
        />
      </ToolsProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Tool not found" })).toBeTruthy();
    expect(screen.queryByText("Methods-Hub is unavailable")).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.getByRole("button", { name: "Back to Tools" })).toBeTruthy();
  });
});
