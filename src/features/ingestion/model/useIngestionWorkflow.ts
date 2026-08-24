import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  linkJobToDataSourceProfile,
  readDataSourceProfiles,
  saveDataSourceProfile,
  setBackendDatasourceId,
} from "@/shared/lib/data-source-profile-storage";
import type {
  DataSourceProfileType,
  SavedDataSourceProfile,
  SavedS3Config,
  SavedSnowflakeConfig,
} from "@/shared/types/data-source-profile";
import {
  createDatasourceProfile,
  listSavedS3Files,
  startSavedDatasourceIngestion,
  updateDatasourceProfile,
} from "../api/datasourceProfileApi";
import {
  buildSearchIndex,
  createIngestionJob,
  createS3IngestionJob,
  extractMeaning,
  getAllFilesForJob,
  getDocumentProcessingStatuses,
  getIngestionJob,
  listS3Files,
  reviseMeaning,
  runPipelineTask,
  saveConnection,
  searchIndexedEvidence,
  testMySqlConnection,
  uploadFiles,
} from "../api/ingestionApi";
import type {
  DocumentProcessingStatus,
  IngestionJobResponse,
  JobFilesResult,
  S3Credentials,
  S3File,
  UploadFilesResponse,
} from "../api/ingestionApi";
import type {
  AsyncStatus,
  ConnectorJobUiStatus,
  DocumentProcessingBatch,
  DocumentProcessingUiStatus,
  IndexStatus,
  IngestionFile,
  IngestionSource,
  IngestionStage,
  MeaningStatus,
  MySqlConnection,
  PipelineTask,
  PipelineTaskId,
  ProgressStage,
  S3BrowserStatus,
  S3Connection,
  SnowflakeConnection,
} from "./types";
import { SUPPORTED_UPLOAD_EXTENSIONS } from "./types";
import {
  createPendingProcessingStatus,
  createUploadProcessingBatch,
  getDocumentProcessingUiStatus,
  isTerminalProcessingStatus,
} from "./globalIngestionProcessing";

const initialConnection: MySqlConnection = {
  host: "mysql.company.internal",
  port: "3306",
  database: "analytics",
  schema: "public",
  username: "axiom_readonly",
  password: "readonly",
  sslMode: "Require",
  encrypted: true,
};

const initialS3Connection: S3Connection = {
  accessKeyId: "",
  secretAccessKey: "",
  region: "us-east-1",
  bucketName: "",
};

const initialSnowflakeConnection: SnowflakeConnection = {
  account: "",
  user: "",
  privateKey: "",
  privateKeyPassphrase: "",
  warehouse: "",
  database: "",
  schema: "",
  role: "",
  discoverTables: true,
  discoverStages: true,
  stagePattern: "",
  tableLimit: "",
  stageLimit: "",
};

const initialTasks: PipelineTask[] = [
  {
    id: "source-intake",
    title: "Source intake",
    description: "Import source manifests and preserve original checksums.",
    status: "queued",
  },
  {
    id: "normalize",
    title: "Normalize content",
    description: "Convert source records and documents into a common format.",
    status: "queued",
  },
  {
    id: "profile",
    title: "Profile structure",
    description:
      "Detect fields, completeness, sensitive columns, and parse quality.",
    status: "queued",
  },
  {
    id: "meaning",
    title: "Extract meaning",
    description:
      "Infer concepts, join keys, entities, business terms, and governed claims.",
    status: "queued",
  },
  {
    id: "index",
    title: "Build searchable index",
    description:
      "Create retrieval-ready chunks with source maps and evidence IDs.",
    status: "queued",
  },
];

type WorkflowState = {
  stage: IngestionStage;
  furthestProgress: number;
  selectedConnector: string;
  connection: MySqlConnection;
  connectionStatus: AsyncStatus | "verified" | "saving" | "saved";
  s3Connection: S3Connection;
  s3BrowserStatus: S3BrowserStatus;
  s3Files: S3File[];
  s3NextToken: string | null;
  selectedS3Keys: string[];
  s3BrowserError: string | null;
  snowflakeConnection: SnowflakeConnection;
  connectorJobStatus: ConnectorJobUiStatus;
  ingestionJob: IngestionJobResponse | null;
  connectorError: string | null;
  source: IngestionSource | null;
  files: IngestionFile[];
  selectedFileId: string | null;
  uploadStatus: AsyncStatus;
  uploadResult: UploadFilesResponse | null;
  processingBatch: DocumentProcessingBatch | null;
  documentProcessingStatus: DocumentProcessingUiStatus;
  documentProcessingResults: DocumentProcessingStatus[];
  documentProcessingError: string | null;
  pipelineStatus: AsyncStatus;
  tasks: PipelineTask[];
  meaningStatus: MeaningStatus;
  indexStatus: IndexStatus;
  searchStatus: AsyncStatus;
  searchQuery: string;
  completedSearchQuery: string;
  revisionCount: number;
  error: string | null;
};

const initialState: WorkflowState = {
  stage: "source",
  furthestProgress: 0,
  selectedConnector: "",
  connection: initialConnection,
  connectionStatus: "idle",
  s3Connection: initialS3Connection,
  s3BrowserStatus: "idle",
  s3Files: [],
  s3NextToken: null,
  selectedS3Keys: [],
  s3BrowserError: null,
  snowflakeConnection: initialSnowflakeConnection,
  connectorJobStatus: "idle",
  ingestionJob: null,
  connectorError: null,
  source: null,
  files: [],
  selectedFileId: null,
  uploadStatus: "idle",
  uploadResult: null,
  processingBatch: null,
  documentProcessingStatus: "idle",
  documentProcessingResults: [],
  documentProcessingError: null,
  pipelineStatus: "idle",
  tasks: initialTasks,
  meaningStatus: "idle",
  indexStatus: "idle",
  searchStatus: "idle",
  searchQuery: "customers missing email with revenue risk",
  completedSearchQuery: "",
  revisionCount: 0,
  error: null,
};

export type IngestionLaunchContext = {
  connector: DataSourceProfileType | null;
  profileId: string | null;
};

const defaultLaunchContext: IngestionLaunchContext = {
  connector: null,
  profileId: null,
};

function getS3SavedConfig(connection: S3Connection): SavedS3Config {
  return {
    region: connection.region.trim(),
    bucketName: connection.bucketName.trim(),
  };
}

function getSnowflakeSavedConfig(
  connection: SnowflakeConnection,
): SavedSnowflakeConfig {
  return {
    account: connection.account.trim(),
    user: connection.user.trim(),
    warehouse: connection.warehouse.trim(),
    database: connection.database.trim(),
    schema: connection.schema.trim(),
    role: connection.role.trim(),
    discoverTables: connection.discoverTables,
    discoverStages: connection.discoverStages,
    stagePattern: connection.stagePattern.trim(),
    tableLimit: optionalPositiveInteger(connection.tableLimit),
    stageLimit: optionalPositiveInteger(connection.stageLimit),
  };
}

function applyProfileToState(
  profile: SavedDataSourceProfile | null,
): WorkflowState {
  if (!profile) return initialState;
  if (profile.type === "s3") {
    const config = profile.config as SavedS3Config;
    return {
      ...initialState,
      stage: "s3",
      furthestProgress: 1,
      selectedConnector: "Amazon S3",
      s3Connection: {
        accessKeyId: "",
        secretAccessKey: "",
        region: config.region,
        bucketName: config.bucketName,
      },
    };
  }
  const config = profile.config as SavedSnowflakeConfig;
  return {
    ...initialState,
    stage: "snowflake",
    furthestProgress: 1,
    selectedConnector: "Snowflake",
    snowflakeConnection: {
      account: config.account,
      user: config.user,
      privateKey: "",
      privateKeyPassphrase: "",
      warehouse: config.warehouse,
      database: config.database,
      schema: config.schema,
      role: config.role,
      discoverTables: config.discoverTables,
      discoverStages: config.discoverStages,
      stagePattern: config.stagePattern,
      tableLimit: config.tableLimit?.toString() ?? "",
      stageLimit: config.stageLimit?.toString() ?? "",
    },
  };
}

