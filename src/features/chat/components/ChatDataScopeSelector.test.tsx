import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { allChatDataScope, type ChatDataResource } from "../model/chatDataScope";
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

  it("applies a specific retrieval scope and excludes unavailable data", async () => {
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
      screen.getByRole("button", {
        name: "Select data scope, currently All workspace data",
      }),
    );
    expect(
      screen.getByRole("dialog", { name: "Choose data for this chat" }),
    ).toBeTruthy();

    await actor.click(screen.getByRole("button", { name: /Selected data/ }));
    await actor.click(
      screen.getByRole("checkbox", { name: /^Select Stripe payments/ }),
    );

    expect(
      screen
        .getByRole("checkbox", { name: /^Select Market research 2026/ })
        .getAttribute("aria-disabled"),
    ).toBe("true");

    await actor.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledWith({
      mode: "selected",
      resourceIds: ["datasource:stripe-payments"],
      resourceNames: ["Stripe payments"],
    });
  });

  it("refreshes workspace files without closing the selector", async () => {
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
      screen.getByRole("button", {
        name: "Select data scope, currently All workspace data",
      }),
    );
    await actor.click(
      screen.getByRole("button", { name: "Refresh workspace files" }),
    );

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("dialog", { name: "Choose data for this chat" }),
    ).toBeTruthy();
  });
});
