import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppTopBar } from "./AppTopBar";

const themeState = vi.hoisted(() => ({
  resolvedTheme: "light" as "light" | "dark",
  setTheme: vi.fn(),
}));

vi.mock("@/app/ThemeProvider", () => ({
  useTheme: () => themeState,
}));

const workspace = {
  id: "workspace-1",
  organization_id: "org-1",
  name: "Evidence Review",
  slug: "evidence-review",
  description: null,
  status: "active",
  is_default: true,
  role: "editor" as const,
};

const callbacks = {
  onHome: vi.fn(),
  onNewChat: vi.fn(),
  onData: vi.fn(),
  onReports: vi.fn(),
  onWorkspaceSelect: vi.fn(),
};

function renderTopBar(showPrimaryNavigation = false) {
  return render(
    <TooltipProvider>
      <AppTopBar
        showPrimaryNavigation={showPrimaryNavigation}
        {...callbacks}
        scope={{
          organization: { id: "org-1", name: "Research Operations" },
          workspace: null,
        }}
        workspaces={[workspace]}
        selectedWorkspace={workspace}
        workspacesLoading={false}
      />
    </TooltipProvider>,
  );
}

describe("AppTopBar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    themeState.resolvedTheme = "light";
  });

  it("combines application scope and theme into one toolbar", async () => {
    const actor = userEvent.setup();
    renderTopBar();

    expect(screen.getByRole("banner", { name: "Application toolbar" })).toBeTruthy();
    expect(screen.getByLabelText("Current application scope")).toBeTruthy();

    await actor.click(screen.getByRole("button", { name: "Use dark theme" }));

    expect(themeState.setTheme).toHaveBeenCalledWith("dark");
  });

  it("exposes the light-theme action when dark mode is active", () => {
    themeState.resolvedTheme = "dark";
    renderTopBar();

    expect(screen.getByRole("button", { name: "Use light theme" })).toBeTruthy();
  });

  it("keeps the home navigation in the same top bar", async () => {
    const actor = userEvent.setup();
    renderTopBar(true);

    expect(screen.getByRole("navigation", { name: "Workspace sections" })).toBeTruthy();
    await actor.click(screen.getByRole("button", { name: "Chat" }));
    await actor.click(screen.getByRole("button", { name: "Data" }));

    expect(callbacks.onNewChat).toHaveBeenCalledOnce();
    expect(callbacks.onData).toHaveBeenCalledOnce();
  });
});
