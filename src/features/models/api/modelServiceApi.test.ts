import { afterEach, describe, expect, it, vi } from "vitest";
import { listProviders } from "./modelServiceApi";

describe("modelServiceApi", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the Model Service v2 registry endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listProviders({ userId: "user-1", organizationId: "org-1", orgRole: "org_admin" })).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/model-service/api/v2/providers");
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("X-Org-ID")).toBe("org-1");
  });
});
