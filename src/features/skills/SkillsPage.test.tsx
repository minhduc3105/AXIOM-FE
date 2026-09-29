import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillsPage } from "./SkillsPage";
import type { SkillCatalogViewState, UserSkillSummary } from "./model/types";

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  isSkillEnabled: vi.fn(),
  isSkillUpdating: vi.fn(),
  getSkillUpdateError: vi.fn(),
  setSkillEnabled: vi.fn(),
  setAllSkillsEnabled: vi.fn(),
  shareSkillWithOrganization: vi.fn(),
  authUser: null as { org_role: "org_admin" | "org_member" } | null,
  retrySkillUpdate: vi.fn(),
  reconcileCatalogSkills: vi.fn(),
}));

const skills: UserSkillSummary[] = [
  {
    id: "docx-en",
    name: "document-writer",
    language: "en",
    enabled: true,
    user_enabled: true,
    version: "1.2.0",
    path: "skills/global/docx-en/versions/1.2.0/archive.zip",
    entry: "SKILL.md",
    description: "Create and edit documents.",
    metadata: { axiom_system_bootstrap: true, file_count: 4 },
    organization_shared: false,
    is_owner: false,
  },
  {
    id: "browser-cdp",
    name: "browser-cdp",
    language: "en",
    enabled: true,
    user_enabled: false,
    version: "1.2",
    path: "skills/global/browser_cdp-en/versions/1.2/archive.zip",
    entry: "SKILL.md",
    description: "Connect to a running browser using CDP.",
    metadata: { axiom_system_bootstrap: true },
    organization_shared: false,
    is_owner: false,
  },
  {
    id: "research-vi",
    name: "research-assistant",
    language: "vi",
    enabled: true,
    user_enabled: false,
    version: "2.0.0",
    path: "skills/tenants/workspace-1/research-vi/versions/2.0.0/archive.zip",
    entry: "SKILL.md",
    description: "Summarize sources and findings.",
    metadata: {},
    is_owner: true,
    organization_shared: false,
  },
  {
    id: "data-cleaner",
    name: "data-cleaner",
    language: "en",
    enabled: true,
    user_enabled: true,
    version: "1.0.0",
    path: "skills/global/data-cleaner/versions/1.0.0/archive.zip",
    entry: "SKILL.md",
    description: "Normalize tabular data.",
    metadata: {},
    organization_shared: false,
    is_owner: false,
  },
];

vi.mock("./model/useSkillCatalog", () => ({
  useSkillCatalog: () => mocks.catalog(),
}));

vi.mock("@/features/auth/model/AuthProvider", () => ({
  useAuth: () => ({ user: mocks.authUser }),
}));

vi.mock("./api/skillRegistryApi", () => ({
  getSkillRegistryErrorKind: () => null,
  shareSkillWithOrganization: mocks.shareSkillWithOrganization,
}));

vi.mock("./model/SkillsProvider", () => ({
  useSkillsState: () => ({
    isSkillEnabled: mocks.isSkillEnabled,
    isSkillUpdating: mocks.isSkillUpdating,
    getSkillUpdateError: mocks.getSkillUpdateError,
    setSkillEnabled: mocks.setSkillEnabled,
    setAllSkillsEnabled: mocks.setAllSkillsEnabled,
    retrySkillUpdate: mocks.retrySkillUpdate,
    reconcileCatalogSkills: mocks.reconcileCatalogSkills,
  }),
}));

const initialViewState: SkillCatalogViewState = {
  query: "",
  language: undefined,
  status: "all",
  sort: "name",
  scrollY: 0,
};

function renderPage(onOpenSkill = vi.fn()) {
  const onViewStateChange = vi.fn();
  render(
    <SkillsPage
      workspaceId="workspace-1"
      onOpenSkill={onOpenSkill}
      viewState={initialViewState}
      onViewStateChange={onViewStateChange}
    />,
  );
  return { onOpenSkill, onViewStateChange };
}

