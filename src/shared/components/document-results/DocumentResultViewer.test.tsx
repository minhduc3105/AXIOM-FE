import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  InspectorResource,
  LayoutBlock,
  ParsedDocumentResult,
  ProcessingFile,
} from "@/shared/types/document-results";

const notifications = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: notifications }));

import { DocumentResultViewer } from "./DocumentResultViewer";

let viewerWidth = 720;

class TestResizeObserver {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    window.setTimeout(() => {
      const size = { inlineSize: viewerWidth, blockSize: 640 };
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
    }, 0);
  }

  unobserve() {}
  disconnect() {}
}

const file: ProcessingFile = {
  key: "workspace/report.png",
  filename: "A very long quarterly evidence report.png",
  contentType: "image/png",
};

const blocks: LayoutBlock[] = [
  {
    component_id: "heading-1",
    page: 0,
    block_index: 0,
    type: "Heading",
    text: "Quarterly performance",
    bbox: [10, 10, 90, 30],
    page_bbox: [0, 0, 100, 100],
  },
  {
    component_id: "table-page-2",
    page: 1,
    block_index: 1,
    type: "Table",
    text: "Revenue table",
  },
  {
    component_id: "table-page-1",
    page: 0,
    block_index: 2,
    type: "Table",
    text: "Summary table",
    html: "<table><tbody><tr><td>Wide cell</td></tr></tbody></table>",
    bbox: [10, 40, 90, 80],
    page_bbox: [0, 0, 100, 100],
  },
];

const parsingData: ParsedDocumentResult = {
  document: {
    document_id: "document-1",
    organization_id: "org-1",
    file_name: file.filename!,
    bucket: "axiom-data",
    object_key: file.key,
    current_status: "completed",
    latest_run_id: "run-1",
    size_bytes: 1024,
  },
  processingRun: {
    run_id: "run-1",
    status: "completed",
    error_message: null,
  },
  blocks,
  readingOrder: blocks.map((block) => block.component_id),
  mainText: "Quarterly performance",
  contentTypes: ["blocks", "reading_order"],
};

function successResource<T>(data: T): InspectorResource<T> {
  return { status: "success", data, error: null };
}

function renderViewer(
  props: Partial<React.ComponentProps<typeof DocumentResultViewer>> = {},
) {
  return render(
    <TooltipProvider>
      <DocumentResultViewer
        file={file}
        preview={successResource({
          url: "/report.png",
          key: file.key,
          bucket: "axiom-data",
          expiresIn: 900,
          expiresAt: Date.now() + 900_000,
        })}
        parsing={successResource(parsingData)}
        onRetryPreview={vi.fn()}
        onRetryParsing={vi.fn()}
        context={{
          sourceLabel: "Uploaded files",
          statusLabel: "Ready",
          statusTone: "success",
          backLabel: "Back",
          onBack: vi.fn(),
        }}
        {...props}
      />
    </TooltipProvider>,
  );
}

describe("DocumentResultViewer", () => {
  beforeEach(() => {
    viewerWidth = 720;
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => viewerWidth,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 640,
    });
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a stable compact inspector header and preserves synchronized filter state", async () => {
    const user = userEvent.setup();
    renderViewer();

    expect(screen.getByText(file.filename!)).toBeTruthy();
    expect(screen.getByText("Uploaded files")).toBeTruthy();
    expect(screen.getByText("3 blocks")).toBeTruthy();
    expect(screen.getByText("Ready")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Parsed content" }));
    const firstCard = screen.getByRole("button", {
      name: "Show heading-1 in source document",
    });
    expect(firstCard.getAttribute("aria-pressed")).toBe("true");

    await user.click(
      screen.getByRole("button", { name: "Filter blocks by page" }),
    );
    await user.click(screen.getByRole("menuitemradio", { name: "Page 2" }));
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", {
            name: "Show table-page-2 in source document",
          })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );

    await user.click(
      screen.getByRole("button", { name: "Filter blocks by type" }),
    );
    await user.click(screen.getByRole("menuitemradio", { name: "Heading" }));
    expect(screen.getByText("No matching blocks")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Select parsed block 3: Table",
        hidden: true,
      }),
    );
    expect(
      screen.getByRole("button", { name: "Filter blocks by page" }).textContent,
    ).toContain("All pages");
    expect(
      screen.getByRole("button", { name: "Filter blocks by type" }).textContent,
    ).toContain("All types");
    expect(
      screen
        .getByRole("button", {
          name: "Show table-page-1 in source document",
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("formats and copies the normalized JSON without changing selection", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderViewer();

    await user.click(screen.getByRole("tab", { name: "Parsed content" }));
    await user.click(screen.getByRole("tab", { name: "JSON" }));
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('"component_id": "heading-1"'),
    );
    expect(notifications.success).toHaveBeenCalledWith("Parsed JSON copied.");
    expect(
      screen
        .getByRole("button", {
          name: "Show heading-1 in source document",
          hidden: true,
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("exposes the accessible desktop splitter and collapse controls", async () => {
    const user = userEvent.setup();
    viewerWidth = 1200;
    renderViewer();

    expect(
      screen.getByRole("separator", {
        name: "Resize source and parsed content panels",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Hide source preview" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Hide parsed content" }),
    ).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Source" })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Hide source preview" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Show source preview" }),
      ).toBeTruthy(),
    );
  });

  it("shows an expired preview state with a working retry action", async () => {
    const user = userEvent.setup();
    const onRetryPreview = vi.fn();
    renderViewer({
      preview: successResource({
        url: "/expired.png",
        key: file.key,
        bucket: "axiom-data",
        expiresIn: 900,
        expiresAt: Date.now() - 1,
      }),
      onRetryPreview,
    });

    expect(screen.getByText("Preview link expired")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryPreview).toHaveBeenCalledOnce();
  });

  it("keeps parsed content available when the source format is unsupported", async () => {
    const user = userEvent.setup();
    renderViewer({
      file: {
        key: "workspace/archive.zip",
        filename: "archive.zip",
        contentType: "application/zip",
      },
      preview: { status: "idle", data: null, error: null },
    });

    expect(screen.getByText("Unsupported preview format")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Parsed content" }));
    expect(
      screen.getByRole("button", {
        name: "Show heading-1 in source document",
      }),
    ).toBeTruthy();
  });
});
