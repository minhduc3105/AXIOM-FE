import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type {
  InlinePreview,
  InspectorResource,
  ParsedDocumentResult,
  ProcessingFile,
} from "@/shared/types/document-results";
import { DocumentResultViewer } from "./DocumentResultViewer";

vi.mock("./SourcePreviewPane", () => ({
  ResourceError: ({ title }: { title: string }) => <p>{title}</p>,
  SourcePreviewPane: () => <p>Source viewer content</p>,
}));

let containerWidth = 1200;

class TestResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    Object.defineProperty(target, "clientWidth", {
      configurable: true,
      value: containerWidth,
    });
    this.callback([], this as unknown as ResizeObserver);
  }
  disconnect() {}
  unobserve() {}
}

const file: ProcessingFile = {
  key: "uploads/quarterly.pdf",
  filename: "Quarterly report.pdf",
  contentType: "application/pdf",
};

const preview: InspectorResource<InlinePreview> = {
  status: "success",
  data: {
    url: "/preview.pdf",
    key: file.key,
    bucket: "uploads",
    expiresIn: 300,
    expiresAt: Date.now() + 60_000,
  },
  error: null,
};

const parsing: InspectorResource<ParsedDocumentResult> = {
  status: "success",
  data: {
    document: {
      document_id: "document-1",
      organization_id: "org-1",
      workspace_id: "workspace-1",
      file_name: "Quarterly report.pdf",
      bucket: "uploads",
      object_key: file.key,
      current_status: "completed",
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
        component_id: "block-1",
        page: 0,
        block_index: 0,
        type: "paragraph",
        text: "First block",
      },
      {
        component_id: "block-2",
        page: 1,
        block_index: 1,
        type: "heading",
        text: "Second block",
      },
    ],
    readingOrder: ["block-1", "block-2"],
    mainText: "First block\nSecond block",
    contentTypes: ["paragraph", "heading"],
  },
  error: null,
};

function renderViewer() {
  render(
    <DocumentResultViewer
      file={file}
      preview={preview}
      parsing={parsing}
      onRetryPreview={vi.fn()}
      onRetryParsing={vi.fn()}
      context={{
        sourceLabel: "Upload queue",
        statusLabel: "Ready",
        statusTone: "success",
        backLabel: "Return to data",
        onBack: vi.fn(),
      }}
    />,
  );
}

describe("DocumentResultViewer", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses source-first master-detail layout with context and accessible resizing", () => {
    containerWidth = 1200;
    renderViewer();

    expect(
      screen.getByRole("separator", {
        name: "Resize source preview and parsed content panels",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Source preview" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Parsed content" }),
    ).toBeNull();
  });

  it("starts compact mode on source preview and returns there after selecting a block", () => {
    containerWidth = 700;
    renderViewer();

    expect(
      screen
        .getByRole("tab", { name: "Source preview" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Parsed content" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Show block-2 in source document" }),
    );
    expect(
      screen
        .getByRole("tab", { name: "Source preview" })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("closes the page filter after selecting a page", async () => {
    containerWidth = 1200;
    renderViewer();

    fireEvent.click(
      screen.getByRole("button", { name: "Filter blocks by page" }),
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Page 2" }));

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Filter blocks by page" })
          .getAttribute("aria-expanded"),
      ).toBe("false");
    });
  });

  it("shows parsed content without Rendered and JSON mode tabs", () => {
    containerWidth = 1200;
    renderViewer();

    expect(screen.queryByRole("tab", { name: /Rendered/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /JSON/ })).toBeNull();
    expect(screen.getByText("First block")).toBeTruthy();
  });
});
