import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseIngestedDocumentPayload,
  presignFileForPreview,
} from "./documentResultsApi";

function documentPayload(contents: Array<{ content_id: string; type: string; text: string }>) {
  return {
    error: null,
    message: null,
    document: {
      document_id: "document-1",
      organization_id: "test-org",
      file_name: "sample.pdf",
      bucket: "test-org",
      object_key: "sample.pdf",
      current_status: "indexed",
      latest_run_id: "run-1",
      size_bytes: 123,
    },
    processing_run: {
      run_id: "run-1",
      status: "completed",
      error_message: null,
    },
    content_summary: {
      content_types: contents.map((item) => item.type),
    },
    contents,
    chunks: [],
  };
}

describe("documentResultsApi", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("orders layout blocks by reading order and keeps unreferenced blocks", () => {
    const result = parseIngestedDocumentPayload(documentPayload([
      {
        content_id: "blocks",
        type: "blocks",
        text: JSON.stringify([
          { component_id: "/page/0/Text/1", page: 0, type: "Text", text: "Second" },
          {
            component_id: "/page/0/SectionHeader/0",
            page: 0,
            type: "SectionHeader",
            text: "First",
            bbox: [10, 20, 90, 60],
            page_bbox: [0, 0, 100, 100],
          },
          { component_id: "/page/0/PageFooter/2", page: 0, type: "PageFooter", text: "Footer" },
        ]),
      },
      {
        content_id: "reading-order",
        type: "reading_order",
        text: JSON.stringify(["/page/0/SectionHeader/0", "/page/0/Text/1"]),
      },
    ]));

    expect(result.blocks.map((block) => block.component_id)).toEqual([
      "/page/0/SectionHeader/0",
      "/page/0/Text/1",
      "/page/0/PageFooter/2",
    ]);
    expect(result.blocks[0].bbox).toEqual([10, 20, 90, 60]);
  });

  it("falls back to main text when layout content is absent", () => {
    const result = parseIngestedDocumentPayload(documentPayload([
      { content_id: "main", type: "main_text", text: "Extracted document text" },
    ]));

    expect(result.blocks).toEqual([]);
    expect(result.mainText).toBe("Extracted document text");
  });

  it("reports invalid JSON and Corpus domain errors", () => {
    expect(() => parseIngestedDocumentPayload(documentPayload([
      { content_id: "blocks", type: "blocks", text: "not-json" },
    ]))).toThrow("invalid JSON for blocks");
    expect(() => parseIngestedDocumentPayload({
      error: "document_not_found",
      message: "No ingested document matched the provided selector.",
    })).toThrow("No ingested document matched");
  });

  it("creates an inline preview URL through the storage proxy", async () => {
    const fetchMock = vi.fn(async () => Response.json({
      url: "http://minio:9000/test-org/NAPH%20LAP.pdf?X-Amz-Signature=secret",
      key: "NAPH LAP.pdf",
      bucket: "test-org",
      expires_in: 900,
      force_download: false,
      download_filename: null,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await presignFileForPreview("test-org", "NAPH LAP.pdf");

    expect(result.url).toBe("/storage/test-org/NAPH%20LAP.pdf?X-Amz-Signature=secret");
    expect(result.expiresIn).toBe(900);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/document/files/presign",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          object_path: "NAPH LAP.pdf",
          bucket_name: "test-org",
          expires_in: 900,
          force_download: false,
        }),
      }),
    );
  });
});
