import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  InlinePreview,
  InspectorResource,
  ProcessingFile,
} from "@/shared/types/document-results";
import { SourcePreviewPane } from "./SourcePreviewPane";

vi.mock("./PdfSourceViewer", () => ({
  default: () => <p>PDF viewer</p>,
}));
vi.mock("./SpreadsheetSourceViewer", () => ({
  default: () => <p>Spreadsheet viewer</p>,
}));
vi.mock("./DocxSourceViewer", () => ({
  default: () => <p>DOCX viewer</p>,
}));

const successfulPreview: InspectorResource<InlinePreview> = {
  status: "success",
  data: {
    url: "/signed-preview",
    key: "files/example",
    bucket: "uploads",
    expiresIn: 300,
    expiresAt: Date.now() + 60_000,
  },
  error: null,
};

function processingFile(
  key: string,
  contentType: string | null = null,
): ProcessingFile {
  const segments = key.split("/");
  return { key, filename: segments[segments.length - 1] ?? key, contentType };
}

function renderPane(
  file: ProcessingFile,
  preview: InspectorResource<InlinePreview> = successfulPreview,
  onRetry = vi.fn(),
) {
  render(
    <SourcePreviewPane
      file={file}
      preview={preview}
      blocks={[]}
      activeComponentId={null}
      pageIndex={0}
      showBoxes
      zoom={1}
      onActivate={vi.fn()}
      onPageIndexChange={vi.fn()}
      onShowBoxesChange={vi.fn()}
      onZoomChange={vi.fn()}
      onRetry={onRetry}
    />,
  );
  return onRetry;
}

describe("SourcePreviewPane", () => {
  it.each([
    ["report.pdf", "PDF viewer"],
    ["report.xlsx", "Spreadsheet viewer"],
    ["report.docx", "DOCX viewer"],
  ])("routes %s to its specialized viewer", async (key, viewer) => {
    renderPane(processingFile(key));
    expect(await screen.findByText(viewer)).toBeTruthy();
  });

  it("renders an image preview for PNG files", () => {
    renderPane(processingFile("preview.png", "image/png"));
    expect(
      screen.getByRole("img", { name: "Source preview for preview.png" }),
    ).toBeTruthy();
  });

  it("renders Markdown source content", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("# Admission report\n\nKey findings", { status: 200 }),
        ),
    );

    renderPane(processingFile("report.md"));

    expect(
      await screen.findByRole("heading", { name: "Admission report" }),
    ).toBeTruthy();
    expect(screen.getByText("Key findings")).toBeTruthy();
  });

  it("renders plain text source content", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("First paragraph\n\nSecond paragraph", { status: 200 }),
        ),
    );

    renderPane(processingFile("notes.txt"));

    expect(await screen.findByText("First paragraph")).toBeTruthy();
    expect(screen.getByText("Second paragraph")).toBeTruthy();
  });

  it("keeps parsed content available when a file format is unsupported", () => {
    renderPane(processingFile("archive.zip", "application/zip"));
    expect(screen.getByText("Unsupported preview format")).toBeTruthy();
    expect(
      screen.getByText(
        "Browser preview is available for PDF, PNG, JPEG, XLSX, DOCX, MD, and TXT files. Parsed content remains available.",
      ),
    ).toBeTruthy();
  });

  it("distinguishes signed URL loading, expiration, and retry", () => {
    const loading = { status: "loading", data: null, error: null } as const;
    renderPane(processingFile("report.docx"), loading);
    expect(screen.getByText("Preparing source preview…")).toBeTruthy();

    const retry = vi.fn();
    renderPane(
      processingFile("report.docx"),
      {
        ...successfulPreview,
        data: { ...successfulPreview.data, expiresAt: Date.now() - 1 },
      },
      retry,
    );
    expect(screen.getByText("Preview link expired")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
