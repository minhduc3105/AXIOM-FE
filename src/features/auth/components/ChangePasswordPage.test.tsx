import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordPage } from "./ChangePasswordPage";

const authState = vi.hoisted(() => ({
  changePassword: vi.fn(),
  user: {
    id: "user-1",
    organization_id: "org-1",
    email: "admin@example.com",
    display_name: "Admin User",
    status: "active" as const,
    org_role: "org_admin" as const,
  },
}));

vi.mock("@/features/auth/model/AuthProvider", () => ({ useAuth: () => authState }));

describe("ChangePasswordPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("rejects a mismatched password confirmation without submitting", async () => {
    const actor = userEvent.setup();
    render(<ChangePasswordPage onBack={vi.fn()} />);

    await actor.type(screen.getByLabelText("Current password"), "current-password");
    await actor.type(screen.getByLabelText("New password"), "new-password");
    await actor.type(screen.getByLabelText("Confirm new password"), "different-password");
    await actor.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    expect(authState.changePassword).not.toHaveBeenCalled();
  });

  it("updates the password and clears the sensitive values", async () => {
    const actor = userEvent.setup();
    authState.changePassword.mockResolvedValue(undefined);
    render(<ChangePasswordPage onBack={vi.fn()} />);

    await actor.type(screen.getByLabelText("Current password"), "current-password");
    await actor.type(screen.getByLabelText("New password"), "new-password");
    await actor.type(screen.getByLabelText("Confirm new password"), "new-password");
    await actor.click(screen.getByRole("button", { name: "Update password" }));

    await waitFor(() => {
      expect(authState.changePassword).toHaveBeenCalledWith("current-password", "new-password");
    });
    expect(screen.getByText("Password updated.")).toBeTruthy();
    expect((screen.getByLabelText("Current password") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("New password") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Confirm new password") as HTMLInputElement).value).toBe("");
  });
});