describe("SkillsPage", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.authUser = null;
    vi.restoreAllMocks();
  });

  it("separates general and personal skills into tabs", async () => {
    mocks.catalog.mockReturnValue({
      skills,
      loading: false,
      error: null,
      errorKind: null,
      refresh: vi.fn(),
    });
    mocks.isSkillEnabled.mockImplementation(
      (_id: string, apiEnabled: boolean) => apiEnabled,
    );
    mocks.isSkillUpdating.mockReturnValue(false);
    mocks.getSkillUpdateError.mockReturnValue(null);

    renderPage();
    const actor = userEvent.setup();

    const generalTab = screen.getByRole("tab", { name: "General Skills" });
    const yourTab = screen.getByRole("tab", { name: "Your Skills" });
    expect(generalTab.getAttribute("aria-selected")).toBe("true");
    expect(yourTab.getAttribute("aria-selected")).toBe("false");
    const generalPanel = screen.getByRole("tabpanel", {
      name: "General Skills",
    });
    expect(within(generalPanel).getByText("Document Writer")).toBeTruthy();
    within(generalPanel).getByRole("link", {
      name: "Open Browser Cdp",
    });
    expect(within(generalPanel).queryByText("Research Assistant")).toBeNull();
    expect(
      within(generalPanel).getByRole("heading", { name: "Enabled" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Share Research Assistant with organization",
      }),
    ).toBeNull();

    await actor.click(yourTab);
    const yourPanel = screen.getByRole("tabpanel", { name: "Your Skills" });
    expect(within(yourPanel).getByText("Research Assistant")).toBeTruthy();
    expect(within(yourPanel).getByText("Data Cleaner")).toBeTruthy();
    expect(within(yourPanel).queryByText("Document Writer")).toBeNull();
    expect(within(yourPanel).queryByText("Browser Cdp")).toBeNull();
    expect(
      within(yourPanel)
        .getAllByRole("region")
        .map((group) => group.getAttribute("aria-label")),
    ).toEqual(["Enabled skills", "Disabled skills"]);
    expect(
      within(yourPanel).getByRole("heading", { name: "Disabled" }),
    ).toBeTruthy();

    const search = screen.getByRole("textbox", { name: "Search skills" });
    await actor.type(search, "research");
    const filteredYourPanel = screen.getByRole("tabpanel", {
      name: "Your Skills",
    });
    expect(
      within(filteredYourPanel).getByText("Research Assistant"),
    ).toBeTruthy();
    expect(within(filteredYourPanel).queryByText("Data Cleaner")).toBeNull();

    await actor.clear(search);
    await actor.click(generalTab);
    await actor.click(screen.getByRole("button", { name: "Enabled" }));
    const enabledPanel = screen.getByRole("tabpanel", {
      name: "General Skills",
    });
    expect(within(enabledPanel).getByText("Document Writer")).toBeTruthy();
    expect(within(enabledPanel).queryByText("Research Assistant")).toBeNull();
  });

  it("offers bulk enable and disable actions for the current user", async () => {
    const refresh = vi.fn();
    mocks.catalog.mockReturnValue({
      skills,
      loading: false,
      error: null,
      errorKind: null,
      refresh,
    });
    mocks.isSkillEnabled.mockImplementation(
      (_id: string, apiEnabled: boolean) => apiEnabled,
    );
    mocks.isSkillUpdating.mockReturnValue(false);
    mocks.getSkillUpdateError.mockReturnValue(null);
    mocks.setAllSkillsEnabled.mockResolvedValue(true);

    renderPage();
    const actor = userEvent.setup();
    await actor.click(
      screen.getByRole("button", { name: "Disable all active skills" }),
    );
    expect(
      screen.getByRole("heading", { name: "Disable 2 skills?" }),
    ).toBeTruthy();
    await actor.click(screen.getByRole("button", { name: "Disable 2 skills" }));

    await waitFor(() => {
      expect(mocks.setAllSkillsEnabled).toHaveBeenCalledWith(
        ["docx-en", "browser-cdp", "research-vi", "data-cleaner"],
        "workspace-1",
        false,
      );
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("lets organization admins share their skills with the organization", async () => {
    mocks.catalog.mockReturnValue({
      skills,
      loading: false,
      error: null,
      errorKind: null,
      refresh: vi.fn(),
    });
    mocks.authUser = { org_role: "org_admin" };
    mocks.isSkillEnabled.mockImplementation(
      (_id: string, apiEnabled: boolean) => apiEnabled,
    );
    mocks.isSkillUpdating.mockReturnValue(false);
    mocks.getSkillUpdateError.mockReturnValue(null);
    mocks.shareSkillWithOrganization.mockResolvedValue({
      skill_id: "research-vi",
      enabled: true,
      changed: true,
    });
    const refresh = vi.fn();
    mocks.catalog.mockReturnValue({
      skills,
      loading: false,
      error: null,
      errorKind: null,
      refresh,
    });

    renderPage();
    const actor = userEvent.setup();
    await actor.click(screen.getByRole("tab", { name: "Your Skills" }));

    await actor.click(
      screen.getByRole("button", {
        name: "Share Research Assistant with organization",
      }),
    );

    expect(mocks.shareSkillWithOrganization).toHaveBeenCalledWith(
      "research-vi",
      true,
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("opens by immutable id and keeps preference controls independent from navigation", async () => {
    mocks.catalog.mockReturnValue({
      skills,
      loading: false,
      error: null,
      errorKind: null,
      refresh: vi.fn(),
    });
    mocks.isSkillEnabled.mockImplementation(
      (_id: string, apiEnabled: boolean) => apiEnabled,
    );
    mocks.isSkillUpdating.mockReturnValue(false);
    mocks.getSkillUpdateError.mockReturnValue(null);
    mocks.setSkillEnabled.mockResolvedValue(true);
    const onOpenSkill = vi.fn();
    renderPage(onOpenSkill);
    const actor = userEvent.setup();
    await actor.click(screen.getByRole("tab", { name: "Your Skills" }));

    await actor.click(
      screen.getByRole("switch", { name: "Enable Research Assistant" }),
    );
    expect(mocks.setSkillEnabled).toHaveBeenCalledWith(
      "research-vi",
      "workspace-1",
      true,
    );
    expect(onOpenSkill).not.toHaveBeenCalled();

    await actor.click(
      screen.getByRole("link", { name: "Open Research Assistant" }),
    );
    await waitFor(() => {
      expect(onOpenSkill).toHaveBeenCalledWith(
        "research-vi",
        expect.objectContaining({ status: "all" }),
      );
    });
  });
});
