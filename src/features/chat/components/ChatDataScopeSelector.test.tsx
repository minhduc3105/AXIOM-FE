import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  allChatDataScope,
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
  },
];

describe("ChatDataScopeSelector", () => {
  afterEach(cleanup);

  it("shows completed files and applies checkbox changes immediately", async () => {
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

    expect(screen.getByText("2 files")).toBeTruthy();
    expect(
      screen.queryByRole("checkbox", { name: /^Select Market research 2026/ }),
    ).toBeNull();
    expect(onChange).toHaveBeenCalledWith({
      mode: "selected",
      resourceIds: ["dataset:revenue-q3"],
      resourceNames: ["Q3 Revenue.xlsx"],
    });
  });

  it("resets and restores the complete-file selection", async () => {
    const actor = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChatDataScopeSelector
        scope={allChatDataScope}
        resources={resources}
        onChange={onChange}
      />,
    );

    await actor.click(screen.getByRole("button", { name: "Reset" }));
    expect(onChange).toHaveBeenLastCalledWith(noChatDataScope);
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

    await actor.click(screen.getByRole("button", { name: "Select all" }));
    expect(onChange).toHaveBeenLastCalledWith(allChatDataScope);
    expect(
      screen
        .getByRole("checkbox", { name: "Select Q3 Revenue.xlsx" })
        .getAttribute("aria-checked"),
    ).toBe("true");
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
