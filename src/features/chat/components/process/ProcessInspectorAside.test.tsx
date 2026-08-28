import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProcessInspectorAside } from "./ProcessInspectorAside";
import type { ProcessInspectorItem } from "./processEvents";

describe("ProcessInspectorAside", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("exposes Logs & Files as the close action", async () => {
    const actor = userEvent.setup();
    const onClose = vi.fn();
    render(<ProcessInspectorAside items={[]} onClose={onClose} />);

    await actor.click(
      screen.getByRole("button", { name: "Close Logs & Files" }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("uses line tabs without a pill container", () => {
    render(<ProcessInspectorAside items={[]} />);

    const tabList = screen.getByRole("tablist");
    expect(tabList.getAttribute("data-variant")).toBe("line");
  });

  it("keeps a step closed when selecting an already expanded step", async () => {
    const actor = userEvent.setup();
    const items = [
      {
        key: "current:first-read",
        event: {
          id: "first-read",
          label: "First read file",
          detail: "Reading the first file",
          status: "done",
          phase: "tool",
        },
      },
      {
        key: "current:second-read",
        event: {
          id: "second-read",
          label: "Second read file",
          detail: "Reading the second file",
          status: "done",
          phase: "tool",
        },
      },
    ] as ProcessInspectorItem[];
    const view = render(
      <ProcessInspectorAside
        items={items}
        activeProcessEventKey="current:second-read"
        onProcessEventSelect={vi.fn()}
      />,
    );

    await actor.click(screen.getByRole("button", { name: /First read file/ }));
    view.rerender(
      <ProcessInspectorAside
        items={items}
        activeProcessEventKey="current:first-read"
        onProcessEventSelect={vi.fn()}
      />,
    );

    await actor.click(screen.getByRole("button", { name: /Second read file/ }));
    view.rerender(
      <ProcessInspectorAside
        items={items}
        activeProcessEventKey="current:second-read"
        onProcessEventSelect={vi.fn()}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: /Second read file/ })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });
});
