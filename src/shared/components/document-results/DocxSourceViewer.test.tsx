import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DocxSourceViewer } from "./DocxSourceViewer";

const { convertDocxToHtml } = vi.hoisted(() => ({
  convertDocxToHtml: vi.fn(),
}));

vi.mock("@/shared/lib/docx-preview", () => ({ convertDocxToHtml }));

function successfulResponse() {
  return {
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  } as unknown as Response;
}

describe("DocxSourceViewer", () => {
  beforeEach(() => {
    convertDocxToHtml.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a loading state while the document fetch is pending", () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    render(
      <DocxSourceViewer url="/preview.docx" fileName="preview.docx" onRetry={vi.fn()} />,
    );

    expect(screen.getByText("Loading document preview…")).toBeTruthy();
  });

  it("renders sanitized converted document HTML", async () => {
    vi.mocked(fetch).mockResolvedValue(successfulResponse());
    convertDocxToHtml.mockResolvedValue(
      '<h1>Quarterly review</h1><p>Summary content</p><a href="javascript:alert(1)">unsafe link</a><img src="x" onerror="alert(1)"><script>alert(1)</script>',
    );

    const { container } = render(
      <DocxSourceViewer url="/preview.docx" fileName="preview.docx" onRetry={vi.fn()} />,
    );

    expect(await screen.findByRole("heading", { name: "Quarterly review" })).toBeTruthy();
    expect(screen.getByText("Summary content")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("onerror")).toBeNull();
    expect(container.querySelector("a")?.getAttribute("href")).toBeNull();
  });

  it("shows an error and delegates retry after an HTTP failure", async () => {
    const retry = vi.fn();
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403 } as Response);

    render(
      <DocxSourceViewer url="/expired.docx" fileName="expired.docx" onRetry={retry} />,
    );

    expect(await screen.findByText("Document preview failed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight request when unmounted", () => {
    let requestSignal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_url, init) => {
      requestSignal = (init as RequestInit).signal as AbortSignal;
      return new Promise(() => {});
    });

    const { unmount } = render(
      <DocxSourceViewer url="/preview.docx" fileName="preview.docx" onRetry={vi.fn()} />,
    );
    unmount();

    expect(requestSignal?.aborted).toBe(true);
  });

  it("clears old content and fetches again when the URL changes", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(successfulResponse())
      .mockReturnValueOnce(new Promise(() => {}));
    convertDocxToHtml.mockResolvedValue("<p>First document</p>");

    const { rerender } = render(
      <DocxSourceViewer url="/first.docx" fileName="first.docx" onRetry={vi.fn()} />,
    );
    expect(await screen.findByText("First document")).toBeTruthy();

    rerender(
      <DocxSourceViewer url="/second.docx" fileName="second.docx" onRetry={vi.fn()} />,
    );

    expect(screen.getByText("Loading document preview…")).toBeTruthy();
    expect(screen.queryByText("First document")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
