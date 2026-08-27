import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createS3IngestionJob,
  getAllFilesForJob,
  getDocumentProcessingStatuses,
  getIngestionJob,
  listIngestionJobs,
  type IngestionJobResponse,
  type S3File,
  uploadFiles,
} from "../api/ingestionApi";
import {
  createPendingProcessingStatus,
  createConnectorProcessingBatch,
  createRecoveredUploadProcessingBatch,
  createUploadProcessingBatch,
  getDocumentProcessingUiStatus,
  isTerminalProcessingStatus,
} from "./globalIngestionProcessing";
import {
  createGlobalIngestionJob,
  globalIngestionReducer,
} from "./globalIngestionReducer";
import {
  readStoredIngestionJobs,
  writeStoredIngestionJobs,
} from "./globalIngestionStorage";
import type { GlobalIngestionJob } from "./globalIngestionTypes";
import type {
  DocumentProcessingBatch,
  IngestionFile,
  S3Connection,
} from "./types";

export type S3ImportDraft = {
  connection: S3Connection;
  files: S3File[];
  selectedKeys: string[];
};

export type GlobalIngestionContextValue = {
  organizationId: string;
  workspaceId: string;
  jobs: GlobalIngestionJob[];
  dialogOpen: boolean;
  jobsSheetOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  setJobsSheetOpen: (open: boolean) => void;
  startUpload: (files: IngestionFile[]) => Promise<void>;
  startS3Import: (draft: S3ImportDraft) => Promise<void>;
  retryJob: (jobId: string) => void;
  dismissJob: (jobId: string) => void;
};

const GlobalIngestionContext =
  createContext<GlobalIngestionContextValue | null>(null);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createJobId() {
  return crypto.randomUUID();
}

function getScopeKey(organizationId: string, workspaceId: string) {
  return `${organizationId}:${workspaceId}`;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function shouldConfirmUpload(error: unknown) {
  if (error instanceof TypeError) return true;
  return (
    error instanceof Error &&
    error.message === "Upload succeeded but the response was invalid."
  );
}

function isMatchingUploadJob(
  job: GlobalIngestionJob,
  workspaceId: string,
  candidate: IngestionJobResponse,
) {
  const jobCreatedAt = Date.parse(job.createdAt);
  const candidateCreatedAt = Date.parse(candidate.created_at);
  return (
    candidate.datasource_type === "UPLOAD" &&
    candidate.workspace_id === workspaceId &&
    candidate.objects_written === job.objects.length &&
    Number.isFinite(candidateCreatedAt) &&
    (!Number.isFinite(jobCreatedAt) || candidateCreatedAt >= jobCreatedAt - 60_000)
  );
}

function waitForNextProcessingCheck(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 5000);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(
          new DOMException("The status check was cancelled.", "AbortError"),
        );
      },
      { once: true },
    );
  });
}

function waitForNextS3JobCheck(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 2000);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(
          new DOMException("The status check was cancelled.", "AbortError"),
        );
      },
      { once: true },
    );
  });
}

