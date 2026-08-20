import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DataMetrics } from "./DataMetrics";

function renderMetrics(
  overrides: Partial<React.ComponentProps<typeof DataMetrics>> = {},
) {
  const props: React.ComponentProps<typeof DataMetrics> = {
    loading: false,
    total: 12,
    ready: 7,
    processing: 3,
    failed: 2,
    totalSize: "18.5 MB stored",
    ...overrides,
  };
  return { props, ...render(<DataMetrics {...props} />) };
}

describe("DataMetrics", () => {
  afterEach(cleanup);

  it("renders consistent counts and explanations for all health states", () => {
    renderMetrics();

    expect(screen.getByLabelText(/all files: 12/i)).toBeTruthy();
    expect(screen.getByLabelText(/ready: 7/i)).toBeTruthy();
    expect(screen.getByLabelText(/processing: 3/i)).toBeTruthy();
    expect(screen.getByLabelText(/failed: 2/i)).toBeTruthy();
    expect(screen.getByText(/18.5 MB stored across this workspace/i)).toBeTruthy();
    expect(screen.getByText("Needs review or retry")).toBeTruthy();
  });

  it("renders health metrics as non-interactive summaries", () => {
    renderMetrics();

    expect(screen.queryByRole("button", { name: /all files/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /ready/i })).toBeNull();
  });
});