function createLaunchedState(
  profile: SavedDataSourceProfile | null,
  connector: DataSourceProfileType | null,
) {
  if (profile) return applyProfileToState(profile);
  if (connector === "s3") {
    return {
      ...initialState,
      stage: "s3" as const,
      furthestProgress: 1,
      selectedConnector: "Amazon S3",
    };
  }
  if (connector === "snowflake") {
    return {
      ...initialState,
      stage: "snowflake" as const,
      furthestProgress: 1,
      selectedConnector: "Snowflake",
    };
  }
  return initialState;
}

type Action =
  | { type: "OPEN_SOURCE" }
  | { type: "OPEN_CATALOG" }
  | { type: "SELECT_CONNECTOR"; connector: string }
  | {
      type: "UPDATE_CONNECTION";
      field: keyof MySqlConnection;
      value: string | boolean;
    }
  | { type: "UPDATE_S3_CONNECTION"; field: keyof S3Connection; value: string }
  | {
      type: "S3_BROWSE_START";
      status: Extract<
        S3BrowserStatus,
        "loading" | "loading_more" | "loading_all"
      >;
    }
  | {
      type: "S3_PAGE_READY";
      files: S3File[];
      nextToken: string | null;
      append: boolean;
      status: Extract<S3BrowserStatus, "ready" | "loading_all">;
    }
  | { type: "S3_BROWSE_ERROR"; message: string }
  | { type: "S3_EDIT_CONNECTION" }
  | { type: "S3_TOGGLE_KEY"; key: string }
  | { type: "S3_SET_SELECTION"; keys: string[] }
  | { type: "S3_CLEAR_SELECTION" }
  | {
      type: "UPDATE_SNOWFLAKE_CONNECTION";
      field: keyof SnowflakeConnection;
      value: string | boolean;
    }
  | { type: "CONNECTOR_SUBMIT_START" }
  | { type: "CONNECTOR_JOB_ACCEPTED"; job: IngestionJobResponse }
  | { type: "CONNECTOR_JOB_UPDATED"; job: IngestionJobResponse }
  | { type: "CONNECTOR_FILES_DISCOVERY_START" }
  | { type: "CONNECTOR_FILES_READY"; batch: DocumentProcessingBatch }
  | { type: "CONNECTOR_FILES_ERROR"; message: string }
  | { type: "CONNECTOR_SUBMIT_ERROR"; message: string }
  | { type: "CONNECTOR_STATUS_ERROR"; message: string }
  | { type: "CONNECTOR_RETRY_STATUS" }
  | { type: "CONNECTOR_NEW_IMPORT" }
  | { type: "TEST_START" }
  | { type: "TEST_SUCCESS" }
  | { type: "TEST_ERROR"; message: string }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS"; connectionId: string }
  | { type: "SAVE_ERROR"; message: string }
  | { type: "ADD_FILES"; files: IngestionFile[] }
  | { type: "FILE_SELECTION_ERROR"; message: string }
  | { type: "SELECT_FILE"; id: string }
  | { type: "REMOVE_FILE"; id: string }
  | { type: "UPLOAD_START" }
  | { type: "UPLOAD_SUCCESS"; result: UploadFilesResponse }
  | { type: "UPLOAD_ERROR"; message: string }
  | { type: "DOCUMENT_PROCESSING_UPDATED"; results: DocumentProcessingStatus[] }
  | { type: "DOCUMENT_PROCESSING_STATUS_ERROR"; message: string }
  | { type: "DOCUMENT_PROCESSING_RETRY" }
  | { type: "PIPELINE_START" }
  | { type: "TASK_RUNNING"; id: PipelineTaskId }
  | { type: "TASK_COMPLETE"; id: PipelineTaskId }
  | { type: "TASK_ERROR"; id: PipelineTaskId; message: string }
  | { type: "PIPELINE_SUCCESS" }
  | { type: "OPEN_PROFILE" }
  | { type: "MEANING_START" }
  | { type: "MEANING_READY" }
  | { type: "REVISION_START" }
  | { type: "REVISION_READY" }
  | { type: "INDEX_START" }
  | { type: "INDEX_READY" }
  | { type: "SEARCH_QUERY"; query: string }
  | { type: "SEARCH_START" }
  | { type: "SEARCH_SUCCESS"; query: string }
  | { type: "SEARCH_ERROR"; message: string }
  | { type: "NAVIGATE"; stage: IngestionStage };

function resetRunState(
  state: WorkflowState,
): Pick<
  WorkflowState,
  | "pipelineStatus"
  | "tasks"
  | "meaningStatus"
  | "indexStatus"
  | "completedSearchQuery"
> {
  return {
    pipelineStatus: "idle",
    tasks: initialTasks,
    meaningStatus: "idle",
    indexStatus: "idle",
    completedSearchQuery: "",
  };
}

function resetS3BrowserState(): Pick<
  WorkflowState,
  | "s3BrowserStatus"
  | "s3Files"
  | "s3NextToken"
  | "selectedS3Keys"
  | "s3BrowserError"
> {
  return {
    s3BrowserStatus: "idle",
    s3Files: [],
    s3NextToken: null,
    selectedS3Keys: [],
    s3BrowserError: null,
  };
}

function clearS3Secrets(connection: S3Connection): S3Connection {
  return { ...connection, accessKeyId: "", secretAccessKey: "" };
}

function updateTask(
  tasks: PipelineTask[],
  id: PipelineTaskId,
  status: PipelineTask["status"],
) {
  return tasks.map((task) => (task.id === id ? { ...task, status } : task));
}

function getConnectorJobUiStatus(
  job: IngestionJobResponse,
): ConnectorJobUiStatus {
  if (job.status === "completed") return "completed";
  if (job.status === "failed") return "failed";
  return "polling";
}

function createConnectorProcessingBatch(
  job: IngestionJobResponse,
  filesResult: JobFilesResult,
): DocumentProcessingBatch {
  if (job.datasource_type !== "s3" && job.datasource_type !== "snowflake") {
    throw new Error(
      `Unsupported connector indexing source: ${job.datasource_type}.`,
    );
  }
  return {
    job_id: job.job_id,
    organization_id: filesResult.organization_id,
    workspace_id: job.workspace_id,
    bucket: filesResult.bucket,
    count: filesResult.count,
    source_kind: job.datasource_type,
    files: filesResult.files.map((file) => ({
      key: file.key,
      filename: null,
      contentType: null,
    })),
  };
}

function getConnectorStage(
  connector: string,
  fallback: IngestionStage,
): IngestionStage {
  if (connector === "MySQL") return "mysql";
  if (connector === "Amazon S3") return "s3";
  if (connector === "Snowflake") return "snowflake";
  return fallback;
}

