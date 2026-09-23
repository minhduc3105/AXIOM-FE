import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getConsumerModelProfiles,
  updateConsumerModelProfiles,
} from "./consumerProfileApi";

const adminContext = {
  userId: "user-1",
  organizationId: "org-1",
  orgRole: "org_admin" as const,
};

describe("consumerProfileApi", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the organization profile endpoint with the v2 identity headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      organization_id: "org-1",
      revision: 3,
      profiles: [],
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getConsumerModelProfiles(adminContext)).resolves.toMatchObject({
      organization_id: "org-1",
      revision: 3,
      profiles: [],
    });
    const call = fetchMock.mock.calls[0] ?? [];
    expect(call[0]).toBe(
      "/model-service/api/v2/consumer-model-profiles",
    );
    const headers = call[1] ? (call[1].headers as Headers) : new Headers();
    expect(headers.get("X-Org-ID")).toBe("org-1");
  });

  it("sends all profile changes in one atomic batch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      organization_id: "org-1",
      revision: 4,
      changed: true,
      changed_keys: ["genreport:llm"],
      profiles: [],
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateConsumerModelProfiles(adminContext, {
      expected_revision: 3,
      changes: [{
        consumer_id: "genreport",
        role: "llm",
        provider_id: "opencode",
        model_id: "deepseek-v4-flash-free",
      }],
    })).resolves.toMatchObject({
      changed: true,
      changed_keys: ["genreport:llm"],
    });

    const call = fetchMock.mock.calls[0] ?? [];
    expect(call[0]).toBe(
      "/model-service/api/v2/consumer-model-profiles",
    );
    expect(call[1]).toEqual(expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({
        expected_revision: 3,
        changes: [{
          consumer_id: "genreport",
          role: "llm",
          provider_id: "opencode",
          model_id: "deepseek-v4-flash-free",
        }],
      }),
    }));
  });
});
