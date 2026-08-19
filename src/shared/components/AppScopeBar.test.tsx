import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppScopeBar } from "./AppScopeBar";

const workspaces = [
  {
    id: "workspace-1",
    organization_id: "org-1",
    name: "Evidence Review Workspace With A Very Long Name",
    slug: "evidence-review",
    description: null,
    status: "active",
    is_default: true,
    role: "workspace_admin" as const,
  },
  {
    id: "workspace-2",
    organization_id: "org-1",
    name: "Research Operations",
    slug: "research-operations",
    description: null,
    status: "active",
    is_default: false,
    role: "viewer" as const,
  },
];

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

  it("presents a compact workspace selector and selects an assigned workspace", async () => {
    const actor = userEvent.setup();
    const onWorkspaceSelect = vi.fn();

    render(
      <TooltipProvider>
        <AppScopeBar
          scope={{
            organization: { id: "org-1", name: "Research Operations" },
            workspace: null,
          }}
          workspaces={workspaces}
          selectedWorkspace={workspaces[0]}
          onWorkspaceSelect={onWorkspaceSelect}
        />
      </TooltipProvider>,
    );

    await actor.click(
      screen.getByRole("button", {
        name: `Switch workspace. Current workspace: ${workspaces[0].name}`,
      }),
    );
    await actor.click(
      await screen.findByRole("menuitem", {
        name: "Switch to workspace Research Operations",
      }),
    );

    expect(onWorkspaceSelect).toHaveBeenCalledWith("workspace-2");
  });

  it("keeps loading and unavailable workspace states explicit", () => {
    const { rerender } = render(
      <TooltipProvider>
        <AppScopeBar
          scope={{
            organization: { id: "org-1", name: "Research Operations" },
            workspace: null,
          }}
          workspaces={[]}
          workspacesLoading
          onWorkspaceSelect={() => undefined}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("Loading workspaces…")).toBeTruthy();
    expect(
      screen
        .getByRole("button", {
          name: "Switch workspace. Current workspace: Unavailable",
        })
        .hasAttribute("disabled"),
    ).toBe(true);

    rerender(
      <TooltipProvider>
        <AppScopeBar
          scope={{
            organization: { id: "org-1", name: "Research Operations" },
            workspace: null,
          }}
          workspaces={[]}
          onWorkspaceSelect={() => undefined}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText("No workspace")).toBeTruthy();
  });
});
