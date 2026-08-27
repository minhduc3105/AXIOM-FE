import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureAuthFetch,
  type AuthRefreshResult,
} from "@/features/auth/model/authFetch";
import { listAutoReports } from "./reportsApi";

describe("Reports API", () => {
  beforeEach(() => {
    configureAuthFetch({
      getAccessToken: () => "token",
      refreshAccessToken: async (): Promise<AuthRefreshResult> => "refreshed",
      onUnauthorized: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    configureAuthFetch({
      getAccessToken: () => null,
      refreshAccessToken: async (): Promise<AuthRefreshResult> => "expired",
      onUnauthorized: vi.fn(),
    });
  });

  it("requests five reports for the requested history page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        items: [],
        pagination: {
          page: 2,
          limit: 5,
          total_items: 6,
          total_pages: 2,
          has_next: false,
          has_previous: true,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listAutoReports("workspace-1", 2);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/intelligence-service/api/v1/workspaces/workspace-1/auto-reports?page=2&limit=5",
    );
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Authorization"),
    ).toBe("Bearer token");
  });
});
