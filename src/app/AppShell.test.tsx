import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";

vi.mock("@/layout/AppTopBar", () => ({
  AppTopBar: () => <header data-testid="app-top-bar">Toolbar</header>,
}));

vi.mock("@/shared/components/WorkspaceRail", () => ({
  WorkspaceRail: () => <nav>Navigation</nav>,
}));

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
  });

  it("owns non-chat scrolling inside the viewport-bound content outlet", () => {
    render(
      <AppShell
        route={{ surface: "reports", sessionId: null }}
        activeStage="welcome"
        surface="reports"
        activeConversationId={null}
        processInspectorOpen={false}
        showInspectorToggle={false}
        onInspectorOpen={vi.fn()}
        onNewChat={vi.fn()}
        onConversationOpen={vi.fn()}
        onConversationDeleted={vi.fn()}
        onData={vi.fn()}
        onReports={vi.fn()}
        onMemory={vi.fn()}
        onModels={vi.fn()}
        onTools={vi.fn()}
        onSettings={vi.fn()}
        onOrganizationAdministration={vi.fn()}
        user={null}
        scope={null}
        workspaces={[]}
        selectedWorkspace={null}
        workspacesLoading={false}
        onWorkspaceSelect={vi.fn()}
        onLogout={vi.fn()}
      >
        <div>Reports content</div>
      </AppShell>,
    );

    const app = screen.getByRole("main");
    const contentOutlet = screen.getByTestId("app-content-outlet");

    expect(app.className).toContain("h-dvh");
    expect(app.className).toContain("overflow-hidden");
    expect(contentOutlet.className).toContain("overflow-y-auto");
    expect(contentOutlet.textContent).toContain("Reports content");
  });

  it("places the desktop inspector beside the toolbar and chat column at full viewport height", () => {
    render(
      <AppShell
        route={{ surface: "chat", page: "conversation", sessionId: "conversation-1" }}
        activeStage="result"
        surface="chat"
        activeConversationId="conversation-1"
        processInspectorOpen
        showInspectorToggle={false}
        onInspectorOpen={vi.fn()}
        onNewChat={vi.fn()}
        onConversationOpen={vi.fn()}
        onConversationDeleted={vi.fn()}
        onData={vi.fn()}
        onReports={vi.fn()}
        onMemory={vi.fn()}
        onModels={vi.fn()}
        onTools={vi.fn()}
        onSettings={vi.fn()}
        onOrganizationAdministration={vi.fn()}
        user={null}
        scope={null}
        workspaces={[]}
        selectedWorkspace={null}
        workspacesLoading={false}
        onWorkspaceSelect={vi.fn()}
        onLogout={vi.fn()}
        desktopInspector={<div>Analysis logs</div>}
      >
        <div>Chat content</div>
      </AppShell>,
    );

    const inspector = screen.getByRole("complementary", { name: "Process details" });
    expect(inspector.id).toBe("process-inspector");
    expect(inspector.className).toContain("h-dvh");
    expect(
      inspector.previousElementSibling?.contains(screen.getByTestId("app-top-bar")),
    ).toBe(true);
    expect(inspector.previousElementSibling?.textContent).toContain("Chat content");
  });
});
