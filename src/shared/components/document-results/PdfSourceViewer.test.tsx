import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PdfSourceViewer from "./PdfSourceViewer";

vi.mock("react-pdf", async () => {
  const React = await import("react");
  return {
    pdfjs: { GlobalWorkerOptions: {} },
    Document: ({ children, onLoadSuccess }: { children: React.ReactNode; onLoadSuccess: (pdf: { numPages: number; getPage: (pageNumber: number) => Promise<{ getViewport: (options: { scale: number }) => { width: number; height: number } }> }) => void }) => {
      React.useEffect(() => onLoadSuccess({
        numPages: 5,
        getPage: async () => ({
          getViewport: ({ scale }) => ({
            width: 600 * scale,
            height: 900 * scale,
          }),
        }),
      }), [onLoadSuccess]);
      return <>{children}</>;
    },
    Page: ({
      pageNumber,
      onLoadSuccess,
    }: {
      pageNumber: number;
      onLoadSuccess?: (page: { getViewport: (options: { scale: number }) => { width: number; height: number } }) => void;
    }) => {
      React.useEffect(() => {
        onLoadSuccess?.({
          getViewport: ({ scale }) => ({
            width: 600 * scale,
            height: 900 * scale,
          }),
        });
      }, [onLoadSuccess]);
      return <div data-rendered-page={pageNumber}>PDF page {pageNumber}</div>;
    },
  };
});

class TestResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    Object.defineProperty(target, "clientWidth", { configurable: true, value: 640 });
    this.callback([], this as unknown as ResizeObserver);
  }
  disconnect() {}
  unobserve() {}
}

class TestIntersectionObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

const props = {
  url: "/preview.pdf",
  fileName: "preview.pdf",
  blocks: [],
  activeComponentId: null,
  showBoxes: true,
  zoom: 1,
  onActivate: vi.fn(),
  onPageIndexChange: vi.fn(),
  onShowBoxesChange: vi.fn(),
  onZoomChange: vi.fn(),
  onRetry: vi.fn(),
};

describe("PdfSourceViewer", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders every PDF page in one continuous scroll surface", async () => {
    render(<PdfSourceViewer {...props} pageIndex={0} />);
    expect(await screen.findByText("PDF page 1")).toBeTruthy();
    expect(screen.getByText("PDF page 2")).toBeTruthy();
    expect(screen.getByText("PDF page 3")).toBeTruthy();
    expect(document.querySelectorAll("[data-rendered-page]")).toHaveLength(5);
  });

  it("keeps the complete document mounted when toolbar navigation changes", async () => {
    const { rerender } = render(<PdfSourceViewer {...props} pageIndex={0} />);
    await screen.findByText("PDF page 1");
    rerender(<PdfSourceViewer {...props} pageIndex={2} />);

    expect(await screen.findByText("PDF page 3")).toBeTruthy();
    expect(screen.getByText("PDF page 2")).toBeTruthy();
    expect(document.querySelectorAll("[data-rendered-page]")).toHaveLength(5);
  });

  it("uses the rendered PDF viewport, rather than an A4 placeholder, as the overlay coordinate plane", async () => {
    render(<PdfSourceViewer {...props} pageIndex={0} />);

    const frame = await screen.findByTestId("pdf-page-frame-0");
    expect(frame.style.width).toBe("608px");
    expect(frame.style.height).toBe("912px");
  });
});
