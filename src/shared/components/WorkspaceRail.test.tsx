import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceRail } from "./WorkspaceRail";

vi.mock("@/shared/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

const intelligenceApi = vi.hoisted(() => ({
  listConversationsPage: vi.fn(),
}));

vi.mock("@/shared/lib/intelligence-api", () => ({
  deleteConversation: vi.fn(),
  listConversationsPage: intelligenceApi.listConversationsPage,
  updateConversation: vi.fn(),
}));

const callbacks = {
  onExpandedChange: vi.fn(),
  onNewChat: vi.fn(),
  onConversationOpen: vi.fn(),
  onConversationDeleted: vi.fn(),
  onData: vi.fn(),
  onReports: vi.fn(),
  onMemory: vi.fn(),
  onModels: vi.fn(),
  onTools: vi.fn(),
  onSettings: vi.fn(),
  onOrganizationAdministration: vi.fn(),
  onLogout: vi.fn(),
};

function renderRail({ expanded = false }: { expanded?: boolean } = {}) {
  return render(
    <TooltipProvider>
      <WorkspaceRail
        {...callbacks}
        activeStage="welcome"
        activeConversationId={null}
        expanded={expanded}
        surface="chat"
        user={{
          id: "user-1",
          organization_id: "org-1",
          email: "admin@axiom.local",
          display_name: "AXIOM Admin",
          status: "active",
          org_role: "org_admin",
        }}
      />
    </TooltipProvider>,
  );
}

describe("WorkspaceRail", () => {
  beforeEach(() => {
    intelligenceApi.listConversationsPage.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total_items: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens workspace navigation from the collapsed desktop rail", async () => {
    const actor = userEvent.setup();
    renderRail();

    await actor.click(
      screen.getByRole("button", { name: "Open workspace navigation" }),
    );

    expect(callbacks.onExpandedChange).toHaveBeenCalledWith(true);
  });

  it("closes workspace navigation from the expanded pane", async () => {
    const actor = userEvent.setup();
    renderRail({ expanded: true });

    await actor.click(
      screen.getByRole("button", { name: "Close workspace navigation" }),
    );

    expect(callbacks.onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("keeps only primary destinations in workspace navigation", () => {
    renderRail({ expanded: true });

    const navigation = screen.getByRole("navigation", { name: "Workspace" });
    expect(within(navigation).getByRole("button", { name: "New chat" })).toBeTruthy();
    expect(within(navigation).getByRole("button", { name: "Data" })).toBeTruthy();
    expect(within(navigation).getByRole("button", { name: "Report" })).toBeTruthy();
    expect(within(navigation).getByRole("button", { name: "More" })).toBeTruthy();
    expect(within(navigation).queryByRole("button", { name: "Models" })).toBeNull();
    expect(within(navigation).queryByRole("button", { name: "Memory settings" })).toBeNull();
    expect(within(navigation).queryByRole("button", { name: "Tools" })).toBeNull();
    expect(within(navigation).queryByRole("button", { name: "Organization" })).toBeNull();
  });

  it("opens secondary destinations from More", async () => {
    const actor = userEvent.setup();
    renderRail({ expanded: true });

    await actor.click(screen.getByRole("button", { name: "More" }));

    expect(await screen.findByRole("menuitem", { name: "Memory" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Tools" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Organization" })).toBeTruthy();
    await actor.click(screen.getByRole("menuitem", { name: "Models" }));
    expect(callbacks.onModels).toHaveBeenCalledOnce();
  });

  it("collapses recent work and keeps conversation actions in its overflow menu", async () => {
    const actor = userEvent.setup();
    intelligenceApi.listConversationsPage.mockResolvedValue({
      items: [
        {
          conversation_id: "chat-1",
          title: "Research summary",
          status: "active",
          updated_at: "2026-08-24T09:00:00Z",
          metadata: {},
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total_items: 1,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    });
    renderRail({ expanded: true });

    const conversation = await screen.findByRole("button", {
      name: "Research summary",
    });
    expect(conversation.getAttribute("title")).toBe("Research summary");
    expect(
      screen.queryByRole("button", { name: "Pin conversation Research summary" }),
    ).toBeNull();

    await actor.click(
      screen.getByRole("button", { name: "Open conversation actions for Research summary" }),
    );
    expect(await screen.findByRole("menuitem", { name: "Pin chat" })).toBeTruthy();
    await actor.keyboard("{Escape}");

    await actor.click(screen.getByRole("button", { name: "Collapse recent work" }));
    expect(screen.queryByRole("button", { name: "Research summary" })).toBeNull();
    await actor.click(screen.getByRole("button", { name: "Expand recent work" }));
    expect(await screen.findByRole("button", { name: "Research summary" })).toBeTruthy();
  });

  it("keeps the Recent work toggle available when the conversation vault is empty", async () => {
    renderRail({ expanded: true });

    expect(
      await screen.findByRole("button", { name: "Collapse recent work" }),
    ).toBeTruthy();
    expect(await screen.findByText("No recent work yet")).toBeTruthy();
  });

});
