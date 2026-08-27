import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceRail } from "./WorkspaceRail";

vi.mock("@/shared/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

const intelligenceApi = vi.hoisted(() => ({
  listConversationsPage: vi.fn(),
  updateConversation: vi.fn(),
}));

vi.mock("@/shared/lib/intelligence-api", () => ({
  deleteConversation: vi.fn(),
  listConversationsPage: intelligenceApi.listConversationsPage,
  updateConversation: intelligenceApi.updateConversation,
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
  onSkills: vi.fn(),
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
    vi.useRealTimers();
  });

  it("opens workspace navigation from the collapsed desktop rail", async () => {
    const actor = userEvent.setup();
    renderRail();

    const toggle = screen.getByRole("button", {
      name: "Open workspace navigation",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await actor.click(toggle);

    expect(callbacks.onExpandedChange).toHaveBeenCalledWith(true);
  });

  it("closes workspace navigation from the expanded pane", async () => {
    const actor = userEvent.setup();
    renderRail({ expanded: true });

    const toggle = screen.getByRole("button", {
      name: "Close workspace navigation",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await actor.click(toggle);

    expect(callbacks.onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("shows a tooltip for collapsed navigation icons", async () => {
    const actor = userEvent.setup();
    renderRail();

    const dataButton = screen.getByRole("button", { name: "Data" });
    await actor.hover(dataButton);
    await new Promise((resolve) => setTimeout(resolve, 700));
    console.log("TRIGGER", dataButton.outerHTML);
    console.log("BODY", document.body.innerHTML.slice(-1000));

    expect(await screen.findByRole("tooltip", { name: "Data" })).toBeTruthy();
  });

  it("keeps only primary destinations in workspace navigation", () => {
    renderRail({ expanded: true });

    const navigation = screen.getByRole("navigation", { name: "Workspace" });
    expect(
      within(navigation).getByRole("button", { name: "New chat" }),
    ).toBeTruthy();
    expect(
      within(navigation).getByRole("button", { name: "Data" }),
    ).toBeTruthy();
    expect(
      within(navigation).getByRole("button", { name: "Report" }),
    ).toBeTruthy();
    expect(
      within(navigation).getByRole("button", { name: "More" }),
    ).toBeTruthy();
    expect(
      within(navigation).queryByRole("button", { name: "Models" }),
    ).toBeNull();
    expect(
      within(navigation).queryByRole("button", { name: "Memory settings" }),
    ).toBeNull();
    expect(
      within(navigation).queryByRole("button", { name: "Tools" }),
    ).toBeNull();
    expect(
      within(navigation).queryByRole("button", { name: "Skills" }),
    ).toBeNull();
    expect(
      within(navigation).queryByRole("button", { name: "Organization" }),
    ).toBeNull();
  });

  it("keeps More open after opening a secondary destination", async () => {
    const actor = userEvent.setup({ skipHover: true });
    renderRail({ expanded: true });

    await actor.click(screen.getByRole("button", { name: "More" }));

    expect(
      await screen.findByRole("menuitem", { name: "Memory" }),
    ).toBeTruthy();
    await actor.click(await screen.findByRole("menuitem", { name: "Models" }));
    expect(callbacks.onModels).toHaveBeenCalledOnce();

    await actor.click(await screen.findByRole("menuitem", { name: "Skills" }));
    expect(callbacks.onSkills).toHaveBeenCalledOnce();
  });

  it("opens More only after a deliberate click", async () => {
    const actor = userEvent.setup({ skipHover: true });
    renderRail({ expanded: true });

    const more = screen.getByRole("button", { name: "More" });
    fireEvent.pointerEnter(more);

    expect(screen.queryByRole("menuitem", { name: "Memory" })).toBeNull();
    await actor.click(more);
    expect(screen.getByRole("menuitem", { name: "Memory" })).toBeTruthy();
    expect(
      document.querySelector('[role="presentation"][data-base-ui-inert]'),
    ).toBeNull();
    await actor.click(more);
    expect(more.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps Pin directly on the conversation row and out of its action menu", async () => {
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
      screen.getByRole("button", { name: "Pin conversation Research summary" }),
    ).toBeTruthy();

    await actor.click(
      screen.getByRole("button", {
        name: "Open conversation actions for Research summary",
      }),
    );
    expect(
      await screen.findByRole("menuitem", { name: "Rename" }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
    expect(
      screen.queryByRole("menuitem", { name: /Pin chat|Unpin chat/ }),
    ).toBeNull();
    await actor.keyboard("{Escape}");

    await actor.click(
      screen.getByRole("button", { name: "Collapse recent work" }),
    );
    expect(
      screen.queryByRole("button", { name: "Research summary" }),
    ).toBeNull();
    await actor.click(
      screen.getByRole("button", { name: "Expand recent work" }),
    );
    expect(
      await screen.findByRole("button", { name: "Research summary" }),
    ).toBeTruthy();
  });

  it("collapses pinned conversations independently from recent work", async () => {
    const actor = userEvent.setup();
    intelligenceApi.listConversationsPage.mockResolvedValue({
      items: [
        {
          conversation_id: "pinned-chat",
          title: "Pinned research",
          status: "active",
          updated_at: "2026-08-24T10:00:00Z",
          metadata: { pinned: true },
        },
        {
          conversation_id: "recent-chat",
          title: "Recent research",
          status: "active",
          updated_at: "2026-08-24T09:00:00Z",
          metadata: {},
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total_items: 2,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    });
    renderRail({ expanded: true });

    const toggle = await screen.findByRole("button", {
      name: "Collapse pinned conversations",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    await actor.click(toggle);
    expect(
      screen.queryByRole("button", { name: "Pinned research" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Recent research" }),
    ).toBeTruthy();

    await actor.click(
      screen.getByRole("button", { name: "Expand pinned conversations" }),
    );
    expect(
      await screen.findByRole("button", { name: "Pinned research" }),
    ).toBeTruthy();
  });

  it("marks pinned rows with a conversation icon", async () => {
    intelligenceApi.listConversationsPage.mockResolvedValue({
      items: [
        {
          conversation_id: "pinned-chat",
          title: "Pinned research",
          status: "active",
          updated_at: "2026-08-24T10:00:00Z",
          metadata: { pinned: true },
        },
        {
          conversation_id: "recent-chat",
          title: "Recent research",
          status: "active",
          updated_at: "2026-08-24T09:00:00Z",
          metadata: {},
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total_items: 2,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    });
    renderRail({ expanded: true });

    const pinned = await screen.findByRole("button", {
      name: "Pinned research",
    });
    const recent = screen.getByRole("button", { name: "Recent research" });

    expect(
      within(pinned).getByRole("img", { name: "Pinned conversation" }),
    ).toBeTruthy();
    expect(
      within(recent).queryByRole("img", { name: "Pinned conversation" }),
    ).toBeNull();
  });

  it("keeps the pin action visible with one loading indicator while a pin change is pending", async () => {
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
    intelligenceApi.updateConversation.mockReturnValue(new Promise(() => {}));
    renderRail({ expanded: true });

    const pinAction = await screen.findByRole("button", {
      name: "Pin conversation Research summary",
    });
    await actor.click(pinAction);

    expect(document.querySelectorAll("svg.animate-spin")).toHaveLength(1);
    expect(pinAction.classList.contains("!w-7")).toBe(true);
    expect(pinAction.classList.contains("opacity-100")).toBe(true);
    expect(pinAction.classList.contains("mr-1")).toBe(true);
  });

  it("keeps the Recent work toggle available when the conversation vault is empty", async () => {
    renderRail({ expanded: true });

    expect(
      await screen.findByRole("button", { name: "Collapse recent work" }),
    ).toBeTruthy();
    expect(await screen.findByText("No recent work yet")).toBeTruthy();
  });

  it("opens the account menu within the available viewport", async () => {
    const actor = userEvent.setup();
    renderRail({ expanded: true });

    await actor.click(
      screen.getByRole("button", { name: "Open user session menu" }),
    );

    expect(await screen.findByText("admin@axiom.local")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeTruthy();
  });
});
