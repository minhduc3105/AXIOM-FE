import { afterEach, describe, expect, it, vi } from "vitest";

const authFetch = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/model/authFetch", () => ({ authFetch }));

import { getDataSourceFiles } from "./dataApi";

const query = {
  page: 1,
  pageSize: 20,
  search: "",
  sortBy: "last_modified" as const,
  sortOrder: "desc" as const,
};

describe("getDataSourceFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("includes the selected workspace in the Corpus status lookup", async () => {
    authFetch
      .mockResolvedValueOnce(
        Response.json({
          organization_id: "org-1",
          datasource_id: "source-1",
          bucket: "axiom-data",
          count: 1,
          files: [
            {
              key: "reports/summary.pdf",
              name: "summary.pdf",
              size: 128,
              last_modified: "2026-08-20T10:00:00Z",
              etag: "etag-1",
              presigned_url: "http://minio:9000/axiom-data/reports/summary.pdf",
            },
          ],
          page: 1,
          page_size: 20,
          total_count: 1,
          total_pages: 1,
          total_unfiltered_count: 1,
          pagination: {
            page: 1,
            page_size: 20,
            total_count: 1,
            total_pages: 1,
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ results: [] }));

    await getDataSourceFiles(
      "source-1",
      "workspace-1",
      query,
      new AbortController().signal,
    );

    const [, request] = authFetch.mock.calls[1] ?? [];
    expect(JSON.parse(String(request?.body))).toEqual({
      workspace_id: "workspace-1",
      bucket: "axiom-data",
      object_keys: ["reports/summary.pdf"],
    });
  });
});
