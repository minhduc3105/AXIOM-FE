import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  allChatDataScope,
  createSelectedChatDataScope,
  noChatDataScope,
  type ChatDataResource,
} from "../model/chatDataScope";
import { ChatDataScopeSelector } from "./ChatDataScopeSelector";

const resources: ChatDataResource[] = [
  {
    id: "dataset:revenue-q3",
    name: "Q3 Revenue.xlsx",
    kind: "file",
    source: "Uploaded files",
    detail: "24.6K rows",
    updatedAt: "2 hours ago",
    status: "ready",
  },
  {
    id: "datasource:stripe-payments",
    name: "Stripe payments",
    kind: "connector",
    source: "Stripe",
    detail: "Live connector",
    updatedAt: "12 minutes ago",
    status: "ready",
  },
  {
    id: "dataset:indexing",
    name: "Market research 2026",
    kind: "file",
    source: "Amazon S3",
    detail: "Indexing",
    updatedAt: "Just now",
    status: "syncing",
    resourceRef: {
      resourceId: "dataset:indexing",
      filename: "Market research 2026.pdf",
      objectKey: "workspace/market-research.pdf",
      bucket: "org-bucket",
      status: "syncing",
    },
  },
  {
    id: "dataset:failed",
    name: "Failed upload.pdf",
    kind: "file",
    source: "Workspace file",
    detail: "Ingestion failed",
    updatedAt: "Just now",
    status: "unavailable",
    resourceRef: {
      resourceId: "dataset:failed",
      filename: "Failed upload.pdf",
      objectKey: "workspace/failed-upload.pdf",
      bucket: "org-bucket",
      status: "unavailable",
    },
  },
];

describe("ChatDataScopeSelector", () => {
  afterEach(cleanup);

  it("shows usable files and applies checkbox changes immediately", async () => {
    const actor = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChatDataScopeSelector
        scope={allChatDataScope}
        resources={resources}
        onChange={onChange}
      />,
    );

    await actor.click(
      screen.getByRole("checkbox", { name: /^Select Stripe payments/ }),
    );

    expect(screen.getByText("4 files")).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: /^Select Market research 2026/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: /^Select Failed upload/ }),
    ).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(
      createSelectedChatDataScope(
        ["dataset:revenue-q3", "dataset:indexing", "dataset:failed"],
        resources,
      ),
    );
  });

  it("toggles between selecting and clearing every resource", async () => {
    const actor = userEvent.setup();
    const onChange = vi.fn();
    const initialScope = createSelectedChatDataScope(
      ["datasource:stripe-payments"],
      resources,
    );
    render(
      <ChatDataScopeSelector
        scope={initialScope}
        resources={resources}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Select all" })).toBeTruthy();

    await actor.click(screen.getByRole("button", { name: "Select all" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "selected",
        resourceIds: [
          "dataset:revenue-q3",
          "datasource:stripe-payments",
          "dataset:indexing",
          "dataset:failed",
        ],
      }),
    );
    expect(
      screen.getByRole("button", { name: "Clear selection" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("checkbox", { name: "Select Q3 Revenue.xlsx" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen
        .getByRole("checkbox", { name: "Select Stripe payments" })
        .getAttribute("aria-checked"),
    ).toBe("true");

    await actor.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onChange).toHaveBeenLastCalledWith(noChatDataScope);
    expect(screen.getByRole("button", { name: "Select all" })).toBeTruthy();
    expect(
      screen
        .getByRole("checkbox", { name: "Select Q3 Revenue.xlsx" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(
      screen
        .getByRole("checkbox", { name: "Select Stripe payments" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("keeps checkbox state when moving between paginated pages", async () => {
    const actor = userEvent.setup();
    const onChange = vi.fn();
    const paginatedResources = Array.from({ length: 9 }, (_, index) => ({
      ...resources[0],
      id: `file-${index + 1}`,
      name: `File ${index + 1}.pdf`,
    }));
    render(
      <ChatDataScopeSelector
        scope={allChatDataScope}
        resources={paginatedResources}
        onChange={onChange}
      />,
    );

    await actor.click(
      screen.getByRole("checkbox", { name: "Select File 1.pdf" }),
    );
    await actor.click(screen.getByRole("button", { name: "Go to page 2" }));
    expect(
      screen.getByRole("checkbox", { name: "Select File 9.pdf" }),
    ).toBeTruthy();
    await actor.click(screen.getByRole("button", { name: "Go to page 1" }));

    expect(
      screen
        .getByRole("checkbox", { name: "Select File 1.pdf" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("selects all resources outside the current page", async () => {
    const actor = userEvent.setup();
    const onChange = vi.fn();
    const paginatedResources = Array.from({ length: 9 }, (_, index) => ({
      ...resources[0],
      id: `file-${index + 1}`,
      name: `File ${index + 1}.pdf`,
    }));
    render(
      <ChatDataScopeSelector
        scope={createSelectedChatDataScope(["file-1"], paginatedResources)}
        resources={paginatedResources}
        onChange={onChange}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Select all" }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "all",
        resourceIds: [],
      }),
    );
    expect(
      screen.getByRole("button", { name: "Clear selection" }),
    ).toBeTruthy();

    await actor.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onChange).toHaveBeenLastCalledWith(noChatDataScope);
    expect(screen.getByRole("button", { name: "Select all" })).toBeTruthy();
  });

  it("refreshes workspace files from the sidebar", async () => {
    const actor = userEvent.setup();
    const onRefresh = vi.fn();
    render(
      <ChatDataScopeSelector
        scope={allChatDataScope}
        resources={resources}
        onChange={vi.fn()}
        onRefresh={onRefresh}
      />,
    );

    await actor.click(
      screen.getByRole("button", { name: "Refresh workspace files" }),
    );

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Chat files" })).toBeTruthy();
  });
});
