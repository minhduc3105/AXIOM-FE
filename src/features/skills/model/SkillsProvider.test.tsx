import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SkillsProvider, useSkillsState } from "./SkillsProvider";

const mocks = vi.hoisted(() => ({
  updateSkillEnabled: vi.fn(),
}));

vi.mock("../api/skillRegistryApi", () => ({
  updateSkillEnabled: mocks.updateSkillEnabled,
}));

const catalogSkill = {
  id: "docx-en",
  name: "docx",
  language: "en",
  enabled: true,
  user_enabled: false,
  version: "1.0.0",
  path: "skills/global/docx-en/versions/1.0.0/archive.zip",
  entry: "SKILL.md",
  description: "Read and write documents.",
  metadata: {},
};

function Harness() {
  const {
    isSkillEnabled,
    isSkillUpdating,
    getSkillUpdateError,
    setSkillEnabled,
    retrySkillUpdate,
    reconcileCatalogSkills,
  } = useSkillsState();
  const enabled = isSkillEnabled("docx-en", false);
  const error = getSkillUpdateError("docx-en");

  return (
    <div>
      <output data-testid="enabled">{String(enabled)}</output>
      <output data-testid="updating">
        {String(isSkillUpdating("docx-en"))}
      </output>
      {error ? <output data-testid="error">{error}</output> : null}
      <button
        type="button"
        onClick={() => void setSkillEnabled("docx-en", "workspace-1", true)}
      >
        Enable
      </button>
      <button
        type="button"
        onClick={() => void retrySkillUpdate("docx-en", "workspace-1")}
      >
        Retry
      </button>
      <button type="button" onClick={() => reconcileCatalogSkills([])}>
        Reconcile empty
      </button>
      <button
        type="button"
        onClick={() => reconcileCatalogSkills([catalogSkill])}
      >
        Reconcile catalog
      </button>
    </div>
  );
}

function renderHarness(children: ReactNode = <Harness />) {
  return render(<SkillsProvider>{children}</SkillsProvider>);
}

describe("SkillsProvider", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("applies an optimistic preference and reconciles the server response", async () => {
    const actor = userEvent.setup();
    let resolveUpdate:
      | ((value: {
          skill_id: string;
          enabled: boolean;
          changed: boolean;
        }) => void)
      | undefined;
    mocks.updateSkillEnabled.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    renderHarness();

    await actor.click(screen.getByRole("button", { name: "Enable" }));
    expect(screen.getByTestId("enabled").textContent).toBe("true");
    expect(screen.getByTestId("updating").textContent).toBe("true");

    resolveUpdate?.({ skill_id: "docx-en", enabled: true, changed: true });
    await waitFor(() => {
      expect(screen.getByTestId("updating").textContent).toBe("false");
    });
    expect(mocks.updateSkillEnabled).toHaveBeenCalledOnce();
  });

  it("rolls back a failed update and retries the attempted value", async () => {
    const actor = userEvent.setup();
    mocks.updateSkillEnabled
      .mockRejectedValueOnce(new Error("workspace access denied"))
      .mockResolvedValueOnce({
        skill_id: "docx-en",
        enabled: true,
        changed: true,
      });
    renderHarness();

    await actor.click(screen.getByRole("button", { name: "Enable" }));
    await waitFor(() => {
      expect(screen.getByTestId("enabled").textContent).toBe("false");
      expect(screen.getByTestId("error").textContent).toContain(
        "workspace access denied",
      );
    });

    await actor.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(screen.getByTestId("enabled").textContent).toBe("true");
    });
    expect(mocks.updateSkillEnabled).toHaveBeenNthCalledWith(
      2,
      "docx-en",
      "workspace-1",
      true,
    );
  });

  it("removes overrides for skills outside the current catalog", async () => {
    const actor = userEvent.setup();
    mocks.updateSkillEnabled.mockResolvedValue({
      skill_id: "docx-en",
      enabled: true,
      changed: true,
    });
    renderHarness();

    await actor.click(screen.getByRole("button", { name: "Enable" }));
    await waitFor(() => {
      expect(screen.getByTestId("enabled").textContent).toBe("true");
    });
    await actor.click(screen.getByRole("button", { name: "Reconcile empty" }));
    expect(screen.getByTestId("enabled").textContent).toBe("false");
  });

  it("keeps an override while its update is in flight", async () => {
    const actor = userEvent.setup();
    let resolveUpdate:
      | ((value: {
          skill_id: string;
          enabled: boolean;
          changed: boolean;
        }) => void)
      | undefined;
    mocks.updateSkillEnabled.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    renderHarness();

    await actor.click(screen.getByRole("button", { name: "Enable" }));
    await actor.click(screen.getByRole("button", { name: "Reconcile empty" }));
    expect(screen.getByTestId("enabled").textContent).toBe("true");

    resolveUpdate?.({ skill_id: "docx-en", enabled: true, changed: true });
    await waitFor(() => {
      expect(screen.getByTestId("updating").textContent).toBe("false");
    });
  });
});
