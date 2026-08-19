import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { DataDashboardSnapshot } from "./types";

const api = vi.hoisted(() => ({
  getDataDashboard: vi.fn(),
}));

vi.mock("../api/dataApi", () => ({
  getDataDashboard: api.getDataDashboard,
}));

import { useDataDashboard } from "./useDataDashboard";

const snapshot: DataDashboardSnapshot = {
  organizationId: "org-1",
  workspaceId: "workspace-1",
  bucket: "axiom-data",
  bucketMetadata: {},
  files: [],
  datasources: [],
  ingestionJobs: [],
  warnings: [],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("useDataDashboard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("blocks duplicate refresh requests while a refresh is pending", async () => {
    const initial = deferred<DataDashboardSnapshot>();
    const refresh = deferred<DataDashboardSnapshot>();
    api.getDataDashboard
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(refresh.promise);

    const { result } = renderHook(() =>
      useDataDashboard("org-1", "workspace-1"),
    );
    expect(api.getDataDashboard).toHaveBeenCalledTimes(1);

    await act(async () => initial.resolve(snapshot));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.refresh();
      result.current.refresh();
    });

    await waitFor(() => expect(api.getDataDashboard).toHaveBeenCalledTimes(2));
    expect(result.current.loading).toBe(true);

    await act(async () => refresh.resolve(snapshot));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
