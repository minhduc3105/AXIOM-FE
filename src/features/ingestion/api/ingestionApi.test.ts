import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createS3IngestionJob,
  listS3Files,
  type IngestionJobResponse,
  type S3Credentials,
} from "./ingestionApi";

const credentials: S3Credentials = {
  aws_access_key_id: "test-access-key",
  aws_secret_access_key: "test-secret-key",
  aws_region: "us-east-1",
  aws_bucket_name: "source-bucket",
};

const job: IngestionJobResponse = {
  job_id: "8be261db-b91b-422a-8f1e-f68ce08f8a0d",
  organization_id: "organization-1",
  datasource_type: "s3",
  status: "pending",
  records_pulled: 0,
  objects_written: 0,
  manifest: null,
  error_message: null,
  created_at: "2026-07-29T10:00:00Z",
  updated_at: "2026-07-29T10:00:00Z",
  started_at: null,
  finished_at: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("S3 ingestion API", () => {
  it("lists an S3 page with the documented aliases", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        files: [
          {
            key: "reports/january.csv",
            name: "january.csv",
            size: 42,
            uploadedDate: "2026-07-28T10:30:00Z",
          },
        ],
        nextToken: "next-page",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listS3Files(
      credentials,
      1000,
      "previous-page",
    );

    expect(result.nextToken).toBe("next-page");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/document/s3/files:list",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          credentials,
          maxKey: 1000,
          nextToken: "previous-page",
        }),
      }),
    );
  });

  it("rejects an invalid S3 listing response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          files: [{ key: "missing-fields.csv" }],
          nextToken: null,
        }),
      ),
    );

    await expect(listS3Files(credentials)).rejects.toThrow(
      "S3 file discovery response was invalid",
    );
  });

  it("creates a selective S3 ingestion without datasource_type", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json(job, { status: 202 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createS3IngestionJob({
        organization_id: "organization-1",
        credentials,
        keys: ["reports/january.csv", "reports/february.csv"],
      }),
    ).resolves.toEqual(job);

    const [, request] = fetchMock.mock.calls[0];
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/document/s3/ingestions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(request?.body))).toEqual({
      organization_id: "organization-1",
      credentials,
      keys: ["reports/january.csv", "reports/february.csv"],
    });
    expect(JSON.parse(String(request?.body))).not.toHaveProperty(
      "datasource_type",
    );
  });

  it("surfaces backend validation details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { detail: [{ msg: "keys must contain non-empty file object keys" }] },
          { status: 422 },
        ),
      ),
    );

    await expect(
      createS3IngestionJob({
        organization_id: "organization-1",
        credentials,
        keys: ["reports/january.csv"],
      }),
    ).rejects.toThrow("keys must contain non-empty file object keys");
  });
});
