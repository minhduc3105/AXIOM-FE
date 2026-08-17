import { describe, expect, it, vi } from "vitest";
import { getTool, getToolsErrorKind } from "./toolsApi";

describe("Methods-Hub error classification", () => {
  it("identifies a missing detail as a tool-not-found error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "Tool not found" }), { status: 404 })));

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
