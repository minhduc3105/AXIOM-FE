import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { DataSource } from "./types";

const api = vi.hoisted(() => ({
  getDataSourceFileCount: vi.fn(),
}));

vi.mock("../api/dataApi", () => ({
  getDataSourceFileCount: api.getDataSourceFileCount,
}));

import { useDataSourceFileCounts } from "./useDataSourceFileCounts";

function datasource(id: string): DataSource {
  return {
    id,
    organizationId: "org-1",
    workspaceId: "workspace-1",
    name: id,
    type: "s3",
    createdAt: "2026-08-19T08:00:00Z",
    updatedAt: "2026-08-19T08:00:00Z",
  };
}

describe("useDataSourceFileCounts", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps successful counts when another source count is unavailable", async () => {
    api.getDataSourceFileCount.mockImplementation((id: string) =>
      id === "source-ready"
        ? Promise.resolve(47)
        : Promise.reject(new Error("Unavailable")),
    );
    const sources = [datasource("source-ready"), datasource("source-error")];
    const { result } = renderHook(() => useDataSourceFileCounts(sources));

    expect(result.current["source-ready"]?.loading).toBe(true);
    await waitFor(() =>
      expect(result.current["source-ready"]?.loading).toBe(false),
    );

    expect(result.current["source-ready"]).toEqual({
      count: 47,
      loading: false,
      error: false,
    });
    expect(result.current["source-error"]).toEqual({
      count: null,
      loading: false,
      error: true,
    });
  });

  it("aborts pending requests when the source collection changes", async () => {
    const observedSignals: AbortSignal[] = [];
    api.getDataSourceFileCount.mockImplementation(
      (_id: string, signal: AbortSignal) => {
        observedSignals.push(signal);
        return new Promise<number>(() => undefined);
      },
    );
    const { rerender } = renderHook(
      ({ sources }) => useDataSourceFileCounts(sources),
      { initialProps: { sources: [datasource("source-old")] } },
    );

    await waitFor(() => expect(observedSignals.length).toBe(1));
    rerender({ sources: [] });
    expect(observedSignals[0].aborted).toBe(true);
  });
});
