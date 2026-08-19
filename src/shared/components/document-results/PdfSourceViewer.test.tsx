import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("react-pdf", async () => {
  const React = await import("react");
  return {
    pdfjs: { GlobalWorkerOptions: { workerSrc: "" } },
    Document: ({
      children,
      onLoadSuccess,
    }: {
      children: React.ReactNode;
      onLoadSuccess: (pdf: { numPages: number }) => void;
    }) => {
      React.useEffect(() => onLoadSuccess({ numPages: 3 }), []);
      return <div>{children}</div>;
    },
    Page: ({ onRenderSuccess }: { onRenderSuccess: () => void }) => {
      React.useEffect(() => onRenderSuccess(), []);
      return <div aria-label="Rendered PDF page" />;
    },
  };
});

import PdfSourceViewer from "./PdfSourceViewer";

class TestResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const size = { inlineSize: 700, blockSize: 600 };
    this.callback(
      [
        {
          target,
          contentRect: target.getBoundingClientRect(),
          borderBoxSize: [size],
          contentBoxSize: [size],
          devicePixelContentBoxSize: [size],
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

function Harness() {
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showBoxes, setShowBoxes] = useState(true);
  return (
    <TooltipProvider>
      <PdfSourceViewer
        url="/report.pdf"
        fileName="report.pdf"
        blocks={[]}
        activeComponentId={null}
        pageIndex={pageIndex}
        showBoxes={showBoxes}
        zoom={zoom}
        onActivate={vi.fn()}
        onPageIndexChange={setPageIndex}
        onShowBoxesChange={setShowBoxes}
        onZoomChange={setZoom}
        onRetry={vi.fn()}
      />
    </TooltipProvider>
  );
}

describe("PdfSourceViewer", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true }),
    );
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("provides stable page, zoom, fit, reset, and box controls", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getByText("1 / 3")).toBeTruthy());
    expect(
      (screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("2 / 3")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("115%")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reset zoom" }));
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fit width" })).toBeTruthy();

    const boxes = screen.getByRole("button", {
      name: "Toggle parsed layout boxes",
    });
    expect(boxes.getAttribute("aria-pressed")).toBe("true");
    await user.click(boxes);
    expect(boxes.getAttribute("aria-pressed")).toBe("false");
  });
});
