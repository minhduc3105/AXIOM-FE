import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConsumerModelProfilesView } from "../api/consumerProfileContract";
import { useConsumerModelProfiles } from "./useConsumerModelProfiles";

const api = vi.hoisted(() => ({
  getConsumerModelProfiles: vi.fn(),
}));

vi.mock("../api/consumerProfileApi", () => ({
  ConsumerProfileApiError: class ConsumerProfileApiError extends Error {},
  getConsumerModelProfiles: api.getConsumerModelProfiles,
  updateConsumerModelProfiles: vi.fn(),
}));

const context = {
  userId: "user-1",
  organizationId: "org-1",
  orgRole: "org_admin" as const,
};

const profileView: ConsumerModelProfilesView = {
  organization_id: "org-1",
  revision: 1,
  profiles: [],
};

describe("useConsumerModelProfiles", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("preserves drafts on a refresh unless clearing is requested", async () => {
    api.getConsumerModelProfiles.mockResolvedValue(profileView);
    const { result } = renderHook(() => useConsumerModelProfiles(context));

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    act(() => {
      result.current.choose(
        "data-intelligence",
        "llm",
        "openrouter",
        "deepseek/deepseek-v4-flash-free",
      );
    });
    await waitFor(() => expect(result.current.dirty).toBe(true));

    await result.current.refresh();
    expect(result.current.dirty).toBe(true);

    await result.current.refresh({ preserveDraft: false });
    await waitFor(() => expect(result.current.dirty).toBe(false));
  });
});
