import type { DocumentProcessingStatus } from "../api/ingestionApi";
import type {
  GlobalIngestionJob,
  GlobalIngestionJobStatus,
  GlobalIngestionObject,
  GlobalIngestionObjectStatus,
  GlobalIngestionRetry,
  GlobalIngestionState,
} from "./globalIngestionTypes";
import type { DocumentProcessingBatch } from "./types";

type CreateGlobalIngestionJobInput = Pick<
  GlobalIngestionJob,
  "id" | "source" | "title"
> & {
  objects: Array<Pick<GlobalIngestionObject, "key" | "name">>;
};

type GlobalIngestionAction =
  | { type: "JOB_CREATED"; job: GlobalIngestionJob }
  | {
      type: "JOB_ACCEPTED";
      jobId: string;
      serverJobId: string;
      status: Extract<GlobalIngestionJobStatus, "transferring" | "processing">;
    }
  | {
      type: "PROCESSING_READY";
      jobId: string;
      batch: DocumentProcessingBatch;
    }
  | {
      type: "PROCESSING_UPDATED";
      jobId: string;
      results: DocumentProcessingStatus[];
    }
  | {
      type: "JOB_NEEDS_ATTENTION";
      jobId: string;
      message: string;
      retry: Exclude<GlobalIngestionRetry, "start_new_upload" | null>;
    }
  | {
      type: "JOB_FAILED";
      jobId: string;
      message: string;
      retry: GlobalIngestionRetry;
    }
  | {
      type: "RETRYING";
      jobId: string;
      status: Extract<GlobalIngestionJobStatus, "transferring" | "processing">;
    }
  | { type: "RESTORED"; jobs: GlobalIngestionJob[] }
  | { type: "DISMISSED"; jobId: string };

export function createGlobalIngestionJob(
  input: CreateGlobalIngestionJobInput,
): GlobalIngestionJob {
  return {
    id: input.id,
    source: input.source,
    title: input.title,
    status: "submitting",
    serverJobId: null,
    batch: null,
    objects: input.objects.map((object) => ({
      ...object,
      status: "waiting",
      runId: null,
      documentId: null,
      errorMessage: null,
    })),
    errorMessage: null,
    retry: null,
    createdAt: new Date().toISOString(),
  };
}

export function deriveGlobalIngestionJobStatus(
  objects: GlobalIngestionObject[],
): Extract<
  GlobalIngestionJobStatus,
  "processing" | "complete" | "partial_failure"
> {
  if (!objects.length) return "complete";
  if (
    objects.some(
      (object) =>
        object.status === "waiting" || object.status === "processing",
    )
  ) {
    return "processing";
  }
  return objects.some((object) => object.status === "failed")
    ? "partial_failure"
    : "complete";
}

function getObjectStatus(
  result: DocumentProcessingStatus | undefined,
): GlobalIngestionObjectStatus {
  if (!result?.found) return "waiting";
  if (result.status === "completed") return "indexed";
  if (result.status === "failed") return "failed";
  return "processing";
}

function getDisplayName(key: string) {
  return key.split("/").filter(Boolean).pop() ?? key;
}

function replaceJob(
  state: GlobalIngestionState,
  jobId: string,
  update: (job: GlobalIngestionJob) => GlobalIngestionJob,
): GlobalIngestionState {
  return {
    jobs: state.jobs.map((job) => (job.id === jobId ? update(job) : job)),
  };
}

export function toDocumentProcessingStatuses(
  objects: GlobalIngestionObject[],
): DocumentProcessingStatus[] {
  return objects.map((object) => ({
    object_key: object.key,
    found: object.status !== "waiting",
    run_id: object.runId,
    document_id: object.documentId,
    status:
      object.status === "indexed"
        ? "completed"
        : object.status === "failed"
          ? "failed"
          : null,
    error_message: object.errorMessage,
    started_at: null,
    finished_at: null,
    created_at: null,
  }));
}

export function globalIngestionReducer(
  state: GlobalIngestionState,
  action: GlobalIngestionAction,
): GlobalIngestionState {
  switch (action.type) {
    case "JOB_CREATED":
      return { jobs: [action.job, ...state.jobs] };
    case "JOB_ACCEPTED":
      return replaceJob(state, action.jobId, (job) => ({
        ...job,
        serverJobId: action.serverJobId,
        status: action.status,
        errorMessage: null,
        retry: null,
      }));
    case "PROCESSING_READY":
      return replaceJob(state, action.jobId, (job) => {
        const namesByKey = new Map(
          job.objects.map((object) => [object.key, object.name]),
        );
        const objects = action.batch.files.map((file) => ({
          key: file.key,
          name: file.filename ?? namesByKey.get(file.key) ?? getDisplayName(file.key),
          status: "waiting" as const,
          runId: null,
          documentId: null,
          errorMessage: null,
        }));
        return {
          ...job,
          batch: action.batch,
          objects,
          status: deriveGlobalIngestionJobStatus(objects),
          errorMessage: null,
          retry: null,
        };
      });
    case "PROCESSING_UPDATED":
      return replaceJob(state, action.jobId, (job) => {
        const resultsByKey = new Map(
          action.results.map((result) => [result.object_key, result]),
        );
        const objects = job.objects.map((object) => {
          const result = resultsByKey.get(object.key);
          if (!result) return object;
          return {
            ...object,
            status: getObjectStatus(result),
            runId: result.run_id,
            documentId: result.document_id,
            errorMessage: result.error_message,
          };
        });
        return {
          ...job,
          objects,
          status: deriveGlobalIngestionJobStatus(objects),
          errorMessage: null,
          retry: null,
        };
      });
    case "JOB_NEEDS_ATTENTION":
      return replaceJob(state, action.jobId, (job) => ({
        ...job,
        errorMessage: action.message,
        retry: action.retry,
      }));
    case "JOB_FAILED":
      return replaceJob(state, action.jobId, (job) => ({
        ...job,
        status: "failed",
        errorMessage: action.message,
        retry: action.retry,
      }));
    case "RETRYING":
      return replaceJob(state, action.jobId, (job) => ({
        ...job,
        status: action.status,
        errorMessage: null,
        retry: null,
      }));
    case "RESTORED":
      return { jobs: action.jobs };
    case "DISMISSED":
      return { jobs: state.jobs.filter((job) => job.id !== action.jobId) };
    default:
      return state;
  }
}
