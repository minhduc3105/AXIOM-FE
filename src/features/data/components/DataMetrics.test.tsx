import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataMetrics } from "./DataMetrics";

function renderMetrics(
  overrides: Partial<React.ComponentProps<typeof DataMetrics>> = {},
) {
  const props: React.ComponentProps<typeof DataMetrics> = {
    loading: false,
    disabled: false,
    activeFilter: "all",
    total: 12,
    ready: 7,
    processing: 3,
    failed: 2,
    totalSize: "18.5 MB stored",
    onFilterChange: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<DataMetrics {...props} />) };
}

describe("DataMetrics", () => {
  afterEach(cleanup);

  it("renders consistent counts and explanations for all health states", () => {
    renderMetrics();

    expect(screen.getByRole("button", { name: /all files: 12/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /ready: 7/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /processing: 3/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /failed: 2/i })).toBeTruthy();
    expect(screen.getByText(/18.5 MB stored across this workspace/i)).toBeTruthy();
    expect(screen.getByText("Needs review or retry")).toBeTruthy();
  });

  it("exposes the selected metric structurally and filters from the keyboard", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    renderMetrics({ activeFilter: "failed", onFilterChange });

    expect(
      screen
        .getByRole("button", { name: /failed: 2/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    const ready = screen.getByRole("button", { name: /ready: 7/i });
    ready.focus();
    await user.keyboard("{Enter}");
    expect(onFilterChange).toHaveBeenCalledWith("success");
  });

  it("disables filters while no workspace inventory is available", () => {
    renderMetrics({ disabled: true });

    expect(
      (screen.getByRole("button", {
        name: /all files: 12/i,
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /failed: 2/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
