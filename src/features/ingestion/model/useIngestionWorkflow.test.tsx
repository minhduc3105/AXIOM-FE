import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIngestionWorkflow } from "./useIngestionWorkflow";

describe("useIngestionWorkflow file selection", () => {
  it("accepts PNG images and rejects unsupported files", () => {
    const { result } = renderHook(() => useIngestionWorkflow());

    act(() => {
      result.current.addFiles([
        new File(["image"], "page.png", { type: "image/png" }),
        new File(["binary"], "program.exe", { type: "application/octet-stream" }),
      ]);
    });

    expect(result.current.stage).toBe("upload");
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].extension).toBe("PNG");
    expect(result.current.error).toContain("program.exe");
  });
});
