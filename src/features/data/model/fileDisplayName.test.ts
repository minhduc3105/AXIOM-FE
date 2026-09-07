import { describe, expect, it } from "vitest";
import { fileDisplayName } from "./fileDisplayName";

describe("fileDisplayName", () => {
  it("distinguishes persisted upload names without depending on the visible page", () => {
    expect(fileDisplayName("org/ws/rag.txt", "rag.txt")).toBe("rag.txt");
    expect(fileDisplayName("org/ws/rag (1).txt", "rag.txt")).toBe(
      "rag (1).txt",
    );
    expect(fileDisplayName("org/ws/rag-2.txt", "rag.txt")).toBe("rag-2.txt");
  });
  it("preserves original labels for opaque storage keys", () => {
    expect(fileDisplayName("org/ws/abc-123.txt", "rag.txt")).toBe("rag.txt");
  });
  it("handles directories, extensions and names without extensions", () => {
    expect(fileDisplayName("org/ws/folder/rag (1).txt", "folder/rag.txt")).toBe(
      "folder/rag (1).txt",
    );
    expect(fileDisplayName("org/ws/archive.tar (2).gz", "archive.tar.gz")).toBe(
      "archive.tar (2).gz",
    );
    expect(fileDisplayName("org/ws/README (1)", "README")).toBe("README (1)");
    expect(fileDisplayName("org/ws/rag (1).txt")).toBe("rag (1).txt");
  });
});
