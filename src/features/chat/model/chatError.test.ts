import { describe, expect, it } from "vitest";
import { getChatError } from "./chatError";

describe("getChatError", () => {
  it.each([
    [
      { status: 503, code: "capacity_exhausted", retryable: true },
      "busy",
      "Chat is busy right now. Please try again in a moment.",
      "capacity_exhausted",
      true,
    ],
    [
      { code: "runtime_unavailable", retryable: true },
      "unavailable",
      "Chat is temporarily unavailable. Please try again in a moment.",
      "runtime_unavailable",
      true,
    ],
    [new TypeError("Failed to fetch"), "network", "We couldn’t reach the chat service. Check your connection and try again.", null, true],
    [{ status: 504 }, "timeout", "The response took too long. Please try again.", null, true],
    [{ status: 403 }, "permission", "You don’t have permission to use chat in this workspace.", null, false],
    [new Error("upstream failed"), "unknown", "Chat couldn’t complete that response. Please try again.", null, false],
  ])("maps %o to a safe %s chat message", (error, kind, message, code, retryable) => {
    expect(getChatError(error)).toMatchObject({ kind, message, code, retryable });
  });

  it("makes cancelled responses non-retryable without exposing server text", () => {
    const cause = { code: "cancelled", retryable: false, message: "socket closed" };

    expect(getChatError(cause)).toMatchObject({
      kind: "cancelled",
      code: "cancelled",
      retryable: false,
      message: "That response was stopped.",
      cause,
    });
  });
});
