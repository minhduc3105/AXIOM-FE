import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LayoutBlock } from "../model/documentResults";
import {
  RenderedBlockContent,
  sanitizeBlockHtml,
} from "./RenderedBlockContent";

function block(overrides: Partial<LayoutBlock> = {}): LayoutBlock {
  return {
    component_id: "/page/0/Table/2",
    page: 0,
    block_index: 2,
    type: "Table",
    text: "Text fallback",
    ...overrides,
  };
}

describe("RenderedBlockContent", () => {
  afterEach(cleanup);

  it("renders sanitized table HTML and keeps safe table attributes", () => {
    const { container } = render(
      <RenderedBlockContent
        block={block({
          html: `
            <table style="color:red" onclick="alert(1)">
              <thead><tr><th scope="col" colspan="2">Standard</th></tr></thead>
              <tbody><tr><td rowspan="2">23</td><td>Recommendation</td></tr></tbody>
            </table>
            <script>window.hacked = true</script>
            <iframe src="https://example.test"></iframe>
            <img src="https://example.test/tracker.png" onerror="alert(2)">
            <a href="javascript:alert(3)">unsafe link</a>
          `,
        })}
      />,
    );

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Standard" }).getAttribute("colspan")).toBe("2");
    expect(screen.getByRole("cell", { name: "23" }).getAttribute("rowspan")).toBe("2");
    const table = screen.getByRole("table");
    expect(table.hasAttribute("style")).toBe(false);
    expect(table.hasAttribute("onclick")).toBe(false);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  it("renders semantic HTML for non-table blocks", () => {
    render(
      <RenderedBlockContent
        block={block({
          type: "SectionHeader",
          html: "<h2>Annual report</h2>",
        })}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Annual report" })).toBeTruthy();
  });

  it("falls back through text, semantic text, and the empty message", () => {
    const { rerender } = render(
      <RenderedBlockContent
        block={block({ html: "<script>alert(1)</script>", text: "Plain text" })}
      />,
    );
    expect(screen.getByText("Plain text")).toBeTruthy();

    rerender(
      <RenderedBlockContent
        block={block({ html: "<table></table>", text: "", semantic_text: "Semantic text" })}
      />,
    );
    expect(screen.getByText("Semantic text")).toBeTruthy();

    rerender(
      <RenderedBlockContent
        block={block({ html: "", text: "", semantic_text: "" })}
      />,
    );
    expect(screen.getByText("No textual content is available for this block.")).toBeTruthy();
  });

  it("returns null when sanitization leaves no visible content", () => {
    expect(sanitizeBlockHtml("<script>alert(1)</script><iframe></iframe>")).toBeNull();
  });
});