function reducer(state: WorkflowState, action: Action): WorkflowState {
  switch (action.type) {
    case "OPEN_SOURCE":
      return {
        ...state,
        stage: "source",
        s3Connection:
          state.stage === "s3"
            ? clearS3Secrets(state.s3Connection)
            : state.s3Connection,
        ...(state.stage === "s3" ? resetS3BrowserState() : {}),
        error: null,
      };
    case "OPEN_CATALOG":
      return {
        ...state,
        stage: "catalog",
        furthestProgress: Math.max(state.furthestProgress, 1),
        s3Connection:
          state.stage === "s3"
            ? clearS3Secrets(state.s3Connection)
            : state.s3Connection,
        ...(state.stage === "s3" ? resetS3BrowserState() : {}),
        error: null,
      };
    case "SELECT_CONNECTOR":
      return {
        ...state,
        selectedConnector: action.connector,
        stage: getConnectorStage(action.connector, state.stage),
        connectorJobStatus: "idle",
        ingestionJob: null,
        connectorError: null,
        processingBatch: null,
        documentProcessingStatus: "idle",
        documentProcessingResults: [],
        documentProcessingError: null,
        s3Connection:
          action.connector === "Amazon S3"
            ? state.s3Connection
            : clearS3Secrets(state.s3Connection),
        ...resetS3BrowserState(),
        error: null,
      };
    case "UPDATE_CONNECTION":
      return {
        ...state,
        connection: { ...state.connection, [action.field]: action.value },
        connectionStatus: "idle",
        source: state.source?.kind === "mysql" ? null : state.source,
        furthestProgress: Math.min(state.furthestProgress, 1),
        ...resetRunState(state),
        error: null,
      };
    case "UPDATE_S3_CONNECTION":
      return {
        ...state,
        s3Connection: { ...state.s3Connection, [action.field]: action.value },
        connectorJobStatus: state.ingestionJob
          ? state.connectorJobStatus
          : "idle",
        connectorError: state.ingestionJob ? state.connectorError : null,
        ...(state.ingestionJob ? {} : resetS3BrowserState()),
      };
    case "S3_BROWSE_START":
      return {
        ...state,
        s3BrowserStatus: action.status,
        s3BrowserError: null,
      };
    case "S3_PAGE_READY":
      return {
        ...state,
        s3BrowserStatus: action.status,
        s3Files: action.append
          ? [...state.s3Files, ...action.files]
          : action.files,
        s3NextToken: action.nextToken,
        selectedS3Keys: action.append ? state.selectedS3Keys : [],
        s3BrowserError: null,
      };
    case "S3_BROWSE_ERROR":
      return {
        ...state,
        s3BrowserStatus: "error",
        s3BrowserError: action.message,
      };
    case "S3_EDIT_CONNECTION":
      return {
        ...state,
        ...resetS3BrowserState(),
        connectorError: null,
      };
    case "S3_TOGGLE_KEY":
      return {
        ...state,
        selectedS3Keys: state.selectedS3Keys.includes(action.key)
          ? state.selectedS3Keys.filter((key) => key !== action.key)
          : [...state.selectedS3Keys, action.key],
      };
    case "S3_SET_SELECTION":
      return {
        ...state,
        selectedS3Keys: Array.from(new Set(action.keys)),
      };
    case "S3_CLEAR_SELECTION":
      return {
        ...state,
        selectedS3Keys: [],
      };
    case "UPDATE_SNOWFLAKE_CONNECTION":
      return {
        ...state,
        snowflakeConnection: {
          ...state.snowflakeConnection,
          [action.field]: action.value,
        },
        connectorJobStatus: state.ingestionJob
          ? state.connectorJobStatus
          : "idle",
        connectorError: state.ingestionJob ? state.connectorError : null,
      };
    case "CONNECTOR_SUBMIT_START":
      return {
        ...state,
        connectorJobStatus: "submitting",
        ingestionJob: null,
        connectorError: null,
        processingBatch: null,
        documentProcessingStatus: "idle",
        documentProcessingResults: [],
        documentProcessingError: null,
        error: null,
      };
    case "CONNECTOR_JOB_ACCEPTED":
      return {
        ...state,
        connectorJobStatus: getConnectorJobUiStatus(action.job),
        ingestionJob: action.job,
        connectorError: null,
        s3Connection:
          action.job.datasource_type === "s3"
            ? clearS3Secrets(state.s3Connection)
            : state.s3Connection,
        snowflakeConnection:
          action.job.datasource_type === "snowflake"
            ? {
                ...state.snowflakeConnection,
                privateKey: "",
                privateKeyPassphrase: "",
              }
            : state.snowflakeConnection,
      };
    case "CONNECTOR_JOB_UPDATED":
      return {
        ...state,
        connectorJobStatus: getConnectorJobUiStatus(action.job),
        ingestionJob: action.job,
        connectorError: null,
      };
    case "CONNECTOR_FILES_DISCOVERY_START":
      return {
        ...state,
        connectorJobStatus: "discovering_files",
        connectorError: null,
      };
    case "CONNECTOR_FILES_READY":
      return {
        ...state,
        stage: "processing",
        furthestProgress: Math.max(state.furthestProgress, 2),
        connectorJobStatus: "completed",
        processingBatch: action.batch,
        documentProcessingStatus:
          action.batch.count === 0 ? "empty" : "polling",
        documentProcessingResults: action.batch.files.map((file) =>
          createPendingProcessingStatus(file.key),
        ),
        documentProcessingError: null,
        connectorError: null,
        error: null,
      };
    case "CONNECTOR_FILES_ERROR":
      return {
        ...state,
        connectorJobStatus: "files_error",
        connectorError: action.message,
      };
    case "CONNECTOR_SUBMIT_ERROR":
      return {
        ...state,
        connectorJobStatus: "failed",
        ingestionJob: null,
        connectorError: action.message,
      };
    case "CONNECTOR_STATUS_ERROR":
      return {
        ...state,
        connectorJobStatus: "status_error",
        connectorError: action.message,
      };
    case "CONNECTOR_RETRY_STATUS":
      return { ...state, connectorJobStatus: "polling", connectorError: null };
    case "CONNECTOR_NEW_IMPORT":
      return {
        ...state,
        connectorJobStatus: "idle",
        ingestionJob: null,
        connectorError: null,
        processingBatch: null,
        documentProcessingStatus: "idle",
        documentProcessingResults: [],
        documentProcessingError: null,
        ...resetS3BrowserState(),
      };
    case "TEST_START":
      return { ...state, connectionStatus: "loading", error: null };
    case "TEST_SUCCESS":
      return { ...state, connectionStatus: "verified", error: null };
    case "TEST_ERROR":
      return { ...state, connectionStatus: "error", error: action.message };
    case "SAVE_START":
      return { ...state, connectionStatus: "saving", error: null };
    case "SAVE_SUCCESS":
      return {
        ...state,
        connectionStatus: "saved",
        source: {
          kind: "mysql",
          connectionId: action.connectionId,
          connection: state.connection,
        },
        stage: "pipeline",
        furthestProgress: 2,
        ...resetRunState(state),
        error: null,
      };
    case "SAVE_ERROR":
      return { ...state, connectionStatus: "error", error: action.message };
    case "ADD_FILES": {
      const existingFiles = state.uploadStatus === "success" ? [] : state.files;
      const byId = new Map(existingFiles.map((file) => [file.id, file]));
      action.files.forEach((file) => byId.set(file.id, file));
      const files = Array.from(byId.values());
      return {
        ...state,
        files,
        selectedFileId:
          action.files[0]?.id ?? state.selectedFileId ?? files[0]?.id ?? null,
        source: { kind: "files", files },
        stage: "upload",
        furthestProgress: 1,
        uploadStatus: "idle",
        uploadResult: null,
        processingBatch: null,
        documentProcessingStatus: "idle",
        documentProcessingResults: [],
        documentProcessingError: null,
        ...resetRunState(state),
        error: null,
      };
    }
    case "FILE_SELECTION_ERROR":
      return { ...state, error: action.message };
    case "SELECT_FILE":
      return { ...state, selectedFileId: action.id };
    case "REMOVE_FILE": {
      if (state.uploadStatus === "loading" || state.uploadStatus === "success")
        return state;
      const removedIndex = state.files.findIndex(
        (file) => file.id === action.id,
      );
      if (removedIndex === -1) return state;
      const files = state.files.filter((file) => file.id !== action.id);
      const selectedFileId =
        state.selectedFileId === action.id
          ? (files[removedIndex]?.id ?? files[removedIndex - 1]?.id ?? null)
          : state.selectedFileId;
      return {
        ...state,
        files,
        selectedFileId,
        source: files.length ? { kind: "files", files } : null,
        uploadStatus: "idle",
        uploadResult: null,
        processingBatch: null,
        documentProcessingStatus: "idle",
        documentProcessingResults: [],
        documentProcessingError: null,
        ...resetRunState(state),
        error: null,
      };
    }
    case "UPLOAD_START":
      return {
        ...state,
        stage: "upload",
        uploadStatus: "loading",
        uploadResult: null,
        processingBatch: null,
        error: null,
      };
    case "UPLOAD_SUCCESS": {
      const processingBatch = createUploadProcessingBatch(action.result);
      return {
        ...state,
        stage: "processing",
        furthestProgress: Math.max(state.furthestProgress, 2),
        uploadStatus: "success",
        uploadResult: action.result,
        processingBatch,
        documentProcessingStatus:
          processingBatch.count === 0 ? "empty" : "polling",
        documentProcessingResults: processingBatch.files.map((file) =>
          createPendingProcessingStatus(file.key),
        ),
        documentProcessingError: null,
        error: null,
      };
    }
    case "UPLOAD_ERROR":
      return {
        ...state,
        stage: "upload",
        uploadStatus: "error",
        uploadResult: null,
        error: action.message,
      };
    case "DOCUMENT_PROCESSING_UPDATED":
      return {
        ...state,
        documentProcessingStatus: getDocumentProcessingUiStatus(action.results),
        documentProcessingResults: action.results,
        documentProcessingError: null,
      };
    case "DOCUMENT_PROCESSING_STATUS_ERROR":
      return {
        ...state,
        documentProcessingStatus: "status_error",
        documentProcessingError: action.message,
      };
    case "DOCUMENT_PROCESSING_RETRY":
      return {
        ...state,
        stage: "processing",
        documentProcessingStatus: "polling",
        documentProcessingError: null,
      };
    case "PIPELINE_START":
      return {
        ...state,
        stage: "pipeline",
        pipelineStatus: "loading",
        tasks: initialTasks,
        furthestProgress: Math.max(state.furthestProgress, 2),
        error: null,
      };
    case "TASK_RUNNING":
      return { ...state, tasks: updateTask(state.tasks, action.id, "running") };
    case "TASK_COMPLETE":
      return {
        ...state,
        tasks: updateTask(state.tasks, action.id, "complete"),
      };
    case "TASK_ERROR":
      return {
        ...state,
        pipelineStatus:
          action.id === "source-intake" ||
          action.id === "normalize" ||
          action.id === "profile"
            ? "error"
            : state.pipelineStatus,
        meaningStatus: action.id === "meaning" ? "ready" : state.meaningStatus,
        indexStatus: action.id === "index" ? "idle" : state.indexStatus,
        tasks: updateTask(state.tasks, action.id, "error"),
        error: action.message,
      };
    case "PIPELINE_SUCCESS":
      return { ...state, pipelineStatus: "success", error: null };
    case "OPEN_PROFILE":
      return {
        ...state,
        stage: "profile",
        furthestProgress: Math.max(state.furthestProgress, 3),
        error: null,
      };
    case "MEANING_START":
      return {
        ...state,
        stage: "meaning",
        meaningStatus: "extracting",
        tasks: updateTask(state.tasks, "meaning", "running"),
        furthestProgress: Math.max(state.furthestProgress, 4),
        error: null,
      };
    case "MEANING_READY":
      return {
        ...state,
        meaningStatus: "ready",
        tasks: updateTask(state.tasks, "meaning", "complete"),
        error: null,
      };
    case "REVISION_START":
      return { ...state, meaningStatus: "revising", error: null };
    case "REVISION_READY":
      return {
        ...state,
        meaningStatus: "ready",
        revisionCount: state.revisionCount + 1,
        error: null,
      };
    case "INDEX_START":
      return {
        ...state,
        stage: "index",
        meaningStatus: "approved",
        indexStatus: "building",
        tasks: updateTask(state.tasks, "index", "running"),
        furthestProgress: 5,
        error: null,
      };
    case "INDEX_READY":
      return {
        ...state,
        indexStatus: "ready",
        tasks: updateTask(state.tasks, "index", "complete"),
        error: null,
      };
    case "SEARCH_QUERY":
      return { ...state, searchQuery: action.query };
    case "SEARCH_START":
      return { ...state, searchStatus: "loading", error: null };
    case "SEARCH_SUCCESS":
      return {
        ...state,
        searchStatus: "success",
        completedSearchQuery: action.query,
        error: null,
      };
    case "SEARCH_ERROR":
      return { ...state, searchStatus: "error", error: action.message };
    case "NAVIGATE":
      return {
        ...state,
        stage: action.stage,
        ...(state.stage === "s3" && action.stage !== "s3"
          ? {
              s3Connection: clearS3Secrets(state.s3Connection),
              ...resetS3BrowserState(),
            }
          : {}),
        error: null,
      };
    default:
      return state;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mapFiles(files: FileList | File[]) {
  const accepted: IngestionFile[] = [];
  const rejected: string[] = [];
  Array.from(files).forEach((file) => {
    const rawExtension = file.name.includes(".")
      ? (file.name.split(".").pop()?.toLowerCase() ?? "")
      : "";
    if (
      !SUPPORTED_UPLOAD_EXTENSIONS.includes(
        rawExtension as (typeof SUPPORTED_UPLOAD_EXTENSIONS)[number],
      )
    ) {
      rejected.push(file.name);
      return;
    }
    const extension = file.name.includes(".")
      ? (file.name.split(".").pop()?.toUpperCase() ?? "FILE")
      : "FILE";
    accepted.push({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      name: file.name,
      extension: extension === "MARKDOWN" ? "MD" : extension,
      sizeLabel: formatFileSize(file.size),
    });
  });
  return { accepted, rejected };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function waitForNextStatusCheck(signal: AbortSignal) {
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

function waitForNextDocumentProcessingCheck(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 5000);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(
          new DOMException(
            "The document processing status check was cancelled.",
            "AbortError",
          ),
        );
      },
      { once: true },
    );
  });
}

