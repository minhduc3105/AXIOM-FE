import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { IngestionJobResponse } from "../api/ingestionApi";
import { useIngestionWorkflow } from "./useIngestionWorkflow";

const apiMocks = vi.hoisted(() => ({
  buildSearchIndex: vi.fn(),
  createIngestionJob: vi.fn(),
  createS3IngestionJob: vi.fn(),
  extractMeaning: vi.fn(),
  getAllFilesForJob: vi.fn(),
  getDocumentProcessingStatuses: vi.fn(),
  getIngestionJob: vi.fn(),
  listS3Files: vi.fn(),
  reviseMeaning: vi.fn(),
  runPipelineTask: vi.fn(),
  saveConnection: vi.fn(),
  searchIndexedEvidence: vi.fn(),
  testMySqlConnection: vi.fn(),
  uploadFiles: vi.fn(),
}));

vi.mock("../api/ingestionApi", () => apiMocks);

const failedJob: IngestionJobResponse = {
  job_id: "8be261db-b91b-422a-8f1e-f68ce08f8a0d",
  organization_id: "organization-1",
  datasource_type: "s3",
  status: "failed",
  records_pulled: 0,
  objects_written: 0,
  manifest: null,
  error_message: "Test job stopped before pulling.",
  created_at: "2026-07-29T10:00:00Z",
  updated_at: "2026-07-29T10:00:01Z",
  started_at: null,
  finished_at: "2026-07-29T10:00:01Z",
};

function configureS3(
  result: ReturnType<typeof renderHook<ReturnType<typeof useIngestionWorkflow>, unknown>>,
) {
  act(() => {
    result.result.current.selectConnector("Amazon S3");
    result.result.current.updateS3Connection("accessKeyId", "test-access");
    result.result.current.updateS3Connection("secretAccessKey", "test-secret");
    result.result.current.updateS3Connection("region", "us-east-1");
    result.result.current.updateS3Connection("bucketName", "source-bucket");
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_AXIOM_ORGANIZATION_ID", "organization-1");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("useIngestionWorkflow S3 browser", () => {
  it("loads and appends S3 pages without selecting new files", async () => {
    apiMocks.listS3Files
      .mockResolvedValueOnce({
        files: [
          {
            key: "reports/january.csv",
            name: "january.csv",
            size: 42,
            uploadedDate: "2026-07-28T10:30:00Z",
          },
        ],
        nextToken: "next-page",
      })
      .mockResolvedValueOnce({
        files: [
          {
            key: "reports/february.csv",
            name: "february.csv",
            size: 84,
            uploadedDate: "2026-07-28T11:30:00Z",
          },
        ],
        nextToken: null,
      });
    const result = renderHook(() => useIngestionWorkflow());
    configureS3(result);

    await act(async () => {
      await result.result.current.browseS3Files();
    });
    act(() => {
      result.result.current.toggleS3Key("reports/january.csv");
    });
    await act(async () => {
      await result.result.current.loadMoreS3Files();
    });

    expect(result.result.current.s3Files.map((file) => file.key)).toEqual([
      "reports/january.csv",
      "reports/february.csv",
    ]);
    expect(result.result.current.selectedS3Keys).toEqual([
      "reports/january.csv",
    ]);
    expect(result.result.current.s3NextToken).toBeNull();
  });

  it("loads every remaining page until the continuation token is empty", async () => {
    apiMocks.listS3Files
      .mockResolvedValueOnce({
        files: [
          {
            key: "reports/january.csv",
            name: "january.csv",
            size: 42,
            uploadedDate: "2026-07-28T10:30:00Z",
          },
        ],
        nextToken: "page-2",
      })
      .mockResolvedValueOnce({
        files: [
          {
            key: "reports/february.csv",
            name: "february.csv",
            size: 84,
            uploadedDate: "2026-07-28T11:30:00Z",
          },
        ],
        nextToken: "page-3",
      })
      .mockResolvedValueOnce({
        files: [
          {
            key: "reports/march.csv",
            name: "march.csv",
            size: 126,
            uploadedDate: "2026-07-28T12:30:00Z",
          },
        ],
        nextToken: null,
      });
    const result = renderHook(() => useIngestionWorkflow());
    configureS3(result);

    await act(async () => {
      await result.result.current.browseS3Files();
    });
    await act(async () => {
      await result.result.current.loadAllS3Files();
    });

    expect(result.result.current.s3Files).toHaveLength(3);
    expect(result.result.current.s3NextToken).toBeNull();
    expect(apiMocks.listS3Files).toHaveBeenNthCalledWith(
      3,
      expect.any(Object),
      1000,
      "page-3",
      expect.any(AbortSignal),
    );
  });

  it("resets the browser and selection when editing the connection", async () => {
    apiMocks.listS3Files.mockResolvedValueOnce({
      files: [
        {
          key: "reports/january.csv",
          name: "january.csv",
          size: 42,
          uploadedDate: "2026-07-28T10:30:00Z",
        },
      ],
      nextToken: "next-page",
    });
    const result = renderHook(() => useIngestionWorkflow());
    configureS3(result);

    await act(async () => {
      await result.result.current.browseS3Files();
    });
    act(() => {
      result.result.current.toggleS3Key("reports/january.csv");
      result.result.current.editS3Connection();
    });

    expect(result.result.current.s3BrowserStatus).toBe("idle");
    expect(result.result.current.s3Files).toEqual([]);
    expect(result.result.current.s3NextToken).toBeNull();
    expect(result.result.current.selectedS3Keys).toEqual([]);
  });

  it("submits only selected keys and clears secrets after HTTP 202", async () => {
    apiMocks.listS3Files.mockResolvedValueOnce({
      files: [
        {
          key: "reports/january.csv",
          name: "january.csv",
          size: 42,
          uploadedDate: "2026-07-28T10:30:00Z",
        },
      ],
      nextToken: null,
    });
    apiMocks.createS3IngestionJob.mockResolvedValueOnce(failedJob);
    const result = renderHook(() => useIngestionWorkflow());
    configureS3(result);

    await act(async () => {
      await result.result.current.browseS3Files();
    });
    act(() => {
      result.result.current.setSelectedS3Keys(["reports/january.csv"]);
    });
    await act(async () => {
      await result.result.current.submitS3Import();
    });

    expect(apiMocks.createS3IngestionJob).toHaveBeenCalledWith(
      {
        organization_id: "organization-1",
        credentials: {
          aws_access_key_id: "test-access",
          aws_secret_access_key: "test-secret",
          aws_region: "us-east-1",
          aws_bucket_name: "source-bucket",
        },
        keys: ["reports/january.csv"],
      },
      expect.any(AbortSignal),
    );
    expect(result.result.current.s3Connection.accessKeyId).toBe("");
    expect(result.result.current.s3Connection.secretAccessKey).toBe("");
    expect(result.result.current.ingestionJob?.job_id).toBe(failedJob.job_id);
  });
});
