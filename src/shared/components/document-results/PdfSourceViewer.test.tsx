import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import PdfSourceViewer from "./PdfSourceViewer";

vi.mock("react-pdf", async () => {
  const React = await import("react");
  return {
    pdfjs: { GlobalWorkerOptions: {} },
    Document: ({
      children,
      onLoadSuccess,
    }: {
      children: React.ReactNode;
      onLoadSuccess: (pdf: {
        numPages: number;
        getPage: (
          pageNumber: number,
        ) => Promise<{
          getViewport: (options: { scale: number }) => {
            width: number;
            height: number;
          };
        }>;
      }) => void;
    }) => {
      React.useEffect(
        () =>
          onLoadSuccess({
            numPages: 5,
            getPage: async () => ({
              getViewport: ({ scale }) => ({
                width: 600 * scale,
                height: 900 * scale,
              }),
            }),
          }),
        [onLoadSuccess],
      );
      return <>{children}</>;
    },
    Page: ({
      pageNumber,
      onLoadSuccess,
    }: {
      pageNumber: number;
      onLoadSuccess?: (page: {
        getViewport: (options: { scale: number }) => {
          width: number;
          height: number;
        };
      }) => void;
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
    Object.defineProperty(target, "clientWidth", {
      configurable: true,
      value: 640,
    });
    this.callback([], this as unknown as ResizeObserver);
  }
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
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders only the active PDF page", async () => {
    render(<PdfSourceViewer {...props} pageIndex={0} />);
    expect(await screen.findByText("PDF page 1")).toBeTruthy();
    expect(document.querySelectorAll("[data-rendered-page]")).toHaveLength(1);
    expect(screen.queryByText("PDF page 2")).toBeNull();
  });

  it("uses toolbar navigation and replaces the rendered page", async () => {
    const onPageIndexChange = vi.fn();
    const { rerender } = render(
      <PdfSourceViewer
        {...props}
        onPageIndexChange={onPageIndexChange}
        pageIndex={0}
      />,
    );
    await screen.findByText("PDF page 1");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageIndexChange).toHaveBeenCalledWith(1);

    rerender(
      <PdfSourceViewer
        {...props}
        onPageIndexChange={onPageIndexChange}
        pageIndex={2}
      />,
    );
    expect(await screen.findByText("PDF page 3")).toBeTruthy();
    expect(screen.queryByText("PDF page 1")).toBeNull();
    expect(document.querySelectorAll("[data-rendered-page]")).toHaveLength(1);
  });

  it("scrolls to the selected block within its PDF page", async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    render(
      <PdfSourceViewer
        {...props}
        activeComponentId="block-5"
        blocks={[
          {
            component_id: "block-5",
            page: 4,
            block_index: 0,
            type: "text",
            text: "Selected block",
            bbox: [60, 120, 240, 240],
            page_bbox: [0, 0, 600, 900],
          },
        ]}
        pageIndex={4}
      />,
    );

    await screen.findByText("PDF page 5");
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    expect(scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });

  it("uses the rendered PDF viewport, rather than an A4 placeholder, as the overlay coordinate plane", async () => {
    render(<PdfSourceViewer {...props} pageIndex={0} />);

    const frame = await screen.findByTestId("pdf-page-frame-0");
    expect(frame.style.width).toBe("608px");
    expect(frame.style.height).toBe("912px");
  });
});