function optionalString(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function optionalPositiveInteger(value: string) {
  const normalized = value.trim();
  return normalized ? Number(normalized) : null;
}

function getS3Credentials(connection: S3Connection): S3Credentials {
  return {
    aws_access_key_id: connection.accessKeyId.trim(),
    aws_secret_access_key: connection.secretAccessKey,
    aws_region: connection.region.trim(),
    aws_bucket_name: connection.bucketName.trim(),
  };
}

function assertUniqueS3Files(existingFiles: S3File[], incomingFiles: S3File[]) {
  const keys = new Set(existingFiles.map((file) => file.key));
  for (const file of incomingFiles) {
    if (keys.has(file.key)) {
      throw new Error(
        `S3 file discovery returned a duplicate object key: ${file.key}`,
      );
    }
    keys.add(file.key);
  }
}

export function useIngestionWorkflow(
  organizationId: string,
  workspaceId: string,
  launchContext: IngestionLaunchContext = defaultLaunchContext,
) {
  const initialProfile = useMemo(() => {
    if (!launchContext.profileId) return null;
    const profile =
      readDataSourceProfiles(organizationId).find(
        (item) => item.id === launchContext.profileId,
      ) ?? null;
    return profile &&
      (!launchContext.connector || profile.type === launchContext.connector)
      ? profile
      : null;
  }, [launchContext.connector, launchContext.profileId, organizationId]);
  const [state, dispatch] = useReducer(
    reducer,
    createLaunchedState(initialProfile, launchContext.connector),
  );
  const [activeProfile, setActiveProfile] = useState(initialProfile);
  const [profileName, setProfileName] = useState(initialProfile?.name ?? "");
  const [profileError, setProfileError] = useState<string | null>(
    launchContext.profileId && !initialProfile
      ? "The requested saved source is unavailable. Enter connection details or save a new source."
      : null,
  );
  const requestRef = useRef<AbortController | null>(null);

  const currentProfileType: DataSourceProfileType | null =
    state.stage === "s3"
      ? "s3"
      : state.stage === "snowflake"
        ? "snowflake"
        : (activeProfile?.type ?? null);
  const currentSavedConfig =
    currentProfileType === "s3"
      ? getS3SavedConfig(state.s3Connection)
      : currentProfileType === "snowflake"
        ? getSnowflakeSavedConfig(state.snowflakeConnection)
        : null;
  const profileDirty = Boolean(
    activeProfile &&
    currentSavedConfig &&
    (activeProfile.name !== profileName.trim() ||
      JSON.stringify(activeProfile.config) !==
        JSON.stringify(currentSavedConfig)),
  );

  const saveCurrentProfile = useCallback(async () => {
    if (!currentProfileType || !currentSavedConfig) return;
    try {
      const backendProfile =
        currentProfileType === "s3"
          ? activeProfile?.backendDatasourceId
            ? await updateDatasourceProfile({
                datasourceId: activeProfile.backendDatasourceId,
                name: profileName,
                connectorConfig: {
                  region: state.s3Connection.region.trim(),
                  bucket_name: state.s3Connection.bucketName.trim(),
                },
                credentials: {
                  aws_access_key_id: state.s3Connection.accessKeyId.trim(),
                  aws_secret_access_key: state.s3Connection.secretAccessKey,
                },
              })
            : await createDatasourceProfile({
                workspaceId,
                name: profileName,
                datasourceType: "s3",
                connectorConfig: {
                  region: state.s3Connection.region.trim(),
                  bucket_name: state.s3Connection.bucketName.trim(),
                },
                credentials: {
                  aws_access_key_id: state.s3Connection.accessKeyId.trim(),
                  aws_secret_access_key: state.s3Connection.secretAccessKey,
                },
              })
          : activeProfile?.backendDatasourceId
            ? await updateDatasourceProfile({
                datasourceId: activeProfile.backendDatasourceId,
                name: profileName,
                connectorConfig: {
                  account: state.snowflakeConnection.account.trim(),
                  user: state.snowflakeConnection.user.trim(),
                  warehouse: optionalString(
                    state.snowflakeConnection.warehouse,
                  ),
                  database: optionalString(state.snowflakeConnection.database),
                  schema: optionalString(state.snowflakeConnection.schema),
                  role: optionalString(state.snowflakeConnection.role),
                },
                credentials: {
                  private_key: state.snowflakeConnection.privateKey,
                  private_key_passphrase: optionalString(
                    state.snowflakeConnection.privateKeyPassphrase,
                  ),
                },
              })
            : await createDatasourceProfile({
                workspaceId,
                name: profileName,
                datasourceType: "snowflake",
                connectorConfig: {
                  account: state.snowflakeConnection.account.trim(),
                  user: state.snowflakeConnection.user.trim(),
                  warehouse: optionalString(
                    state.snowflakeConnection.warehouse,
                  ),
                  database: optionalString(state.snowflakeConnection.database),
                  schema: optionalString(state.snowflakeConnection.schema),
                  role: optionalString(state.snowflakeConnection.role),
                },
                credentials: {
                  private_key: state.snowflakeConnection.privateKey,
                  private_key_passphrase: optionalString(
                    state.snowflakeConnection.privateKeyPassphrase,
                  ),
                },
              });
      let profile = saveDataSourceProfile(
        {
          organizationId,
          type: currentProfileType,
          name: profileName,
          config: currentSavedConfig,
        },
        activeProfile?.id,
      );
      if (profile.backendDatasourceId !== backendProfile.datasource_id) {
        profile = setBackendDatasourceId(
          organizationId,
          profile.id,
          backendProfile.datasource_id,
        );
      }
      setActiveProfile(profile);
      setProfileName(profile.name);
      setProfileError(null);
    } catch (error) {
      setProfileError(getErrorMessage(error, "Unable to save this source."));
    }
  }, [
    activeProfile?.id,
    activeProfile?.backendDatasourceId,
    currentProfileType,
    currentSavedConfig,
    organizationId,
    profileName,
    state.s3Connection,
    state.snowflakeConnection,
    workspaceId,
  ]);

  const linkAcceptedJob = useCallback(
    (job: IngestionJobResponse) => {
      if (
        !activeProfile ||
        profileDirty ||
        activeProfile.type !== job.datasource_type
      )
        return;
      try {
        const profile = linkJobToDataSourceProfile(
          organizationId,
          activeProfile.id,
          job.job_id,
          job.datasource_id,
        );
        setActiveProfile(profile);
        setProfileError(null);
      } catch (error) {
        setProfileError(
          getErrorMessage(
            error,
            "The import started, but its saved source link could not be updated.",
          ),
        );
      }
    },
    [activeProfile, organizationId, profileDirty],
  );

  const beginRequest = useCallback(() => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    return controller.signal;
  }, []);

  useEffect(() => () => requestRef.current?.abort(), []);

  const openSource = useCallback(() => {
    requestRef.current?.abort();
    dispatch({ type: "OPEN_SOURCE" });
  }, []);
  const openCatalog = useCallback(() => {
    requestRef.current?.abort();
    dispatch({ type: "OPEN_CATALOG" });
  }, []);
  const selectConnector = useCallback(
    (connector: string) => {
      requestRef.current?.abort();
      const nextType =
        connector === "Amazon S3"
          ? "s3"
          : connector === "Snowflake"
            ? "snowflake"
            : null;
      if (activeProfile && nextType !== activeProfile.type) {
        setActiveProfile(null);
        setProfileName("");
        setProfileError(null);
      }
      dispatch({ type: "SELECT_CONNECTOR", connector });
    },
    [activeProfile],
  );
  const updateConnection = useCallback(
    (field: keyof MySqlConnection, value: string | boolean) =>
      dispatch({ type: "UPDATE_CONNECTION", field, value }),
    [],
  );
  const updateS3Connection = useCallback(
    (field: keyof S3Connection, value: string) =>
      dispatch({ type: "UPDATE_S3_CONNECTION", field, value }),
    [],
  );
  const updateSnowflakeConnection = useCallback(
    (field: keyof SnowflakeConnection, value: string | boolean) =>
      dispatch({ type: "UPDATE_SNOWFLAKE_CONNECTION", field, value }),
    [],
  );
  const listS3Page = useCallback(
    (nextToken: string | null, signal: AbortSignal) => {
      if (activeProfile?.backendDatasourceId && !profileDirty) {
        return listSavedS3Files(
          activeProfile.backendDatasourceId,
          1000,
          nextToken,
          signal,
        );
      }
      return listS3Files(
        workspaceId,
        getS3Credentials(state.s3Connection),
        1000,
        nextToken,
        signal,
      );
    },
    [
      activeProfile?.backendDatasourceId,
      profileDirty,
      state.s3Connection,
      workspaceId,
    ],
  );
  const browseS3Files = useCallback(async () => {
    if (
      state.s3BrowserStatus === "loading" ||
      state.s3BrowserStatus === "loading_more" ||
      state.s3BrowserStatus === "loading_all" ||
      state.ingestionJob
    )
      return;

    const signal = beginRequest();
    dispatch({ type: "S3_BROWSE_START", status: "loading" });
    try {
      const result = await listS3Page(null, signal);
      assertUniqueS3Files([], result.files);
      dispatch({
        type: "S3_PAGE_READY",
        files: result.files,
        nextToken: result.nextToken?.trim() || null,
        append: false,
        status: "ready",
      });
    } catch (error) {
      if (!isAbortError(error)) {
        dispatch({
          type: "S3_BROWSE_ERROR",
          message: getErrorMessage(
            error,
            "Unable to list files in this S3 bucket.",
          ),
        });
      }
    }
  }, [beginRequest, listS3Page, state.ingestionJob, state.s3BrowserStatus]);

  const loadMoreS3Files = useCallback(async () => {
    if (
      !state.s3NextToken ||
      state.s3BrowserStatus === "loading" ||
      state.s3BrowserStatus === "loading_more" ||
      state.s3BrowserStatus === "loading_all"
    )
      return;

    const signal = beginRequest();
    const requestedToken = state.s3NextToken;
    dispatch({ type: "S3_BROWSE_START", status: "loading_more" });
    try {
      const result = await listS3Page(requestedToken, signal);
      assertUniqueS3Files(state.s3Files, result.files);
      const nextToken = result.nextToken?.trim() || null;
      if (nextToken === requestedToken) {
        throw new Error(
          "S3 file discovery returned the same continuation token twice.",
        );
      }
      dispatch({
        type: "S3_PAGE_READY",
        files: result.files,
        nextToken,
        append: true,
        status: "ready",
      });
    } catch (error) {
      if (!isAbortError(error)) {
        dispatch({
          type: "S3_BROWSE_ERROR",
          message: getErrorMessage(error, "Unable to load more S3 files."),
        });
      }
    }
  }, [
    beginRequest,
    listS3Page,
    state.s3BrowserStatus,
    state.s3Files,
    state.s3NextToken,
  ]);

  const loadAllS3Files = useCallback(async () => {
    if (
      !state.s3NextToken ||
      state.s3BrowserStatus === "loading" ||
      state.s3BrowserStatus === "loading_more" ||
      state.s3BrowserStatus === "loading_all"
    )
      return;

    const signal = beginRequest();
    const loadedFiles = [...state.s3Files];
    const seenTokens = new Set<string>();
    let nextToken: string | null = state.s3NextToken;
    dispatch({ type: "S3_BROWSE_START", status: "loading_all" });
    try {
      while (nextToken && !signal.aborted) {
        if (seenTokens.has(nextToken)) {
          throw new Error(
            "S3 file discovery returned a repeated continuation token.",
          );
        }
        seenTokens.add(nextToken);
        const result = await listS3Page(nextToken, signal);
        assertUniqueS3Files(loadedFiles, result.files);
        loadedFiles.push(...result.files);
        const followingToken = result.nextToken?.trim() || null;
        if (followingToken && seenTokens.has(followingToken)) {
          throw new Error(
            "S3 file discovery returned a repeated continuation token.",
          );
        }
        dispatch({
          type: "S3_PAGE_READY",
          files: result.files,
          nextToken: followingToken,
          append: true,
          status: followingToken ? "loading_all" : "ready",
        });
        nextToken = followingToken;
      }
    } catch (error) {
      if (!isAbortError(error)) {
        dispatch({
          type: "S3_BROWSE_ERROR",
          message: getErrorMessage(error, "Unable to load every S3 file."),
        });
      }
    }
  }, [
    beginRequest,
    listS3Page,
    state.s3BrowserStatus,
    state.s3Files,
    state.s3NextToken,
  ]);

  const retryS3Browser = useCallback(() => {
    if (state.s3Files.length > 0 && state.s3NextToken) {
      void loadMoreS3Files();
      return;
    }
    void browseS3Files();
  }, [browseS3Files, loadMoreS3Files, state.s3Files.length, state.s3NextToken]);

  const editS3Connection = useCallback(() => {
    requestRef.current?.abort();
    dispatch({ type: "S3_EDIT_CONNECTION" });
  }, []);

  const toggleS3Key = useCallback((key: string) => {
    dispatch({ type: "S3_TOGGLE_KEY", key });
  }, []);
  const setSelectedS3Keys = useCallback((keys: string[]) => {
    dispatch({ type: "S3_SET_SELECTION", keys });
  }, []);
  const clearSelectedS3Keys = useCallback(() => {
    dispatch({ type: "S3_CLEAR_SELECTION" });
  }, []);
  const addFiles = useCallback((files: FileList | File[]) => {
    const mapped = mapFiles(files);
    if (mapped.accepted.length) {
      requestRef.current?.abort();
      dispatch({ type: "ADD_FILES", files: mapped.accepted });
    }
    if (mapped.rejected.length) {
      dispatch({
        type: "FILE_SELECTION_ERROR",
        message: `Unsupported file${mapped.rejected.length === 1 ? "" : "s"}: ${mapped.rejected.join(", ")}.`,
      });
    }
  }, []);
  const selectFile = useCallback(
    (id: string) => dispatch({ type: "SELECT_FILE", id }),
    [],
  );
  const removeFile = useCallback(
    (id: string) => dispatch({ type: "REMOVE_FILE", id }),
    [],
  );

  const monitorDocumentProcessing = useCallback(
    async (
      batch: DocumentProcessingBatch,
      signal: AbortSignal,
      initialResults: DocumentProcessingStatus[] = [],
    ) => {
      const resultsByKey = new Map(
        initialResults.map((result) => [result.object_key, result]),
      );
      try {
        while (!signal.aborted) {
          const objectKeys = batch.files
            .map((file) => file.key)
            .filter(
              (key) => !isTerminalProcessingStatus(resultsByKey.get(key)),
            );
          if (objectKeys.length === 0) return;

          const refreshedResults = await getDocumentProcessingStatuses(
            batch.organization_id,
            batch.workspace_id,
            batch.bucket,
            objectKeys,
            signal,
          );
          refreshedResults.forEach((result) =>
            resultsByKey.set(result.object_key, result),
          );
          const results = batch.files.map(
            (file) =>
              resultsByKey.get(file.key) ??
              createPendingProcessingStatus(file.key),
          );
          dispatch({ type: "DOCUMENT_PROCESSING_UPDATED", results });
          if (getDocumentProcessingUiStatus(results) !== "polling") return;
          await waitForNextDocumentProcessingCheck(signal);
        }
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "DOCUMENT_PROCESSING_STATUS_ERROR",
            message: getErrorMessage(
              error,
              "Unable to refresh document processing status.",
            ),
          });
        }
      }
    },
    [],
  );

  const prepareConnectorProcessing = useCallback(
    async (job: IngestionJobResponse, signal: AbortSignal) => {
      dispatch({ type: "CONNECTOR_FILES_DISCOVERY_START" });
      try {
        const filesResult = await getAllFilesForJob(job.job_id, signal);
        if (filesResult.count !== job.objects_written) {
          throw new Error(
            `The ingestion job stored ${job.objects_written} objects, but ${filesResult.count} files were available for indexing.`,
          );
        }
        const batch = createConnectorProcessingBatch(job, filesResult);
        dispatch({ type: "CONNECTOR_FILES_READY", batch });
        if (batch.count > 0) void monitorDocumentProcessing(batch, signal);
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({
            type: "CONNECTOR_FILES_ERROR",
            message: getErrorMessage(
              error,
              "Unable to prepare imported objects for indexing.",
            ),
          });
        }
      }
    },
    [monitorDocumentProcessing],
  );

  const monitorIngestionJob = useCallback(
    async (jobId: string, signal: AbortSignal, immediately = false) => {
      try {
        if (!immediately) await waitForNextStatusCheck(signal);
        while (!signal.aborted) {
          const job = await getIngestionJob(jobId, signal);
          dispatch({ type: "CONNECTOR_JOB_UPDATED", job });
          if (job.status === "completed") {
            await prepareConnectorProcessing(job, signal);
            return;
          }
          if (job.status === "failed") return;
          await waitForNextStatusCheck(signal);
        }
      } catch (error) {
        if (!isAbortError(error))
          dispatch({
            type: "CONNECTOR_STATUS_ERROR",
            message: getErrorMessage(
              error,
              "Unable to refresh the import status.",
            ),
          });
      }
    },
    [prepareConnectorProcessing],
  );

  const submitS3Import = useCallback(async () => {
    if (
      !state.selectedS3Keys.length ||
      state.connectorJobStatus === "submitting" ||
      state.connectorJobStatus === "polling" ||
      state.ingestionJob
    )
      return;
    const signal = beginRequest();
    dispatch({ type: "CONNECTOR_SUBMIT_START" });
    try {
      const job =
        activeProfile?.backendDatasourceId && !profileDirty
          ? await startSavedDatasourceIngestion({
              datasourceId: activeProfile.backendDatasourceId,
              options: { s3Keys: state.selectedS3Keys },
              signal,
            })
          : await createS3IngestionJob(
              {
                organization_id: organizationId,
                workspace_id: workspaceId,
                ...(profileName.trim() ? { name: profileName.trim() } : {}),
                credentials: getS3Credentials(state.s3Connection),
                keys: state.selectedS3Keys,
              },
              signal,
            );
      dispatch({ type: "CONNECTOR_JOB_ACCEPTED", job });
      linkAcceptedJob(job);
      if (job.status === "completed") {
        await prepareConnectorProcessing(job, signal);
      } else if (job.status !== "failed") {
        void monitorIngestionJob(job.job_id, signal);
      }
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "CONNECTOR_SUBMIT_ERROR",
          message: getErrorMessage(
            error,
            "Unable to create the S3 import job.",
          ),
        });
    }
  }, [
    beginRequest,
    activeProfile?.backendDatasourceId,
    linkAcceptedJob,
    monitorIngestionJob,
    organizationId,
    profileDirty,
    prepareConnectorProcessing,
    profileName,
    state.connectorJobStatus,
    state.ingestionJob,
    state.s3Connection,
    state.selectedS3Keys,
    workspaceId,
  ]);

  const submitSnowflakeImport = useCallback(async () => {
    if (
      state.connectorJobStatus === "submitting" ||
      state.connectorJobStatus === "polling" ||
      state.ingestionJob
    )
      return;
    const signal = beginRequest();
    dispatch({ type: "CONNECTOR_SUBMIT_START" });
    try {
      const job =
        activeProfile?.backendDatasourceId && !profileDirty
          ? await startSavedDatasourceIngestion({
              datasourceId: activeProfile.backendDatasourceId,
              options: {
                discoverTables: state.snowflakeConnection.discoverTables,
                discoverStages: state.snowflakeConnection.discoverStages,
                stagePattern: optionalString(
                  state.snowflakeConnection.stagePattern,
                ),
                tableLimit: optionalPositiveInteger(
                  state.snowflakeConnection.tableLimit,
                ),
                stageLimit: optionalPositiveInteger(
                  state.snowflakeConnection.stageLimit,
                ),
              },
              signal,
            })
          : await createIngestionJob(
              {
                organization_id: organizationId,
                workspace_id: workspaceId,
                ...(profileName.trim() ? { name: profileName.trim() } : {}),
                datasource_type: "snowflake",
                credentials: {
                  account: state.snowflakeConnection.account.trim(),
                  user: state.snowflakeConnection.user.trim(),
                  private_key: state.snowflakeConnection.privateKey,
                  private_key_passphrase: optionalString(
                    state.snowflakeConnection.privateKeyPassphrase,
                  ),
                  warehouse: optionalString(
                    state.snowflakeConnection.warehouse,
                  ),
                  database: optionalString(state.snowflakeConnection.database),
                  schema: optionalString(state.snowflakeConnection.schema),
                  role: optionalString(state.snowflakeConnection.role),
                },
                discover_tables: state.snowflakeConnection.discoverTables,
                discover_stages: state.snowflakeConnection.discoverStages,
                stage_pattern: optionalString(
                  state.snowflakeConnection.stagePattern,
                ),
                table_limit: optionalPositiveInteger(
                  state.snowflakeConnection.tableLimit,
                ),
                stage_limit: optionalPositiveInteger(
                  state.snowflakeConnection.stageLimit,
                ),
              },
              signal,
            );
      dispatch({ type: "CONNECTOR_JOB_ACCEPTED", job });
      linkAcceptedJob(job);
      if (job.status === "completed") {
        await prepareConnectorProcessing(job, signal);
      } else if (job.status !== "failed") {
        void monitorIngestionJob(job.job_id, signal);
      }
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "CONNECTOR_SUBMIT_ERROR",
          message: getErrorMessage(
            error,
            "Unable to create the Snowflake import job.",
          ),
        });
    }
  }, [
    beginRequest,
    activeProfile?.backendDatasourceId,
    linkAcceptedJob,
    monitorIngestionJob,
    organizationId,
    profileDirty,
    prepareConnectorProcessing,
    profileName,
    state.connectorJobStatus,
    state.ingestionJob,
    state.snowflakeConnection,
    workspaceId,
  ]);

  const retryIngestionStatus = useCallback(async () => {
    if (!state.ingestionJob) return;
    const signal = beginRequest();
    dispatch({ type: "CONNECTOR_RETRY_STATUS" });
    await monitorIngestionJob(state.ingestionJob.job_id, signal, true);
  }, [beginRequest, monitorIngestionJob, state.ingestionJob]);

  const retryConnectorFileDiscovery = useCallback(async () => {
    if (!state.ingestionJob || state.ingestionJob.status !== "completed")
      return;
    const signal = beginRequest();
    await prepareConnectorProcessing(state.ingestionJob, signal);
  }, [beginRequest, prepareConnectorProcessing, state.ingestionJob]);

  const startNewConnectorImport = useCallback(() => {
    requestRef.current?.abort();
    dispatch({ type: "CONNECTOR_NEW_IMPORT" });
  }, []);

  const uploadSelectedFiles = useCallback(async () => {
    if (
      !state.files.length ||
      state.uploadStatus === "loading" ||
      state.uploadStatus === "success"
    )
      return;
    const signal = beginRequest();
    dispatch({ type: "UPLOAD_START" });
    try {
      const result = await uploadFiles(
        organizationId,
        workspaceId,
        state.files.map((file) => file.file),
        signal,
      );
      dispatch({ type: "UPLOAD_SUCCESS", result });
      const batch = createUploadProcessingBatch(result);
      if (batch.count > 0) void monitorDocumentProcessing(batch, signal);
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "UPLOAD_ERROR",
          message: getErrorMessage(
            error,
            "Unable to upload the selected files.",
          ),
        });
    }
  }, [
    beginRequest,
    monitorDocumentProcessing,
    organizationId,
    state.files,
    state.uploadStatus,
    workspaceId,
  ]);

  const retryDocumentProcessingStatus = useCallback(async () => {
    if (
      !state.processingBatch ||
      state.documentProcessingStatus === "polling" ||
      state.documentProcessingStatus === "empty"
    )
      return;
    const signal = beginRequest();
    dispatch({ type: "DOCUMENT_PROCESSING_RETRY" });
    await monitorDocumentProcessing(
      state.processingBatch,
      signal,
      state.documentProcessingResults,
    );
  }, [
    beginRequest,
    monitorDocumentProcessing,
    state.documentProcessingResults,
    state.documentProcessingStatus,
    state.processingBatch,
  ]);

  const testConnection = useCallback(async () => {
    const signal = beginRequest();
    dispatch({ type: "TEST_START" });
    try {
      await testMySqlConnection(state.connection, signal);
      dispatch({ type: "TEST_SUCCESS" });
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "TEST_ERROR",
          message: getErrorMessage(error, "Unable to test the connection."),
        });
    }
  }, [beginRequest, state.connection]);

  const persistConnection = useCallback(async () => {
    if (state.connectionStatus !== "verified") return;
    const signal = beginRequest();
    dispatch({ type: "SAVE_START" });
    try {
      const result = await saveConnection(state.connection, signal);
      dispatch({ type: "SAVE_SUCCESS", connectionId: result.connectionId });
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "SAVE_ERROR",
          message: getErrorMessage(error, "Unable to save the connection."),
        });
    }
  }, [beginRequest, state.connection, state.connectionStatus]);

  const startPipeline = useCallback(async () => {
    if (!state.source || state.pipelineStatus === "loading") return;
    const signal = beginRequest();
    const taskIds: PipelineTaskId[] = ["source-intake", "normalize", "profile"];
    dispatch({ type: "PIPELINE_START" });
    for (const id of taskIds) {
      dispatch({ type: "TASK_RUNNING", id });
      try {
        await runPipelineTask(id, signal);
        dispatch({ type: "TASK_COMPLETE", id });
      } catch (error) {
        if (!isAbortError(error))
          dispatch({
            type: "TASK_ERROR",
            id,
            message: getErrorMessage(error, "The pipeline could not complete."),
          });
        return;
      }
    }
    dispatch({ type: "PIPELINE_SUCCESS" });
  }, [beginRequest, state.pipelineStatus, state.source]);

  const openProfile = useCallback(() => dispatch({ type: "OPEN_PROFILE" }), []);

  const startMeaning = useCallback(async () => {
    const signal = beginRequest();
    dispatch({ type: "MEANING_START" });
    try {
      await extractMeaning(signal);
      dispatch({ type: "MEANING_READY" });
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "TASK_ERROR",
          id: "meaning",
          message: getErrorMessage(error, "Meaning extraction failed."),
        });
    }
  }, [beginRequest]);

  const requestRevision = useCallback(async () => {
    const signal = beginRequest();
    dispatch({ type: "REVISION_START" });
    try {
      await reviseMeaning(signal);
      dispatch({ type: "REVISION_READY" });
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "TASK_ERROR",
          id: "meaning",
          message: getErrorMessage(error, "Unable to revise semantic hints."),
        });
    }
  }, [beginRequest]);

  const approveMeaning = useCallback(async () => {
    const signal = beginRequest();
    dispatch({ type: "INDEX_START" });
    try {
      await buildSearchIndex(signal);
      dispatch({ type: "INDEX_READY" });
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "TASK_ERROR",
          id: "index",
          message: getErrorMessage(error, "Unable to build the search index."),
        });
    }
  }, [beginRequest]);

  const setSearchQuery = useCallback(
    (query: string) => dispatch({ type: "SEARCH_QUERY", query }),
    [],
  );
  const search = useCallback(async () => {
    if (!state.searchQuery.trim()) return;
    const signal = beginRequest();
    dispatch({ type: "SEARCH_START" });
    try {
      const result = await searchIndexedEvidence(state.searchQuery, signal);
      dispatch({ type: "SEARCH_SUCCESS", query: result.query });
    } catch (error) {
      if (!isAbortError(error))
        dispatch({
          type: "SEARCH_ERROR",
          message: getErrorMessage(error, "Search is temporarily unavailable."),
        });
    }
  }, [beginRequest, state.searchQuery]);

  const navigateProgress = useCallback(
    (progress: ProgressStage) => {
      const busy =
        state.uploadStatus === "loading" ||
        state.s3BrowserStatus === "loading" ||
        state.s3BrowserStatus === "loading_more" ||
        state.s3BrowserStatus === "loading_all" ||
        state.connectorJobStatus === "submitting" ||
        state.connectorJobStatus === "polling" ||
        state.connectorJobStatus === "discovering_files" ||
        state.pipelineStatus === "loading" ||
        state.meaningStatus === "extracting" ||
        state.meaningStatus === "revising" ||
        state.indexStatus === "building" ||
        state.connectionStatus === "loading" ||
        state.connectionStatus === "saving" ||
        state.searchStatus === "loading";
      if (busy) return;
      const targetIndex = [
        "source",
        "transfer",
        "pipeline",
        "profile",
        "meaning",
        "index",
      ].indexOf(progress);
      if (targetIndex > state.furthestProgress) return;
      const stage: IngestionStage =
        progress === "transfer"
          ? ["upload", "mysql", "s3", "snowflake"].includes(state.stage)
            ? state.stage
            : state.processingBatch?.source_kind === "s3"
              ? "s3"
              : state.processingBatch?.source_kind === "snowflake"
                ? "snowflake"
                : state.source?.kind === "files"
                  ? "upload"
                  : state.source?.kind === "mysql"
                    ? "mysql"
                    : "catalog"
          : progress === "pipeline" && state.processingBatch
            ? "processing"
            : progress;
      dispatch({ type: "NAVIGATE", stage });
    },
    [
      state.connectionStatus,
      state.connectorJobStatus,
      state.furthestProgress,
      state.indexStatus,
      state.meaningStatus,
      state.pipelineStatus,
      state.processingBatch,
      state.s3BrowserStatus,
      state.searchStatus,
      state.source,
      state.stage,
      state.uploadStatus,
    ],
  );

  return {
    ...state,
    organizationId,
    activeProfile,
    profileName,
    profileDirty,
    profileError,
    setProfileName,
    saveCurrentProfile,
    openSource,
    openCatalog,
    selectConnector,
    updateConnection,
    updateS3Connection,
    browseS3Files,
    loadMoreS3Files,
    loadAllS3Files,
    retryS3Browser,
    editS3Connection,
    toggleS3Key,
    setSelectedS3Keys,
    clearSelectedS3Keys,
    updateSnowflakeConnection,
    submitS3Import,
    submitSnowflakeImport,
    retryIngestionStatus,
    retryConnectorFileDiscovery,
    startNewConnectorImport,
    addFiles,
    selectFile,
    removeFile,
    uploadSelectedFiles,
    retryDocumentProcessingStatus,
    testConnection,
    persistConnection,
    startPipeline,
    openProfile,
    startMeaning,
    requestRevision,
    approveMeaning,
    setSearchQuery,
    search,
    navigateProgress,
  };
}
