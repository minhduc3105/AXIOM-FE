import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";

const authState = vi.hoisted(() => ({
  user: {
    id: "user-1",
    organization_id: "org-1",
    email: "admin@example.com",
    display_name: "Admin User",
    status: "active" as const,
    org_role: "org_admin" as const,
  },
}));

const themeState = vi.hoisted(() => ({
  theme: "light" as const,
  resolvedTheme: "light" as const,
  setTheme: vi.fn(),
}));

vi.mock("@/features/auth/model/AuthProvider", () => ({ useAuth: () => authState }));
vi.mock("@/app/ThemeProvider", () => ({ useTheme: () => themeState }));

describe("SettingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens the dedicated password page without rendering password fields inline", async () => {
    const actor = userEvent.setup();
    const onChangePassword = vi.fn();
    render(<SettingsPage onChangePassword={onChangePassword} />);

    expect(screen.queryByLabelText("Current password")).toBeNull();
    await actor.click(screen.getByRole("button", { name: "Change password" }));
    expect(onChangePassword).toHaveBeenCalledOnce();
  });
});
