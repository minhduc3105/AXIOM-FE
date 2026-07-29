import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { S3File } from "../api/ingestionApi";
import { S3FileSelector } from "./S3FileSelector";

const files: S3File[] = [
  {
    key: "reports/january.csv",
    name: "january.csv",
    size: 1024,
    uploadedDate: "2026-07-28T10:30:00Z",
  },
  {
    key: "reports/february.csv",
    name: "february.csv",
    size: 2048,
    uploadedDate: "2026-07-28T11:30:00Z",
  },
  {
    key: "contracts/master.pdf",
    name: "master.pdf",
    size: 4096,
    uploadedDate: "2026-07-27T08:00:00Z",
  },
];

function renderSelector(
  overrides: Partial<React.ComponentProps<typeof S3FileSelector>> = {},
) {
  const props: React.ComponentProps<typeof S3FileSelector> = {
    connection: {
      accessKeyId: "access",
      secretAccessKey: "secret",
      region: "us-east-1",
      bucketName: "source-bucket",
    },
    files,
    nextToken: "next-page",
    selectedKeys: [],
    browserStatus: "ready",
    browserError: null,
    importStatus: "idle",
    importError: null,
    onToggleKey: vi.fn(),
    onSetSelection: vi.fn(),
    onClearSelection: vi.fn(),
    onLoadMore: vi.fn(),
    onLoadAll: vi.fn(),
    onRetryBrowser: vi.fn(),
    onImport: vi.fn(),
    onEditConnection: vi.fn(),
    ...overrides,
  };
  render(<S3FileSelector {...props} />);
  return props;
}

afterEach(cleanup);

describe("S3FileSelector", () => {
  it("selects all matching loaded files while preserving hidden selections", async () => {
    const user = userEvent.setup();
    const onSetSelection = vi.fn();
    renderSelector({
      selectedKeys: ["contracts/master.pdf"],
      onSetSelection,
    });

    await user.type(
      screen.getByRole("textbox", { name: "Search S3 files" }),
      "reports/",
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Select all matching files" }),
    );

    expect(onSetSelection).toHaveBeenCalledWith([
      "contracts/master.pdf",
      "reports/january.csv",
      "reports/february.csv",
    ]);
  });

  it("exposes an indeterminate select-all state for a partial selection", () => {
    renderSelector({ selectedKeys: ["reports/january.csv"] });

    expect(
      screen.getByRole("checkbox", { name: "Select all matching files" }),
    ).toHaveAttribute("data-indeterminate");
  });

  it("filters by extension and clears the complete selection", async () => {
    const user = userEvent.setup();
    const onClearSelection = vi.fn();
    renderSelector({
      selectedKeys: ["reports/january.csv", "contracts/master.pdf"],
      onClearSelection,
    });

    await user.click(
      screen.getByRole("combobox", { name: "Filter by file type" }),
    );
    await user.click(screen.getByRole("option", { name: "PDF" }));

    expect(screen.getByText("master.pdf")).toBeTruthy();
    expect(screen.queryByText("january.csv")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClearSelection).toHaveBeenCalledOnce();
  });

  it("loads more pages and imports only when a file is selected", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const onLoadAll = vi.fn();
    const onImport = vi.fn();
    renderSelector({
      selectedKeys: ["reports/january.csv"],
      onLoadMore,
      onLoadAll,
      onImport,
    });

    await user.click(screen.getByRole("button", { name: "Load more" }));
    await user.click(screen.getByRole("button", { name: "Load all" }));
    await user.click(
      screen.getByRole("button", { name: "Import 1 selected file" }),
    );

    expect(onLoadMore).toHaveBeenCalledOnce();
    expect(onLoadAll).toHaveBeenCalledOnce();
    expect(onImport).toHaveBeenCalledOnce();
  });

  it("renders a recoverable empty and error state", async () => {
    const user = userEvent.setup();
    const onRetryBrowser = vi.fn();
    renderSelector({
      files: [],
      nextToken: null,
      browserStatus: "error",
      browserError: "The bucket could not be listed.",
      onRetryBrowser,
    });

    expect(screen.getByText("No files found in this bucket")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Import 0 selected files/i }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Retry file listing" }),
    );
    expect(onRetryBrowser).toHaveBeenCalledOnce();
  });
});
