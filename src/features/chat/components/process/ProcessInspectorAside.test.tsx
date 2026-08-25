import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProcessInspectorAside } from "./ProcessInspectorAside";

describe("ProcessInspectorAside", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("exposes Logs & Files as the close action", async () => {
    const actor = userEvent.setup();
    const onClose = vi.fn();
    render(<ProcessInspectorAside items={[]} onClose={onClose} />);

    await actor.click(screen.getByRole("button", { name: "Close Logs & Files" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("uses line tabs without a pill container", () => {
    render(<ProcessInspectorAside items={[]} />);

    const tabList = screen.getByRole("tablist");
    expect(tabList.getAttribute("data-variant")).toBe("line");
  });
});
