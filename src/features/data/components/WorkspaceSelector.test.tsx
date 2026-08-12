import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";
import { WorkspaceSelector } from "./WorkspaceSelector";

const workspaces: AssignedWorkspace[] = [
  {
    id: "default",
    organization_id: "org-1",
    name: "Default Workspace",
    slug: "default",
    description: null,
    status: "active",
    is_default: true,
    role: "workspace_admin",
  },
  {
    id: "research",
    organization_id: "org-1",
    name: "Research",
    slug: "research",
    description: null,
    status: "active",
    is_default: false,
    role: "viewer",
  },
];

describe("WorkspaceSelector", () => {
  it("opens assigned workspaces and selects another workspace", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceSelector
        workspaces={workspaces}
        selected={workspaces[0]}
        loading={false}
        onSelect={onSelect}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /current workspace/i }),
    );
    await user.click(await screen.findByRole("menuitem", { name: /research/i }));

    expect(onSelect).toHaveBeenCalledWith("research");
  });
});
