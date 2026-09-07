import { describe, expect, it, vi } from "vitest";
import { getTool, getToolsErrorKind } from "./toolsApi";

describe("Methods-Hub error classification", () => {
  it("identifies a missing detail as a tool-not-found error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "Tool not found" }), {
            status: 404,
          }),
      ),
    );

    try {
      await getTool("missing_tool", new AbortController().signal);
      throw new Error("Expected getTool to reject");
    } catch (error) {
      expect(getToolsErrorKind(error)).toBe("tool_not_found");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

it("overlays organization registrations on the full catalog", async () => {
  const { listTools } = await import("./toolsApi");
  const fetchMock = vi.fn(async (url: string) =>
    url.includes("tool-subscriptions")
      ? Response.json({ organization_id: "org", tool_names: ["first"] })
      : Response.json({
          tools: [
            { name: "first", enabled: false },
            { name: "second", enabled: true },
          ],
          count: 2,
        }),
  );
  vi.stubGlobal("fetch", fetchMock);
  try {
    const catalog = await listTools({}, new AbortController().signal);
    expect(
      catalog.tools.map(({ name, enabled }) => ({ name, enabled })),
    ).toEqual([
      { name: "first", enabled: true },
      { name: "second", enabled: false },
    ]);
  } finally {
    vi.unstubAllGlobals();
  }
});

it("bulk updates only the named tools instead of changing the MethodHub catalog", async () => {
  const { updateAllToolsEnabled } = await import("./toolsApi");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ organization_id: "org", tool_names: ["second"] }),
    ),
  );
  try {
    await updateAllToolsEnabled(false, ["first"]);
    expect(fetch).toHaveBeenCalledWith(
      "/authz-service/api/v1/authz/me/tool-subscriptions",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ tool_names: ["first"], enabled: false }),
      }),
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
