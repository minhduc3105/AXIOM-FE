import { describe, expect, it } from "vitest";
import {
  getBlockOverlayDiagnostic,
  getSourcePreviewKind,
  type LayoutBlock,
  type ProcessingFile,
} from "./document-results";

function previewFile(
  key: string,
  contentType: string | null = null,
): ProcessingFile {
  return { key, filename: null, contentType };
}

describe("getSourcePreviewKind", () => {
  it.each([
    ["report.docx", null, "docx"],
    ["report.DOCX", null, "docx"],
    [
      "uploads/without-an-extension",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "docx",
    ],
    ["report.xlsx", null, "xlsx"],
    [
      "uploads/without-an-extension",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "xlsx",
    ],
    ["report.pdf", null, "pdf"],
    ["notes.md", null, "markdown"],
    ["notes.markdown", null, "markdown"],
    ["notes.txt", null, "text"],
    ["uploads/without-an-extension", "text/markdown", "markdown"],
    ["uploads/without-an-extension", "text/plain", "text"],
    ["page.jpeg", "image/jpeg", "image"],
    ["archive.zip", "application/zip", "unsupported"],
  ] as const)("classifies %s as %s", (key, contentType, expected) => {
    expect(getSourcePreviewKind(previewFile(key, contentType))).toBe(expected);
  });
});

const boxedBlock: LayoutBlock = {
  component_id: "block-1",
  page: 0,
  block_index: 0,
  type: "Text",
  text: "Example",
  bbox: [60, 90, 300, 180],
  page_bbox: [0, 0, 600, 900],
};

describe("getBlockOverlayDiagnostic", () => {
  it("marks raw coordinates that exceed their declared page bounds for debugging", () => {
    expect(
      getBlockOverlayDiagnostic(
        { ...boxedBlock, bbox: [60, 90, 650, 180] },
        { width: 600, height: 900 },
      ),
    ).toBe("outside-page-bounds");
  });

  it("marks a page box whose aspect ratio does not match the rendered PDF page", () => {
    expect(
      getBlockOverlayDiagnostic(boxedBlock, { width: 600, height: 840 }),
    ).toBe("page-aspect-mismatch");
  });
});