export function GlobalIngestionProvider({
  organizationId,
  workspaceId,
  children,
}: {
  organizationId: string;
  workspaceId: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    globalIngestionReducer,
    { organizationId, workspaceId },
    ({
      organizationId: initialOrganizationId,
      workspaceId: initialWorkspaceId,
    }) => ({
      jobs: readStoredIngestionJobs(initialOrganizationId, initialWorkspaceId),
    }),
  );
  const controllersRef = useRef(new Map<string, AbortController>());
  const scopeKey = getScopeKey(organizationId, workspaceId);
  const restoredScopeRef = useRef(scopeKey);
  const [hydratedScope, setHydratedScope] = useState(scopeKey);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobsSheetOpen, setJobsSheetOpen] = useState(false);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  useEffect(
    () => () => {
      controllersRef.current.forEach((controller) => controller.abort());
      controllersRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (restoredScopeRef.current === scopeKey) return;
    restoredScopeRef.current = scopeKey;
    dispatch({
      type: "RESTORED",
      jobs: readStoredIngestionJobs(organizationId, workspaceId),
    });
    setHydratedScope(scopeKey);
  }, [organizationId, scopeKey, workspaceId]);

  useEffect(() => {
    if (hydratedScope !== scopeKey) return;
    writeStoredIngestionJobs(organizationId, workspaceId, state.jobs);
  }, [hydratedScope, organizationId, scopeKey, state.jobs, workspaceId]);

  const monitorDocumentProcessing = useCallback(
    async (jobId: string, batch: DocumentProcessingBatch) => {
      controllersRef.current.get(jobId)?.abort();
      const controller = new AbortController();
      controllersRef.current.set(jobId, controller);
      const resultsByKey = new Map(
        batch.files.map((file) => [
          file.key,
          createPendingProcessingStatus(file.key),
        ]),
      );

      try {
        while (!controller.signal.aborted) {
          const objectKeys = batch.files
            .map((file) => file.key)
            .filter(
              (key) => !isTerminalProcessingStatus(resultsByKey.get(key)),
            );
          if (!objectKeys.length) return;

          const refreshed = await getDocumentProcessingStatuses(
            batch.workspace_id,
            batch.bucket,
            objectKeys,
            controller.signal,
          );
          refreshed.forEach((result) =>
            resultsByKey.set(result.object_key, result),
          );
          const results = batch.files.map(
            (file) =>
              resultsByKey.get(file.key) ??
              createPendingProcessingStatus(file.key),
          );
          dispatch({ type: "PROCESSING_UPDATED", jobId, results });
          if (getDocumentProcessingUiStatus(results) !== "polling") return;
          await waitForNextProcessingCheck(controller.signal);
        }
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "JOB_NEEDS_ATTENTION",
            jobId,
            retry: "retry_processing",
            message: getErrorMessage(
              error,
              "Unable to refresh document processing status.",
            ),
          });
        }
      } finally {
        if (controllersRef.current.get(jobId) === controller) {
          controllersRef.current.delete(jobId);
        }
      }
    },
    [],
  );

  const confirmUpload = useCallback(
    async (job: GlobalIngestionJob) => {
      try {
        const candidate = (await listIngestionJobs(organizationId))
          .filter((serverJob) => isMatchingUploadJob(job, workspaceId, serverJob))
          .sort(
            (left, right) =>
              Date.parse(right.created_at) - Date.parse(left.created_at),
          )[0];
        if (!candidate) {
          dispatch({
            type: "JOB_NEEDS_ATTENTION",
            jobId: job.id,
            retry: "retry_upload_confirmation",
            message:
              "Upload connection was interrupted. Retry to check whether the files reached AXIOM.",
          });
          return;
        }
        const files = await getAllFilesForJob(candidate.job_id);
        const batch = createRecoveredUploadProcessingBatch(candidate, files);
        dispatch({ type: "PROCESSING_READY", jobId: job.id, batch });
        void monitorDocumentProcessing(job.id, batch);
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "JOB_NEEDS_ATTENTION",
            jobId: job.id,
            retry: "retry_upload_confirmation",
            message: getErrorMessage(
              error,
              "Unable to confirm whether the upload reached AXIOM.",
            ),
          });
        }
      }
    },
    [monitorDocumentProcessing, organizationId, workspaceId],
  );

  useEffect(() => {
    state.jobs
      .filter(
        (job) =>
          job.source === "upload" &&
          job.batch === null &&
          job.retry === "start_new_upload" &&
          job.errorMessage === "Failed to fetch",
      )
      .forEach((job) => {
        void confirmUpload(job);
      });
  }, [confirmUpload, state.jobs]);

  const prepareS3Processing = useCallback(
    async (jobId: string, accepted: IngestionJobResponse) => {
      const controller = new AbortController();
      controllersRef.current.set(jobId, controller);
      try {
        const files = await getAllFilesForJob(
          accepted.job_id,
          controller.signal,
        );
        const batch = createConnectorProcessingBatch(accepted, files);
        dispatch({ type: "PROCESSING_READY", jobId, batch });
        void monitorDocumentProcessing(jobId, batch);
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "JOB_NEEDS_ATTENTION",
            jobId,
            retry: "retry_file_discovery",
            message: getErrorMessage(
              error,
              "Unable to prepare selected S3 objects for processing.",
            ),
          });
        }
      } finally {
        if (controllersRef.current.get(jobId) === controller) {
          controllersRef.current.delete(jobId);
        }
      }
    },
    [monitorDocumentProcessing],
  );

  const monitorS3Import = useCallback(
    async (jobId: string, serverJobId: string) => {
      controllersRef.current.get(jobId)?.abort();
      const controller = new AbortController();
      controllersRef.current.set(jobId, controller);
      try {
        await waitForNextS3JobCheck(controller.signal);
        while (!controller.signal.aborted) {
          const job = await getIngestionJob(serverJobId, controller.signal);
          if (job.status === "completed") {
            await prepareS3Processing(jobId, job);
            return;
          }
          if (job.status === "failed") {
            dispatch({
              type: "JOB_FAILED",
              jobId,
              retry: null,
              message: job.error_message ?? "The S3 import failed.",
            });
            return;
          }
          await waitForNextS3JobCheck(controller.signal);
        }
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "JOB_NEEDS_ATTENTION",
            jobId,
            retry: "retry_job_status",
            message: getErrorMessage(
              error,
              "Unable to refresh the S3 import status.",
            ),
          });
        }
      } finally {
        if (controllersRef.current.get(jobId) === controller) {
          controllersRef.current.delete(jobId);
        }
      }
    },
    [prepareS3Processing],
  );

  const startUpload = useCallback(
    async (files: IngestionFile[]) => {
      if (!files.length || !organizationId.trim() || !workspaceId.trim())
        return;
      const job = createGlobalIngestionJob({
        id: createJobId(),
        source: "upload",
        title: `${files.length} uploaded file${files.length === 1 ? "" : "s"}`,
        objects: files.map((file) => ({ key: file.name, name: file.name })),
      });
      dispatch({
        type: "JOB_CREATED",
        job: { ...job, status: "transferring" },
      });
      closeDialog();

      try {
        const result = await uploadFiles(
          organizationId,
          workspaceId,
          files.map((file) => file.file),
        );
        const batch = createUploadProcessingBatch(result);
        dispatch({ type: "PROCESSING_READY", jobId: job.id, batch });
        void monitorDocumentProcessing(job.id, batch);
      } catch (error) {
        if (shouldConfirmUpload(error)) {
          void confirmUpload(job);
          return;
        }
        dispatch({
          type: "JOB_FAILED",
          jobId: job.id,
          retry: "start_new_upload",
          message: getErrorMessage(
            error,
            "Unable to upload the selected files.",
          ),
        });
      }
    },
    [closeDialog, confirmUpload, monitorDocumentProcessing, organizationId, workspaceId],
  );

  const startS3Import = useCallback(
    async (draft: S3ImportDraft) => {
      if (!organizationId.trim() || !workspaceId.trim()) return;
      const selectedKeys = Array.from(new Set(draft.selectedKeys));
      if (!selectedKeys.length) return;
      const namesByKey = new Map(
        draft.files.map((file) => [file.key, file.name]),
      );
      let accepted: IngestionJobResponse;
      try {
        accepted = await createS3IngestionJob({
          organization_id: organizationId,
          workspace_id: workspaceId,
          credentials: {
            aws_access_key_id: draft.connection.accessKeyId.trim(),
            aws_secret_access_key: draft.connection.secretAccessKey,
            aws_region: draft.connection.region.trim(),
            aws_bucket_name: draft.connection.bucketName.trim(),
          },
          keys: selectedKeys,
        });
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("Unable to start the S3 import.");
      }
      const job = createGlobalIngestionJob({
        id: createJobId(),
        source: "s3",
        title: `S3 import from ${draft.connection.bucketName}`,
        objects: selectedKeys.map((key) => ({
          key,
          name: namesByKey.get(key) ?? key.split("/").pop() ?? key,
        })),
      });
      dispatch({ type: "JOB_CREATED", job });
      closeDialog();
      dispatch({
        type: "JOB_ACCEPTED",
        jobId: job.id,
        serverJobId: accepted.job_id,
        status: accepted.status === "completed" ? "processing" : "transferring",
      });
      if (accepted.status === "completed") {
        void prepareS3Processing(job.id, accepted);
      } else if (accepted.status === "failed") {
        dispatch({
          type: "JOB_FAILED",
          jobId: job.id,
          retry: null,
          message: accepted.error_message ?? "The S3 import failed.",
        });
      } else {
        void monitorS3Import(job.id, accepted.job_id);
      }
    },
    [
      closeDialog,
      monitorS3Import,
      organizationId,
      prepareS3Processing,
      workspaceId,
    ],
  );

  const retryJob = useCallback(
    (jobId: string) => {
      const job = state.jobs.find((candidate) => candidate.id === jobId);
      if (!job || !job.retry) return;

      if (job.retry === "retry_processing" && job.batch) {
        dispatch({ type: "RETRYING", jobId, status: "processing" });
        void monitorDocumentProcessing(jobId, job.batch);
        return;
      }
      if (job.retry === "retry_job_status" && job.serverJobId) {
        dispatch({ type: "RETRYING", jobId, status: "transferring" });
        void monitorS3Import(jobId, job.serverJobId);
        return;
      }
      if (job.retry === "retry_file_discovery" && job.serverJobId) {
        dispatch({ type: "RETRYING", jobId, status: "processing" });
        void getIngestionJob(job.serverJobId)
          .then((accepted) => prepareS3Processing(jobId, accepted))
          .catch((error: unknown) => {
            dispatch({
              type: "JOB_NEEDS_ATTENTION",
              jobId,
              retry: "retry_file_discovery",
              message: getErrorMessage(
                error,
                "Unable to prepare selected S3 objects for processing.",
              ),
            });
          });
      }
      if (job.retry === "retry_upload_confirmation") {
        dispatch({ type: "RETRYING", jobId, status: "transferring" });
        void confirmUpload(job);
      }
    },
    [
      monitorDocumentProcessing,
      monitorS3Import,
      prepareS3Processing,
      confirmUpload,
      state.jobs,
    ],
  );

  const dismissJob = useCallback((jobId: string) => {
    controllersRef.current.get(jobId)?.abort();
    controllersRef.current.delete(jobId);
    dispatch({ type: "DISMISSED", jobId });
  }, []);

  const value = useMemo(
    () => ({
      organizationId,
      workspaceId,
      jobs: state.jobs,
      dialogOpen,
      jobsSheetOpen,
      openDialog,
      closeDialog,
      setJobsSheetOpen,
      startUpload,
      startS3Import,
      retryJob,
      dismissJob,
    }),
    [
      closeDialog,
      dialogOpen,
      dismissJob,
      jobsSheetOpen,
      openDialog,
      organizationId,
      retryJob,
      setJobsSheetOpen,
      startS3Import,
      startUpload,
      state.jobs,
      workspaceId,
    ],
  );

  return (
    <GlobalIngestionContext.Provider value={value}>
      {children}
    </GlobalIngestionContext.Provider>
  );
}

export function useGlobalIngestion() {
  const value = useContext(GlobalIngestionContext);
  if (!value) {
    throw new Error(
      "useGlobalIngestion must be used inside GlobalIngestionProvider.",
    );
  }
  return value;
}
