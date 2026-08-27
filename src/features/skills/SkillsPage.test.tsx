import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillsPage } from "./SkillsPage";
import type { SkillCatalogViewState, UserSkillSummary } from "./model/types";

const mocks = vi.hoisted(() => ({
  catalog: vi.fn(),
  isSkillEnabled: vi.fn(),
  isSkillUpdating: vi.fn(),
  getSkillUpdateError: vi.fn(),
  setSkillEnabled: vi.fn(),
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
    metadata: { file_count: 4 },
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
  },
  {
    id: "data-cleaner",
    name: "data-cleaner",
    language: "en",
    enabled: true,
    user_enabled: false,
    version: "1.0.0",
    path: "skills/global/data-cleaner/versions/1.0.0/archive.zip",
    entry: "SKILL.md",
    description: "Normalize tabular data.",
    metadata: {},
  },
];

vi.mock("./model/useSkillCatalog", () => ({
  useSkillCatalog: () => mocks.catalog(),
}));

vi.mock("./model/SkillsProvider", () => ({
  useSkillsState: () => ({
    isSkillEnabled: mocks.isSkillEnabled,
    isSkillUpdating: mocks.isSkillUpdating,
    getSkillUpdateError: mocks.getSkillUpdateError,
    setSkillEnabled: mocks.setSkillEnabled,
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
    vi.restoreAllMocks();
  });

  it("groups visible skills and filters by search and status", async () => {
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

    expect(
      screen.getByRole("heading", { name: "Enabled Skills" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Available Skills" }),
    ).toBeTruthy();
    expect(screen.getByText("Document Writer")).toBeTruthy();
    expect(screen.getByText("Research Assistant")).toBeTruthy();

    const search = screen.getByRole("textbox", { name: "Search skills" });
    await actor.type(search, "research");
    expect(screen.queryByText("Document Writer")).toBeNull();
    expect(screen.getByText("Research Assistant")).toBeTruthy();

    await actor.clear(search);
    await actor.click(screen.getByRole("button", { name: "Enabled" }));
    expect(screen.getByText("Document Writer")).toBeTruthy();
    expect(screen.queryByText("Research Assistant")).toBeNull();
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
