import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnswerActions } from "./AnswerActions";

function ReplyActionHarness({ onReply }: { onReply: (text: string) => void }) {
  const answerContentRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipProvider>
      <div>
        <div ref={answerContentRef}>The verified result is 42.</div>
        <div>Outside this answer.</div>
        <AnswerActions
          markdown="The verified result is 42."
          events={[]}
          artifacts={[]}
          answerContentRef={answerContentRef}
          onReply={onReply}
        />
      </div>
    </TooltipProvider>
  );
}

function selectRange(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
  complete = true,
) {
  const gestureTarget = startNode.parentElement ?? document.body;
  fireEvent.mouseDown(gestureTarget);
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent(document, new Event("selectionchange"));
  if (complete) fireEvent.mouseUp(gestureTarget);
}

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
      screen
        .getByRole("button", { name: "Copy response" })
        .querySelector(".lucide-clipboard"),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy response" }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("Copied answer");
    expect(
      screen.getByRole("button", { name: "Response copied" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Response copied" })
        .querySelector(".lucide-check"),
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

    const helpful = screen.getByRole("button", {
      name: "Mark response as helpful",
    });
    const unhelpful = screen.getByRole("button", {
      name: "Mark response as unhelpful",
    });

    fireEvent.click(helpful);
    expect(
      screen
        .getByRole("button", { name: "Remove helpful rating" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(unhelpful.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(unhelpful);
    expect(
      screen
        .getByRole("button", { name: "Mark response as helpful" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "Remove unhelpful rating" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("forwards Remember this to the conversation", () => {
    const onRemember = vi.fn();
    render(
      <TooltipProvider>
        <AnswerActions
          markdown="Answer"
          events={[]}
          artifacts={[]}
          onRemember={onRemember}
        />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remember this" }));

    expect(onRemember).toHaveBeenCalledOnce();
    expect(onRemember).toHaveBeenCalledWith("Answer");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows an Ask AXIOM popover for selected answer text", () => {
    const onReply = vi.fn();
    render(<ReplyActionHarness onReply={onReply} />);

    expect(screen.queryByRole("button", { name: "Ask AXIOM" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Reply to selected text" }),
    ).toBeNull();

    const answerText = screen.getByText("The verified result is 42.")
      .firstChild as Text;
    selectRange(answerText, 4, answerText, 19, false);

    expect(screen.queryByRole("button", { name: "Ask AXIOM" })).toBeNull();
    fireEvent.mouseUp(answerText.parentElement ?? document.body);

    const askAxiom = screen.getByRole("button", { name: "Ask AXIOM" });
    expect(askAxiom.getAttribute("data-selection-reply-action")).toBe("true");
    expect(window.getSelection()?.toString()).toBe("verified result");
    askAxiom.focus();
    expect(document.activeElement).toBe(askAxiom);
    window.getSelection()?.removeAllRanges();
    fireEvent(document, new Event("selectionchange"));
    expect(screen.getByRole("button", { name: "Ask AXIOM" })).toBeTruthy();
    fireEvent.mouseDown(askAxiom);
    fireEvent.click(askAxiom);

    expect(onReply).toHaveBeenCalledExactlyOnceWith("verified result");
  });

  it("hides the Ask AXIOM popover for outside, cross-answer, and cleared selections", () => {
    const onReply = vi.fn();
    render(<ReplyActionHarness onReply={onReply} />);
    const answerText = screen.getByText("The verified result is 42.")
      .firstChild as Text;
    const outsideText = screen.getByText("Outside this answer.")
      .firstChild as Text;

    selectRange(outsideText, 0, outsideText, 7);
    expect(screen.queryByRole("button", { name: "Ask AXIOM" })).toBeNull();

    selectRange(answerText, 4, outsideText, 7);
    expect(screen.queryByRole("button", { name: "Ask AXIOM" })).toBeNull();

    selectRange(answerText, 4, answerText, 19);
    expect(screen.getByRole("button", { name: "Ask AXIOM" })).toBeTruthy();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    fireEvent(document, new Event("selectionchange"));
    expect(screen.queryByRole("button", { name: "Ask AXIOM" })).toBeNull();

    expect(onReply).not.toHaveBeenCalled();
  });
});
