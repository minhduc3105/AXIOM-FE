import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillDetailPage } from "./SkillDetailPage";
import type { SkillDetail, UserSkillSummary } from "./model/types";

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  downloadSkillArchive: vi.fn(),
  isSkillEnabled: vi.fn(),
  isSkillUpdating: vi.fn(),
  getSkillUpdateError: vi.fn(),
  setSkillEnabled: vi.fn(),
  retrySkillUpdate: vi.fn(),
}));

const summary: UserSkillSummary = {
  id: "research-vi",
  name: "research-assistant",
  language: "vi",
  enabled: true,
  user_enabled: true,
  version: "2.0.0",
  path: "skills/tenants/workspace-1/research-vi/versions/2.0.0/archive.zip",
  entry: "SKILL.md",
  description: "Tóm tắt nguồn và kết quả nghiên cứu.",
  metadata: {},
};

const detail: SkillDetail = {
  ...summary,
  body: "# Setup\n\nUse this skill to summarize sources.",
  files: ["SKILL.md", "scripts/summarize.py"],
};

vi.mock("./model/useSkillDetail", () => ({
  useSkillDetail: () => mocks.detail(),
}));

vi.mock("./model/SkillsProvider", () => ({
  useSkillsState: () => ({
    isSkillEnabled: mocks.isSkillEnabled,
    isSkillUpdating: mocks.isSkillUpdating,
    getSkillUpdateError: mocks.getSkillUpdateError,
    setSkillEnabled: mocks.setSkillEnabled,
    retrySkillUpdate: mocks.retrySkillUpdate,
  }),
}));

vi.mock("./api/skillRegistryApi", () => ({
  downloadSkillArchive: mocks.downloadSkillArchive,
  getSkillRegistryErrorKind: () => "request_failed",
}));

function renderDetail(
  overrides: Partial<ReturnType<typeof mocks.detail>> = {},
) {
  mocks.detail.mockReturnValue({
    summary,
    detail,
    requiresEnable: false,
    loading: false,
    error: null,
    errorKind: null,
    refresh: vi.fn(),
    ...overrides,
  });
  render(
    <SkillDetailPage
      skillId={summary.id}
      workspaceId="workspace-1"
      onBack={vi.fn()}
    />,
  );
}

describe("SkillDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders markdown, metadata, files, and downloads the immutable archive", async () => {
    mocks.isSkillEnabled.mockImplementation(
      (_id: string, apiEnabled: boolean) => apiEnabled,
    );
    mocks.isSkillUpdating.mockReturnValue(false);
    mocks.getSkillUpdateError.mockReturnValue(null);
    mocks.downloadSkillArchive.mockResolvedValue({
      blob: new Blob(["zip-bytes"], { type: "application/zip" }),
      fileName: "research-vi-2.0.0.zip",
      sha256: "a".repeat(64),
    });
    const createObjectUrl = vi.fn(() => "blob:skill-archive");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderDetail();

    expect(
      screen.getByRole("heading", { name: "Research Assistant" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Setup" })).toBeTruthy();
    expect(screen.getByText("scripts/summarize.py")).toBeTruthy();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Download skill ZIP" }));
    await waitFor(() => {
      expect(mocks.downloadSkillArchive).toHaveBeenCalledWith(
        "research-vi",
        "workspace-1",
        expect.any(AbortSignal),
      );
      expect(createObjectUrl).toHaveBeenCalledOnce();
    });
  });

  it("shows metadata and an enable-first recovery state for disabled skills", async () => {
    const refresh = vi.fn();
    mocks.detail.mockReturnValue({
      summary: { ...summary, user_enabled: false },
      detail: null,
      requiresEnable: true,
      loading: false,
      error: null,
      errorKind: null,
      refresh,
    });
    mocks.isSkillEnabled.mockReturnValue(false);
    mocks.isSkillUpdating.mockReturnValue(false);
    mocks.getSkillUpdateError.mockReturnValue(null);
    mocks.setSkillEnabled.mockResolvedValue(true);

    render(
      <SkillDetailPage
        skillId={summary.id}
        workspaceId="workspace-1"
        onBack={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Enable this skill to inspect its bundle"),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Setup" })).toBeNull();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Enable skill" }));
    await waitFor(() => {
      expect(mocks.setSkillEnabled).toHaveBeenCalledWith(
        "research-vi",
        "workspace-1",
        true,
      );
      expect(refresh).toHaveBeenCalledOnce();
    });
  });
});
