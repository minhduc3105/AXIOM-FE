import { useEffect, useState } from "react";
import { getAllFilesForJob } from "@/shared/lib/document-api";
import { getDataFilesForJob } from "../api/dataApi";
import type { DataFile, IngestionJob } from "./types";

const dataFileCache = new Map<string, DataFile[]>();
const jobKeyCache = new Map<string, string[]>();

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useJobDataFiles(jobId: string | null) {
  const [files, setFiles] = useState<DataFile[]>(
    jobId ? dataFileCache.get(jobId) ?? [] : [],
  );
  const [loading, setLoading] = useState(Boolean(jobId && !dataFileCache.has(jobId)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setFiles([]);
      setLoading(false);
      setError(null);
      return;
    }
    const cached = dataFileCache.get(jobId);
    if (cached) {
      setFiles(cached);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setFiles([]);
    setLoading(true);
    setError(null);
    void getDataFilesForJob(jobId, controller.signal)
      .then((nextFiles) => {
        dataFileCache.set(jobId, nextFiles);
        setFiles(nextFiles);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(requestError, "Unable to load files for this job."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [jobId]);

  return { files, loading, error };
}

export function useUploadedDataFiles(files: DataFile[], jobs: IngestionJob[]) {
  const uploadJobIds = jobs
    .filter((job) => job.datasource_type === "FILES" && job.objects_written > 0)
    .map((job) => job.job_id);
  const cacheKey = uploadJobIds.join(":");
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(uploadJobIds.some((id) => !jobKeyCache.has(id)));
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (uploadJobIds.length === 0) {
      setKeys([]);
      setLoading(false);
      setWarning(null);
      return () => controller.abort();
    }
    setLoading(true);
    setWarning(null);
    void Promise.allSettled(
      uploadJobIds.map(async (jobId) => {
        const cached = jobKeyCache.get(jobId);
        if (cached) return cached;
        const result = await getAllFilesForJob(jobId, controller.signal);
        const nextKeys = result.files.map((file) => file.key);
        jobKeyCache.set(jobId, nextKeys);
        return nextKeys;
      }),
    ).then((results) => {
      if (controller.signal.aborted) return;
      const successful = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );
      setKeys(Array.from(new Set(successful)));
      const failedCount = results.filter((result) => result.status === "rejected").length;
      setWarning(
        failedCount > 0
          ? `${failedCount} uploaded-file batch${failedCount === 1 ? "" : "es"} could not be classified. Other sources were not mixed into this list.`
          : null,
      );
      setLoading(false);
    });
    return () => controller.abort();
  // cacheKey deliberately represents the complete job set.
  }, [cacheKey]);

  const keySet = new Set(keys);
  return {
    files: files.filter((file) => keySet.has(file.key)),
    loading,
    warning,
  };
}
