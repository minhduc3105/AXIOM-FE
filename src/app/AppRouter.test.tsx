import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppRouter } from "./AppRouter";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  navigatePath: vi.fn(),
  register: vi.fn(),
  useAuth: vi.fn(),
  useBrowserRoute: vi.fn(),
}));

vi.mock("@/features/auth/model/AuthProvider", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("./routing/useBrowserRoute", () => ({
  useBrowserRoute: mocks.useBrowserRoute,
}));

const unauthenticatedAuth = {
  status: "unauthenticated" as const,
  user: null,
  accessToken: null,
  restoreError: null,
  sessionEndReason: null,
  login: vi.fn(),
  register: mocks.register,
  createOrganization: vi.fn(),
  switchOrganization: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn(),
  retryRestore: vi.fn(),
};

describe("AppRouter registration route", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.useAuth.mockReturnValue(unauthenticatedAuth);
    mocks.useBrowserRoute.mockReturnValue({
      route: {
        kind: "auth",
        page: "register",
        returnTo: "/data",
        reason: null,
      },
      path: "/register?returnTo=%2Fdata",
      navigate: mocks.navigate,
      navigatePath: mocks.navigatePath,
    });
  });

  afterEach(cleanup);

  it("renders registration and preserves returnTo when navigating to sign in", async () => {
    const actor = userEvent.setup();
    render(<AppRouter renderApp={() => null} />);

    expect(
      screen.getByRole("heading", { name: "Set up your organization" }),
    ).toBeTruthy();
    const signInLink = screen.getByRole("link", { name: "Sign in instead" });
    expect(signInLink.getAttribute("href")).toBe("/login?returnTo=%2Fdata");

    await actor.click(signInLink);
    expect(mocks.navigate).toHaveBeenCalledWith({
      kind: "auth",
      page: "login",
      returnTo: "/data",
      reason: null,
    });
  });
});

describe("AppRouter legacy ingestion route", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.useAuth.mockReturnValue({
      ...unauthenticatedAuth,
      status: "authenticated",
      user: { id: "user-1" },
    });
    mocks.useBrowserRoute.mockReturnValue({
      route: {
        kind: "app",
        route: {
          surface: "data",
          page: "dashboard",
          sourceId: null,
          sessionId: null,
        },
      },
      path: "/data/ingestion",
      navigate: mocks.navigate,
      navigatePath: mocks.navigatePath,
    });
  });

  afterEach(cleanup);

  it("replaces the obsolete ingestion location with /data", () => {
    render(<AppRouter renderApp={() => null} />);

    expect(mocks.navigate).toHaveBeenCalledWith(
      {
        kind: "app",
        route: {
          surface: "data",
          page: "dashboard",
          sourceId: null,
          sessionId: null,
        },
      },
      { replace: true },
    );
  });
});

describe("AppRouter authenticated fallback", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.useAuth.mockReturnValue({
      ...unauthenticatedAuth,
      status: "authenticated",
      user: { id: "user-1" },
    });
    mocks.useBrowserRoute.mockReturnValue({
      route: {
        kind: "auth",
        page: "login",
        returnTo: "/",
        reason: null,
      },
      path: "/login",
      navigate: mocks.navigate,
      navigatePath: mocks.navigatePath,
    });
  });

  afterEach(cleanup);

  it("replaces an authenticated auth route with the blank chat composer", () => {
    render(<AppRouter renderApp={() => null} />);

    expect(mocks.navigate).toHaveBeenCalledWith(
      {
        kind: "app",
        route: { surface: "chat", page: "compose", sessionId: null },
      },
      { replace: true },
    );
  });
});
