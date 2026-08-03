import { describe, expect, it } from "vitest";
import { getBlockOverlayStyle, type LayoutBlock } from "./documentResults";

function block(overrides: Partial<LayoutBlock> = {}): LayoutBlock {
  return {
    component_id: "/page/0/Text/0",
    page: 0,
    block_index: 0,
    type: "Text",
    text: "Example",
    ...overrides,
  };
}

describe("getBlockOverlayStyle", () => {
  it("normalizes a bbox against a non-zero page origin", () => {
    expect(getBlockOverlayStyle(block({
      bbox: [110, 220, 310, 420],
      page_bbox: [10, 20, 1010, 820],
    }))).toEqual({
      left: "10%",
      top: "25%",
      width: "20%",
      height: "25%",
    });
  });

  it("does not overlay blocks without valid geometry", () => {
    expect(getBlockOverlayStyle(block())).toBeNull();
    expect(getBlockOverlayStyle(block({
      bbox: [10, 10, 20, 20],
      page_bbox: [0, 0, 0, 100],
    }))).toBeNull();
  });
});
