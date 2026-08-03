import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  InlinePreview,
  InspectorResource,
  ParsedDocumentResult,
} from "../model/documentResults";
import { idleInspectorResource } from "../model/documentResults";
import { DocumentResultViewer } from "./DocumentResultViewer";

const parsing: InspectorResource<ParsedDocumentResult> = {
  status: "success",
  error: null,
  data: {
    document: {
      document_id: "document-1",
      organization_id: "test-org",
      file_name: "sample.txt",
      bucket: "test-org",
      object_key: "sample.txt",
      current_status: "indexed",
      latest_run_id: "run-1",
      size_bytes: 10,
    },
    processingRun: {
      run_id: "run-1",
      status: "completed",
      error_message: null,
    },
    blocks: [
      {
        component_id: "/page/0/SectionHeader/0",
        page: 0,
        block_index: 0,
        type: "SectionHeader",
        text: "Heading",
        html: "<h2>Heading</h2>",
      },
      {
        component_id: "/page/0/Table/1",
        page: 0,
        block_index: 1,
        type: "Table",
        text: "Name Value",
        html: "<table><tbody><tr><th>Name</th><td>Value</td></tr></tbody></table>",
      },
    ],
    readingOrder: ["/page/0/SectionHeader/0", "/page/0/Table/1"],
    mainText: "",
    contentTypes: ["blocks", "reading_order"],
  },
};

describe("DocumentResultViewer rendered blocks", () => {
  afterEach(cleanup);

  it("keeps structured HTML outside selection buttons and activates blocks from their headers", async () => {
    const user = userEvent.setup();
    render(
      <DocumentResultViewer
        file={{ key: "sample.txt", filename: "sample.txt", contentType: "text/plain" }}
        runId="run-1"
        preview={idleInspectorResource<InlinePreview>()}
        parsing={parsing}
        onRetryPreview={vi.fn()}
        onRetryParsing={vi.fn()}
      />,
    );

    const table = screen.getByRole("table");
    expect(table.closest("button")).toBeNull();

    const tableHeader = screen.getByRole("button", {
      name: "Show /page/0/Table/1 in source document",
    });
    expect(tableHeader.getAttribute("aria-pressed")).toBe("false");

    await user.click(tableHeader);
    await waitFor(() => expect(tableHeader.getAttribute("aria-pressed")).toBe("true"));
  });
});
