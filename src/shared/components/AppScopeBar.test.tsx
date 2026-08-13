import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppScopeBar } from "./AppScopeBar";

describe("AppScopeBar", () => {
  afterEach(cleanup);

  it("always presents organization context and an optional workspace", () => {
    render(
      <TooltipProvider>
        <AppScopeBar
          scope={{
            organization: { id: "org-1", name: "Research Operations" },
            workspace: { id: "workspace-1", name: "Evidence Review" },
          }}
        />
      </TooltipProvider>,
    );

    expect(screen.getByLabelText("Current application scope")).toBeTruthy();
    expect(screen.getByText("Research Operations")).toBeTruthy();
    expect(screen.getByText("Evidence Review")).toBeTruthy();
  });

  it("does not invent workspace context on organization-scoped screens", () => {
    render(
      <TooltipProvider>
        <AppScopeBar
          scope={{
            organization: { id: "org-fallback", name: "org-fallback" },
            workspace: null,
          }}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("org-fallback")).toBeTruthy();
    expect(screen.queryByText("Workspace")).toBeNull();
  });
});
