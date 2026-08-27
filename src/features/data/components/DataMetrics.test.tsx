import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DataMetrics } from "./DataMetrics";

describe("DataMetrics", () => {
  it("renders compact workspace-wide file status counters instead of metric cards", () => {
    render(
      <DataMetrics
        loading={false}
        total={8}
        ready={5}
        processing={2}
        failed={1}
      />,
    );

    const counters = screen.getByRole("list", {
      name: "Workspace file status",
    });

    expect(within(counters).getByLabelText("All files: 8")).toBeTruthy();
    expect(within(counters).getByLabelText("Ready files: 5")).toBeTruthy();
    expect(within(counters).getByLabelText("Processing files: 2")).toBeTruthy();
    expect(within(counters).getByLabelText("Failed files: 1")).toBeTruthy();
    expect(screen.queryByRole("article")).toBeNull();
  });
});
