import { describe, expect, it } from "vitest";
import { getRouteWorkspaceScope } from "./scope";

describe("getRouteWorkspaceScope", () => {
  it("shows workspace context only for workspace-scoped routes", () => {
    expect(
      getRouteWorkspaceScope({
        surface: "data",
        page: "ingestion",
        sessionId: null,
        connector: null,
        profileId: null,
      }).showWorkspace,
    ).toBe(true);
    expect(
      getRouteWorkspaceScope({ surface: "memory", sessionId: null }).showWorkspace,
    ).toBe(true);
    expect(
      getRouteWorkspaceScope({
        surface: "organization",
        tab: "models",
        sessionId: null,
      }),
    ).toEqual({ showWorkspace: false, workspaceId: null });
    expect(
      getRouteWorkspaceScope({
        surface: "data",
        page: "dashboard",
        sessionId: null,
      }),
    ).toEqual({ showWorkspace: false, workspaceId: null });
  });
});
