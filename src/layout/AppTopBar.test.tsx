import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
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

const callbacks = { onWorkspaceSelect: vi.fn() };
const shellCallbacks = {
  onNavigationToggle: vi.fn(),
  onInspectorOpen: vi.fn(),
};

function renderTopBar({
  route = {
    surface: "data",
    page: "dashboard",
    sourceId: null,
    sessionId: null,
  },
  navigationOpen = false,
  showNavigationToggle = false,
  showInspectorToggle = false,
  chatControls,
}: {
  route?: Parameters<typeof AppTopBar>[0]["route"];
  navigationOpen?: boolean;
  showNavigationToggle?: boolean;
  showInspectorToggle?: boolean;
  chatControls?: ReactNode;
} = {}) {
  return render(
    <TooltipProvider>
      <AppTopBar
        route={route}
        {...callbacks}
        navigationOpen={navigationOpen}
        onNavigationToggle={shellCallbacks.onNavigationToggle}
        showNavigationToggle={showNavigationToggle}
        showInspectorToggle={showInspectorToggle}
        onInspectorOpen={shellCallbacks.onInspectorOpen}
        chatControls={chatControls}
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

    expect(
      screen.getByRole("banner", { name: "Application toolbar" }),
    ).toBeTruthy();
    expect(screen.getByText("Data Management")).toBeTruthy();
    expect(screen.getByLabelText("Current application scope")).toBeTruthy();

    await actor.click(screen.getByRole("button", { name: "Use dark theme" }));

    expect(themeState.setTheme).toHaveBeenCalledWith("dark");
  });

  it("keeps non-chat page context to a single compact toolbar line", () => {
    renderTopBar();

    const toolbar = screen.getByRole("banner", {
      name: "Application toolbar",
    });

    expect(toolbar.className).toContain("h-14");
    expect(screen.getByText("Data Management")).toBeTruthy();
    expect(
      screen.queryByText("Monitor file inventory and processing health."),
    ).toBeNull();
  });

  it("exposes the light-theme action when dark mode is active", () => {
    themeState.resolvedTheme = "dark";
    renderTopBar();

    expect(
      screen.getByRole("button", { name: "Use light theme" }),
    ).toBeTruthy();
  });

  it("does not duplicate workspace navigation in the header", () => {
    renderTopBar();

    expect(
      screen.queryByRole("navigation", { name: "Workspace sections" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Homepage" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Chat" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Data" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Report" })).toBeNull();
  });

  it("keeps workspace navigation out of the desktop toolbar", () => {
    renderTopBar();

    expect(
      screen.queryByRole("button", { name: "Open workspace navigation" }),
    ).toBeNull();
  });

  it("opens workspace navigation from the mobile toolbar", async () => {
    const actor = userEvent.setup();
    renderTopBar({ showNavigationToggle: true });

    await actor.click(
      screen.getByRole("button", { name: "Open workspace navigation" }),
    );

    expect(shellCallbacks.onNavigationToggle).toHaveBeenCalledOnce();
  });

  it("keeps the close workspace navigation action accessible", () => {
    renderTopBar({ navigationOpen: true, showNavigationToggle: true });

    expect(
      screen.getByRole("button", { name: "Close workspace navigation" }),
    ).toBeTruthy();
  });

  it("opens Logs & Files from the chat toolbar", async () => {
    const actor = userEvent.setup();
    renderTopBar({
      route: { surface: "chat", page: "conversation", sessionId: "chat-42" },
      showInspectorToggle: true,
    });

    await actor.click(
      screen.getByRole("button", { name: "Open Logs & Files" }),
    );

    expect(shellCallbacks.onInspectorOpen).toHaveBeenCalledOnce();
  });

  it("orders scope, theme, and Logs & Files as ghost utility controls", () => {
    renderTopBar({
      route: { surface: "chat", page: "conversation", sessionId: "chat-42" },
      showInspectorToggle: true,
    });

    const toolbar = screen.getByRole("banner", { name: "Application toolbar" });
    const controls = Array.from(toolbar.querySelectorAll("button")).map(
      (button) => button.getAttribute("aria-label"),
    );
    const theme = screen.getByRole("button", { name: "Use dark theme" });
    const logs = screen.getByRole("button", { name: "Open Logs & Files" });

    expect(controls).toEqual([
      "Switch workspace. Current workspace: Evidence Review",
      "Use dark theme",
      "Open Logs & Files",
    ]);
    expect(theme.className).not.toContain("bg-card");
    expect(logs.className).not.toContain("bg-card");
    expect(logs.getAttribute("aria-controls")).toBe("process-inspector");
  });

  it("hides application scope below the mobile breakpoint", () => {
    renderTopBar({
      route: { surface: "chat", page: "conversation", sessionId: "chat-42" },
      showInspectorToggle: true,
    });

    const scope = screen.getByLabelText("Current application scope");

    expect(scope.parentElement?.className).toContain("hidden");
    expect(scope.parentElement?.className).toContain("sm:flex");
  });

  it("shows chat controls without the redundant Chat page context", () => {
    renderTopBar({
      route: { surface: "chat", page: "compose", sessionId: null },
      chatControls: <button type="button">Chat model settings</button>,
    });

    expect(
      screen.getByRole("button", { name: "Chat model settings" }),
    ).toBeTruthy();
    expect(screen.queryByText("Chat")).toBeNull();
    expect(
      screen.queryByText("Ask questions and explore your workspace."),
    ).toBeNull();
  });

  it("places chat controls in the left page-context slot", () => {
    renderTopBar({
      route: { surface: "chat", page: "compose", sessionId: null },
      chatControls: <button type="button">Chat model settings</button>,
    });

    const chatContext = screen.getByRole("group", { name: "Chat controls" });

    expect(
      within(chatContext).getByRole("button", { name: "Chat model settings" }),
    ).toBeTruthy();
    expect(
      chatContext.nextElementSibling?.contains(
        screen.getByLabelText("Current application scope"),
      ),
    ).toBe(true);
  });

  it("keeps chat controls off non-chat routes", () => {
    renderTopBar({
      chatControls: <button type="button">Chat model settings</button>,
    });

    expect(
      screen.queryByRole("button", { name: "Chat model settings" }),
    ).toBeNull();
  });
});
