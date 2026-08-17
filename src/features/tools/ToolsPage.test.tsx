import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToolCatalogSkeleton } from "./components/ToolCatalogSkeleton";
import { ToolsProvider } from "./model/ToolsProvider";
import { defaultToolCatalogViewState, type ToolCatalogResponse } from "./model/types";
import { ToolsPage } from "./ToolsPage";

const emptyCatalog: ToolCatalogResponse = {
  tools: [],
  count: 0,
  counts_by_kind: {
    builtin_tool: 0,
    database_method: 0,
    datalake_action: 0,
    utility_method: 0,
  },
};

const populatedCatalog: ToolCatalogResponse = {
  ...emptyCatalog,
  count: 1,
  counts_by_kind: { ...emptyCatalog.counts_by_kind, utility_method: 1 },
  tools: [{
    name: "keyword_extract",
    kind: "utility_method",
    description: "Extract relevant keywords.",
    required_params: ["text"],
    param_count: 1,
    enabled: true,
  }],
};

function renderTools(viewState = defaultToolCatalogViewState) {
  return render(
    <ToolsProvider>
      <ToolsPage
        onOpenTool={vi.fn()}
        onViewStateChange={vi.fn()}
        viewState={viewState}
        availabilityScope={{ organizationName: "AXIOM", workspaceName: "Research" }}
      />
    </ToolsProvider>,
  );
}

describe("ToolsPage catalog states", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses the same minimum height as a Tool Card while loading", () => {
    const { container } = render(<ToolCatalogSkeleton />);

    expect(container.innerHTML).toContain("min-h-[280px]");
    expect(container.innerHTML).toContain("min-h-16");
  });

  it("distinguishes an empty catalog from an empty filtered result", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(emptyCatalog)));
    const { unmount } = renderTools();

    expect(await screen.findByRole("heading", { name: "No tools registered" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    unmount();

    renderTools({ ...defaultToolCatalogViewState, query: "unknown" });
    expect(await screen.findByRole("heading", { name: "No matching tools" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
  });

  it("keeps the last catalog visible when a refresh fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(Response.json(populatedCatalog))
        .mockRejectedValueOnce(new TypeError("Network unavailable")),
    );
    renderTools();

    expect(await screen.findByText("Keyword Extract")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByText("Catalog update failed")).toBeTruthy();
    });
    expect(screen.getByText("Keyword Extract")).toBeTruthy();
  });
});
