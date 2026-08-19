import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";
import { DataDashboardHeader } from "./DataDashboardHeader";

const workspace: AssignedWorkspace = {
  id: "workspace-1",
  organization_id: "org-1",
  name: "Evidence operations",
  slug: "evidence-operations",
  description: null,
  status: "active",
  is_default: true,
  role: "editor",
};

function renderHeader(
  overrides: Partial<React.ComponentProps<typeof DataDashboardHeader>> = {},
) {
  const props: React.ComponentProps<typeof DataDashboardHeader> = {
    selectedWorkspace: workspace,
    workspaceLoading: false,
    dataLoading: false,
    refreshing: false,
    onRefresh: vi.fn(),
    onCreateIngestion: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(
      <TooltipProvider>
        <DataDashboardHeader {...props} />
      </TooltipProvider>,
    ),
  };
}

describe("DataDashboardHeader", () => {
  afterEach(cleanup);

  it("presents a compact operational header with read-only workspace context", () => {
    const { container } = renderHeader();

    expect(
      screen.getByRole("heading", { name: "Data management" }),
    ).toBeTruthy();
    expect(screen.getByText(workspace.name)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload data" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /workspace/i })).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("disables workspace-scoped actions when no workspace is selected", () => {
    renderHeader({ selectedWorkspace: null });

    expect(screen.getByText("No workspace selected")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Upload data" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Refresh" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("communicates refresh progress and blocks duplicate refreshes", () => {
    renderHeader({ dataLoading: true, refreshing: true });

    const refresh = screen.getByRole("button", { name: "Refreshing…" });
    expect((refresh as HTMLButtonElement).disabled).toBe(true);
    expect(refresh.getAttribute("aria-busy")).toBe("true");
  });
});
