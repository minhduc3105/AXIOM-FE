import { describe, expect, it } from "vitest";
import {
  createReportsRoute,
  getAppRoutePath,
  parseAppRoute,
} from "./paths";

describe("report routing", () => {
  it("parses the reports path", () => {
    expect(parseAppRoute("/reports")).toEqual({
      surface: "reports",
      sessionId: null,
    });
  });

  it("creates a stable reports URL", () => {
    expect(getAppRoutePath(createReportsRoute())).toBe("/reports");
  });
});
