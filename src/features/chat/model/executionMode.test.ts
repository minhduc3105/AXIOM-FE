import { describe, expect, it } from "vitest";

import { normalizeExecutionMode } from "./executionMode";

describe("normalizeExecutionMode", () => {
  it("keeps Instant available for every public engine", () => {
    for (const engine of ["auto", "general", "reason", "report"] as const) {
      expect(normalizeExecutionMode(engine, "instant")).toBe("instant");
    }
  });
});
