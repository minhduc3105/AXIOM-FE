import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnswerActions } from "./AnswerActions";

describe("AnswerActions", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("uses an icon-only copy action that announces its copied state for 1400ms", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(
      <TooltipProvider>
        <AnswerActions markdown="Copied answer" events={[]} artifacts={[]} />
      </TooltipProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Copy response" }).querySelector(
        ".lucide-clipboard",
      ),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy response" }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("Copied answer");
    expect(screen.getByRole("button", { name: "Response copied" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Response copied" }).querySelector(
        ".lucide-check",
      ),
    ).toBeTruthy();

    act(() => vi.advanceTimersByTime(1400));

    expect(screen.getByRole("button", { name: "Copy response" })).toBeTruthy();
  });

  it("lets the user choose one helpfulness rating at a time", () => {
    render(
      <TooltipProvider>
        <AnswerActions markdown="Answer" events={[]} artifacts={[]} />
      </TooltipProvider>,
    );

    const helpful = screen.getByRole("button", { name: "Mark response as helpful" });
    const unhelpful = screen.getByRole("button", { name: "Mark response as unhelpful" });

    fireEvent.click(helpful);
    expect(screen.getByRole("button", { name: "Remove helpful rating" }).getAttribute("aria-pressed")).toBe("true");
    expect(unhelpful.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(unhelpful);
    expect(screen.getByRole("button", { name: "Mark response as helpful" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Remove unhelpful rating" }).getAttribute("aria-pressed")).toBe("true");
  });

});
