import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  buildSearchIndex,
  createIngestionJob,
  extractMeaning,
  getDocumentProcessingStatuses,
  getIngestionJob,
  reviseMeaning,
  runPipelineTask,
  saveConnection,
  searchIndexedEvidence,
  testMySqlConnection,
  uploadFiles,
} from '../api/ingestionApi'
import type { DocumentProcessingStatus, IngestionJobResponse, UploadFilesResponse } from '../api/ingestionApi'
import type {
  AsyncStatus,
  ConnectorJobUiStatus,
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
  S3Connection,
  SnowflakeConnection,
} from './types'

const initialConnection: MySqlConnection = {
  host: 'mysql.company.internal',
  port: '3306',
  database: 'analytics',
  schema: 'public',
  username: 'axiom_readonly',
  password: 'readonly',
  sslMode: 'Require',
  encrypted: true,
}

const initialS3Connection: S3Connection = {
  accessKeyId: '',
  secretAccessKey: '',
  region: 'ap-southeast-1',
  bucketName: '',
}

const initialSnowflakeConnection: SnowflakeConnection = {
  account: '',
  user: '',
  privateKey: '',
  privateKeyPassphrase: '',
  warehouse: '',
  database: '',
  schema: '',
  role: '',
  discoverTables: true,
  discoverStages: true,
  stagePattern: '',
  tableLimit: '',
  stageLimit: '',
}

const initialTasks: PipelineTask[] = [
  { id: 'source-intake', title: 'Source intake', description: 'Import source manifests and preserve original checksums.', status: 'queued' },
  { id: 'normalize', title: 'Normalize content', description: 'Convert source records and documents into a common format.', status: 'queued' },
  { id: 'profile', title: 'Profile structure', description: 'Detect fields, completeness, sensitive columns, and parse quality.', status: 'queued' },
  { id: 'meaning', title: 'Extract meaning', description: 'Infer concepts, join keys, entities, business terms, and governed claims.', status: 'queued' },
  { id: 'index', title: 'Build searchable index', description: 'Create retrieval-ready chunks with source maps and evidence IDs.', status: 'queued' },
]

type WorkflowState = {
  stage: IngestionStage
  furthestProgress: number
  selectedConnector: string
  connection: MySqlConnection
  connectionStatus: AsyncStatus | 'verified' | 'saving' | 'saved'
  s3Connection: S3Connection
  snowflakeConnection: SnowflakeConnection
  connectorJobStatus: ConnectorJobUiStatus
  ingestionJob: IngestionJobResponse | null
  connectorError: string | null
  source: IngestionSource | null
  files: IngestionFile[]
  selectedFileId: string | null
  uploadStatus: AsyncStatus
  uploadResult: UploadFilesResponse | null
  documentProcessingStatus: DocumentProcessingUiStatus
  documentProcessingResults: DocumentProcessingStatus[]
  documentProcessingError: string | null
  pipelineStatus: AsyncStatus
  tasks: PipelineTask[]
  meaningStatus: MeaningStatus
  indexStatus: IndexStatus
  searchStatus: AsyncStatus
  searchQuery: string
  completedSearchQuery: string
  revisionCount: number
  error: string | null
}

const initialState: WorkflowState = {
  stage: 'source',
  furthestProgress: 0,
  selectedConnector: '',
  connection: initialConnection,
  connectionStatus: 'idle',
  s3Connection: initialS3Connection,
  snowflakeConnection: initialSnowflakeConnection,
  connectorJobStatus: 'idle',
  ingestionJob: null,
  connectorError: null,
  source: null,
  files: [],
  selectedFileId: null,
  uploadStatus: 'idle',
  uploadResult: null,
  documentProcessingStatus: 'idle',
  documentProcessingResults: [],
  documentProcessingError: null,
  pipelineStatus: 'idle',
  tasks: initialTasks,
  meaningStatus: 'idle',
  indexStatus: 'idle',
  searchStatus: 'idle',
  searchQuery: 'customers missing email with revenue risk',
  completedSearchQuery: '',
  revisionCount: 0,
  error: null,
}

type Action =
  | { type: 'OPEN_SOURCE' }
  | { type: 'OPEN_CATALOG' }
  | { type: 'SELECT_CONNECTOR'; connector: string }
  | { type: 'UPDATE_CONNECTION'; field: keyof MySqlConnection; value: string | boolean }
  | { type: 'UPDATE_S3_CONNECTION'; field: keyof S3Connection; value: string }
  | { type: 'UPDATE_SNOWFLAKE_CONNECTION'; field: keyof SnowflakeConnection; value: string | boolean }
  | { type: 'CONNECTOR_SUBMIT_START' }
  | { type: 'CONNECTOR_JOB_ACCEPTED'; job: IngestionJobResponse }
  | { type: 'CONNECTOR_JOB_UPDATED'; job: IngestionJobResponse }
  | { type: 'CONNECTOR_SUBMIT_ERROR'; message: string }
  | { type: 'CONNECTOR_STATUS_ERROR'; message: string }
  | { type: 'CONNECTOR_RETRY_STATUS' }
  | { type: 'CONNECTOR_NEW_IMPORT' }
  | { type: 'TEST_START' }
  | { type: 'TEST_SUCCESS' }
  | { type: 'TEST_ERROR'; message: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; connectionId: string }
  | { type: 'SAVE_ERROR'; message: string }
  | { type: 'ADD_FILES'; files: IngestionFile[] }
  | { type: 'SELECT_FILE'; id: string }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_SUCCESS'; result: UploadFilesResponse }
  | { type: 'UPLOAD_ERROR'; message: string }
  | { type: 'DOCUMENT_PROCESSING_UPDATED'; results: DocumentProcessingStatus[] }
  | { type: 'DOCUMENT_PROCESSING_STATUS_ERROR'; message: string }
  | { type: 'DOCUMENT_PROCESSING_RETRY' }
  | { type: 'PIPELINE_START' }
  | { type: 'TASK_RUNNING'; id: PipelineTaskId }
  | { type: 'TASK_COMPLETE'; id: PipelineTaskId }
  | { type: 'TASK_ERROR'; id: PipelineTaskId; message: string }
  | { type: 'PIPELINE_SUCCESS' }
  | { type: 'OPEN_PROFILE' }
  | { type: 'MEANING_START' }
  | { type: 'MEANING_READY' }
  | { type: 'REVISION_START' }
  | { type: 'REVISION_READY' }
  | { type: 'INDEX_START' }
  | { type: 'INDEX_READY' }
  | { type: 'SEARCH_QUERY'; query: string }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_SUCCESS'; query: string }
  | { type: 'SEARCH_ERROR'; message: string }
  | { type: 'NAVIGATE'; stage: IngestionStage }

function resetRunState(state: WorkflowState): Pick<WorkflowState, 'pipelineStatus' | 'tasks' | 'meaningStatus' | 'indexStatus' | 'completedSearchQuery'> {
  return { pipelineStatus: 'idle', tasks: initialTasks, meaningStatus: 'idle', indexStatus: 'idle', completedSearchQuery: '' }
}

function updateTask(tasks: PipelineTask[], id: PipelineTaskId, status: PipelineTask['status']) {
  return tasks.map((task) => task.id === id ? { ...task, status } : task)
}

function getConnectorJobUiStatus(job: IngestionJobResponse): ConnectorJobUiStatus {
  if (job.status === 'completed') return 'completed'
  if (job.status === 'failed') return 'failed'
  return 'polling'
}

function getDocumentProcessingUiStatus(results: DocumentProcessingStatus[]): DocumentProcessingUiStatus {
  const allTerminal = results.length > 0 && results.every(
    (result) => result.found && (result.status === 'completed' || result.status === 'failed'),
  )
  if (!allTerminal) return 'polling'
  return results.some((result) => result.status === 'failed') ? 'completed_with_errors' : 'complete'
}

function getConnectorStage(connector: string, fallback: IngestionStage): IngestionStage {
  if (connector === 'MySQL') return 'mysql'
  if (connector === 'Amazon S3') return 's3'
  if (connector === 'Snowflake') return 'snowflake'
  return fallback
}

function reducer(state: WorkflowState, action: Action): WorkflowState {
  switch (action.type) {
    case 'OPEN_SOURCE':
      return { ...state, stage: 'source', error: null }
    case 'OPEN_CATALOG':
      return { ...state, stage: 'catalog', furthestProgress: Math.max(state.furthestProgress, 1), error: null }
    case 'SELECT_CONNECTOR':
      return {
        ...state,
        selectedConnector: action.connector,
        stage: getConnectorStage(action.connector, state.stage),
        connectorJobStatus: 'idle',
        ingestionJob: null,
        connectorError: null,
        error: null,
      }
    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connection: { ...state.connection, [action.field]: action.value },
        connectionStatus: 'idle',
        source: state.source?.kind === 'mysql' ? null : state.source,
        furthestProgress: Math.min(state.furthestProgress, 1),
        ...resetRunState(state),
        error: null,
      }
    case 'UPDATE_S3_CONNECTION':
      return {
        ...state,
        s3Connection: { ...state.s3Connection, [action.field]: action.value },
        connectorJobStatus: state.ingestionJob ? state.connectorJobStatus : 'idle',
        connectorError: state.ingestionJob ? state.connectorError : null,
      }
    case 'UPDATE_SNOWFLAKE_CONNECTION':
      return {
        ...state,
        snowflakeConnection: { ...state.snowflakeConnection, [action.field]: action.value },
        connectorJobStatus: state.ingestionJob ? state.connectorJobStatus : 'idle',
        connectorError: state.ingestionJob ? state.connectorError : null,
      }
    case 'CONNECTOR_SUBMIT_START':
      return { ...state, connectorJobStatus: 'submitting', ingestionJob: null, connectorError: null, error: null }
    case 'CONNECTOR_JOB_ACCEPTED':
      return {
        ...state,
        connectorJobStatus: getConnectorJobUiStatus(action.job),
        ingestionJob: action.job,
        connectorError: null,
        s3Connection: action.job.datasource_type === 's3'
          ? { ...state.s3Connection, accessKeyId: '', secretAccessKey: '' }
          : state.s3Connection,
        snowflakeConnection: action.job.datasource_type === 'snowflake'
          ? { ...state.snowflakeConnection, privateKey: '', privateKeyPassphrase: '' }
          : state.snowflakeConnection,
      }
    case 'CONNECTOR_JOB_UPDATED':
      return {
        ...state,
        connectorJobStatus: getConnectorJobUiStatus(action.job),
        ingestionJob: action.job,
        connectorError: null,
      }
    case 'CONNECTOR_SUBMIT_ERROR':
      return { ...state, connectorJobStatus: 'failed', ingestionJob: null, connectorError: action.message }
    case 'CONNECTOR_STATUS_ERROR':
      return { ...state, connectorJobStatus: 'status_error', connectorError: action.message }
    case 'CONNECTOR_RETRY_STATUS':
      return { ...state, connectorJobStatus: 'polling', connectorError: null }
    case 'CONNECTOR_NEW_IMPORT':
      return { ...state, connectorJobStatus: 'idle', ingestionJob: null, connectorError: null }
    case 'TEST_START':
      return { ...state, connectionStatus: 'loading', error: null }
    case 'TEST_SUCCESS':
      return { ...state, connectionStatus: 'verified', error: null }
    case 'TEST_ERROR':
      return { ...state, connectionStatus: 'error', error: action.message }
    case 'SAVE_START':
      return { ...state, connectionStatus: 'saving', error: null }
    case 'SAVE_SUCCESS':
      return {
        ...state,
        connectionStatus: 'saved',
        source: { kind: 'mysql', connectionId: action.connectionId, connection: state.connection },
        stage: 'pipeline',
        furthestProgress: 2,
        ...resetRunState(state),
        error: null,
      }
    case 'SAVE_ERROR':
      return { ...state, connectionStatus: 'error', error: action.message }
    case 'ADD_FILES': {
      const existingFiles = state.uploadStatus === 'success' ? [] : state.files
      const byId = new Map(existingFiles.map((file) => [file.id, file]))
      action.files.forEach((file) => byId.set(file.id, file))
      const files = Array.from(byId.values())
      return {
        ...state,
        files,
        selectedFileId: action.files[0]?.id ?? state.selectedFileId ?? files[0]?.id ?? null,
        source: { kind: 'files', files },
        stage: 'upload',
        furthestProgress: 1,
        uploadStatus: 'idle',
        uploadResult: null,
        documentProcessingStatus: 'idle',
        documentProcessingResults: [],
        documentProcessingError: null,
        ...resetRunState(state),
        error: null,
      }
    }
    case 'SELECT_FILE':
      return { ...state, selectedFileId: action.id }
    case 'UPLOAD_START':
      return { ...state, stage: 'upload', uploadStatus: 'loading', uploadResult: null, error: null }
    case 'UPLOAD_SUCCESS':
      return {
        ...state,
        stage: 'processing',
        furthestProgress: Math.max(state.furthestProgress, 2),
        uploadStatus: 'success',
        uploadResult: action.result,
        documentProcessingStatus: 'polling',
        documentProcessingResults: action.result.files.map((file) => ({
          object_key: file.key,
          found: false,
          run_id: null,
          document_id: null,
          status: null,
          error_message: null,
          started_at: null,
          finished_at: null,
          created_at: null,
        })),
        documentProcessingError: null,
        error: null,
      }
    case 'UPLOAD_ERROR':
      return { ...state, stage: 'upload', uploadStatus: 'error', uploadResult: null, error: action.message }
    case 'DOCUMENT_PROCESSING_UPDATED':
      return {
        ...state,
        documentProcessingStatus: getDocumentProcessingUiStatus(action.results),
        documentProcessingResults: action.results,
        documentProcessingError: null,
      }
    case 'DOCUMENT_PROCESSING_STATUS_ERROR':
      return {
        ...state,
        documentProcessingStatus: 'status_error',
        documentProcessingError: action.message,
      }
    case 'DOCUMENT_PROCESSING_RETRY':
      return {
        ...state,
        stage: 'processing',
        documentProcessingStatus: 'polling',
        documentProcessingError: null,
      }
    case 'PIPELINE_START':
      return { ...state, stage: 'pipeline', pipelineStatus: 'loading', tasks: initialTasks, furthestProgress: Math.max(state.furthestProgress, 2), error: null }
    case 'TASK_RUNNING':
      return { ...state, tasks: updateTask(state.tasks, action.id, 'running') }
    case 'TASK_COMPLETE':
      return { ...state, tasks: updateTask(state.tasks, action.id, 'complete') }
    case 'TASK_ERROR':
      return {
        ...state,
        pipelineStatus: action.id === 'source-intake' || action.id === 'normalize' || action.id === 'profile' ? 'error' : state.pipelineStatus,
        meaningStatus: action.id === 'meaning' ? 'ready' : state.meaningStatus,
        indexStatus: action.id === 'index' ? 'idle' : state.indexStatus,
        tasks: updateTask(state.tasks, action.id, 'error'),
        error: action.message,
      }
    case 'PIPELINE_SUCCESS':
      return { ...state, pipelineStatus: 'success', error: null }
    case 'OPEN_PROFILE':
      return { ...state, stage: 'profile', furthestProgress: Math.max(state.furthestProgress, 3), error: null }
    case 'MEANING_START':
      return { ...state, stage: 'meaning', meaningStatus: 'extracting', tasks: updateTask(state.tasks, 'meaning', 'running'), furthestProgress: Math.max(state.furthestProgress, 4), error: null }
    case 'MEANING_READY':
      return { ...state, meaningStatus: 'ready', tasks: updateTask(state.tasks, 'meaning', 'complete'), error: null }
    case 'REVISION_START':
      return { ...state, meaningStatus: 'revising', error: null }
    case 'REVISION_READY':
      return { ...state, meaningStatus: 'ready', revisionCount: state.revisionCount + 1, error: null }
    case 'INDEX_START':
      return { ...state, stage: 'index', meaningStatus: 'approved', indexStatus: 'building', tasks: updateTask(state.tasks, 'index', 'running'), furthestProgress: 5, error: null }
    case 'INDEX_READY':
      return { ...state, indexStatus: 'ready', tasks: updateTask(state.tasks, 'index', 'complete'), error: null }
    case 'SEARCH_QUERY':
      return { ...state, searchQuery: action.query }
    case 'SEARCH_START':
      return { ...state, searchStatus: 'loading', error: null }
    case 'SEARCH_SUCCESS':
      return { ...state, searchStatus: 'success', completedSearchQuery: action.query, error: null }
    case 'SEARCH_ERROR':
      return { ...state, searchStatus: 'error', error: action.message }
    case 'NAVIGATE':
      return { ...state, stage: action.stage, error: null }
    default:
      return state
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function mapFiles(files: FileList | File[]): IngestionFile[] {
  return Array.from(files).map((file) => {
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toUpperCase() ?? 'FILE' : 'FILE'
    return {
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      name: file.name,
      extension: extension === 'MARKDOWN' ? 'MD' : extension,
      sizeLabel: formatFileSize(file.size),
    }
  })
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function waitForNextStatusCheck(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 2000)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('The status check was cancelled.', 'AbortError'))
    }, { once: true })
  })
}

function waitForNextDocumentProcessingCheck(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 5000)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('The document processing status check was cancelled.', 'AbortError'))
    }, { once: true })
  })
}

function optionalString(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function optionalPositiveInteger(value: string) {
  const normalized = value.trim()
  return normalized ? Number(normalized) : null
}

export function useIngestionWorkflow() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const requestRef = useRef<AbortController | null>(null)

  const beginRequest = useCallback(() => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    return controller.signal
  }, [])

  useEffect(() => () => requestRef.current?.abort(), [])

  const openSource = useCallback(() => {
    requestRef.current?.abort()
    dispatch({ type: 'OPEN_SOURCE' })
  }, [])
  const openCatalog = useCallback(() => {
    requestRef.current?.abort()
    dispatch({ type: 'OPEN_CATALOG' })
  }, [])
  const selectConnector = useCallback((connector: string) => {
    requestRef.current?.abort()
    dispatch({ type: 'SELECT_CONNECTOR', connector })
  }, [])
  const updateConnection = useCallback((field: keyof MySqlConnection, value: string | boolean) => dispatch({ type: 'UPDATE_CONNECTION', field, value }), [])
  const updateS3Connection = useCallback((field: keyof S3Connection, value: string) => dispatch({ type: 'UPDATE_S3_CONNECTION', field, value }), [])
  const updateSnowflakeConnection = useCallback((field: keyof SnowflakeConnection, value: string | boolean) => dispatch({ type: 'UPDATE_SNOWFLAKE_CONNECTION', field, value }), [])
  const addFiles = useCallback((files: FileList | File[]) => {
    const mapped = mapFiles(files)
    if (mapped.length) {
      requestRef.current?.abort()
      dispatch({ type: 'ADD_FILES', files: mapped })
    }
  }, [])
  const selectFile = useCallback((id: string) => dispatch({ type: 'SELECT_FILE', id }), [])

  const monitorIngestionJob = useCallback(async (jobId: string, signal: AbortSignal, immediately = false) => {
    try {
      if (!immediately) await waitForNextStatusCheck(signal)
      while (!signal.aborted) {
        const job = await getIngestionJob(jobId, signal)
        dispatch({ type: 'CONNECTOR_JOB_UPDATED', job })
        if (job.status === 'completed' || job.status === 'failed') return
        await waitForNextStatusCheck(signal)
      }
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'CONNECTOR_STATUS_ERROR', message: getErrorMessage(error, 'Unable to refresh the import status.') })
    }
  }, [])

  const monitorDocumentProcessing = useCallback(async (
    uploadResult: UploadFilesResponse,
    signal: AbortSignal,
  ) => {
    try {
      while (!signal.aborted) {
        const results = await getDocumentProcessingStatuses(
          uploadResult.organization_id,
          uploadResult.bucket,
          uploadResult.files.map((file) => file.key),
          signal,
        )
        dispatch({ type: 'DOCUMENT_PROCESSING_UPDATED', results })
        if (getDocumentProcessingUiStatus(results) !== 'polling') return
        await waitForNextDocumentProcessingCheck(signal)
      }
    } catch (error) {
      if (!isAbortError(error)) {
        dispatch({
          type: 'DOCUMENT_PROCESSING_STATUS_ERROR',
          message: getErrorMessage(error, 'Unable to refresh document processing status.'),
        })
      }
    }
  }, [])

  const submitS3Import = useCallback(async () => {
    if (state.connectorJobStatus === 'submitting' || state.connectorJobStatus === 'polling' || state.ingestionJob) return
    const signal = beginRequest()
    dispatch({ type: 'CONNECTOR_SUBMIT_START' })
    try {
      const job = await createIngestionJob({
        organization_id: import.meta.env.VITE_AXIOM_ORGANIZATION_ID ?? '',
        datasource_type: 's3',
        credentials: {
          aws_access_key_id: state.s3Connection.accessKeyId.trim(),
          aws_secret_access_key: state.s3Connection.secretAccessKey,
          aws_region: state.s3Connection.region.trim(),
          aws_bucket_name: state.s3Connection.bucketName.trim(),
        },
      }, signal)
      dispatch({ type: 'CONNECTOR_JOB_ACCEPTED', job })
      if (job.status !== 'completed' && job.status !== 'failed') void monitorIngestionJob(job.job_id, signal)
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'CONNECTOR_SUBMIT_ERROR', message: getErrorMessage(error, 'Unable to create the S3 import job.') })
    }
  }, [beginRequest, monitorIngestionJob, state.connectorJobStatus, state.ingestionJob, state.s3Connection])

  const submitSnowflakeImport = useCallback(async () => {
    if (state.connectorJobStatus === 'submitting' || state.connectorJobStatus === 'polling' || state.ingestionJob) return
    const signal = beginRequest()
    dispatch({ type: 'CONNECTOR_SUBMIT_START' })
    try {
      const job = await createIngestionJob({
        organization_id: import.meta.env.VITE_AXIOM_ORGANIZATION_ID ?? '',
        datasource_type: 'snowflake',
        credentials: {
          account: state.snowflakeConnection.account.trim(),
          user: state.snowflakeConnection.user.trim(),
          private_key: state.snowflakeConnection.privateKey,
          private_key_passphrase: optionalString(state.snowflakeConnection.privateKeyPassphrase),
          warehouse: optionalString(state.snowflakeConnection.warehouse),
          database: optionalString(state.snowflakeConnection.database),
          schema: optionalString(state.snowflakeConnection.schema),
          role: optionalString(state.snowflakeConnection.role),
        },
        discover_tables: state.snowflakeConnection.discoverTables,
        discover_stages: state.snowflakeConnection.discoverStages,
        stage_pattern: optionalString(state.snowflakeConnection.stagePattern),
        table_limit: optionalPositiveInteger(state.snowflakeConnection.tableLimit),
        stage_limit: optionalPositiveInteger(state.snowflakeConnection.stageLimit),
      }, signal)
      dispatch({ type: 'CONNECTOR_JOB_ACCEPTED', job })
      if (job.status !== 'completed' && job.status !== 'failed') void monitorIngestionJob(job.job_id, signal)
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'CONNECTOR_SUBMIT_ERROR', message: getErrorMessage(error, 'Unable to create the Snowflake import job.') })
    }
  }, [beginRequest, monitorIngestionJob, state.connectorJobStatus, state.ingestionJob, state.snowflakeConnection])

  const retryIngestionStatus = useCallback(async () => {
    if (!state.ingestionJob) return
    const signal = beginRequest()
    dispatch({ type: 'CONNECTOR_RETRY_STATUS' })
    await monitorIngestionJob(state.ingestionJob.job_id, signal, true)
  }, [beginRequest, monitorIngestionJob, state.ingestionJob])

  const startNewConnectorImport = useCallback(() => {
    requestRef.current?.abort()
    dispatch({ type: 'CONNECTOR_NEW_IMPORT' })
  }, [])

  const uploadSelectedFiles = useCallback(async () => {
    if (!state.files.length || state.uploadStatus === 'loading' || state.uploadStatus === 'success') return
    const signal = beginRequest()
    dispatch({ type: 'UPLOAD_START' })
    try {
      const result = await uploadFiles(
        import.meta.env.VITE_AXIOM_ORGANIZATION_ID ?? '',
        state.files.map((file) => file.file),
        signal,
      )
      dispatch({ type: 'UPLOAD_SUCCESS', result })
      void monitorDocumentProcessing(result, signal)
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'UPLOAD_ERROR', message: getErrorMessage(error, 'Unable to upload the selected files.') })
    }
  }, [beginRequest, monitorDocumentProcessing, state.files, state.uploadStatus])

  const retryDocumentProcessingStatus = useCallback(async () => {
    if (!state.uploadResult || state.documentProcessingStatus === 'polling') return
    const signal = beginRequest()
    dispatch({ type: 'DOCUMENT_PROCESSING_RETRY' })
    await monitorDocumentProcessing(state.uploadResult, signal)
  }, [beginRequest, monitorDocumentProcessing, state.documentProcessingStatus, state.uploadResult])

  const testConnection = useCallback(async () => {
    const signal = beginRequest()
    dispatch({ type: 'TEST_START' })
    try {
      await testMySqlConnection(state.connection, signal)
      dispatch({ type: 'TEST_SUCCESS' })
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'TEST_ERROR', message: getErrorMessage(error, 'Unable to test the connection.') })
    }
  }, [beginRequest, state.connection])

  const persistConnection = useCallback(async () => {
    if (state.connectionStatus !== 'verified') return
    const signal = beginRequest()
    dispatch({ type: 'SAVE_START' })
    try {
      const result = await saveConnection(state.connection, signal)
      dispatch({ type: 'SAVE_SUCCESS', connectionId: result.connectionId })
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'SAVE_ERROR', message: getErrorMessage(error, 'Unable to save the connection.') })
    }
  }, [beginRequest, state.connection, state.connectionStatus])

  const startPipeline = useCallback(async () => {
    if (!state.source || state.pipelineStatus === 'loading') return
    const signal = beginRequest()
    const taskIds: PipelineTaskId[] = ['source-intake', 'normalize', 'profile']
    dispatch({ type: 'PIPELINE_START' })
    for (const id of taskIds) {
      dispatch({ type: 'TASK_RUNNING', id })
      try {
        await runPipelineTask(id, signal)
        dispatch({ type: 'TASK_COMPLETE', id })
      } catch (error) {
        if (!isAbortError(error)) dispatch({ type: 'TASK_ERROR', id, message: getErrorMessage(error, 'The pipeline could not complete.') })
        return
      }
    }
    dispatch({ type: 'PIPELINE_SUCCESS' })
  }, [beginRequest, state.pipelineStatus, state.source])

  const openProfile = useCallback(() => dispatch({ type: 'OPEN_PROFILE' }), [])

  const startMeaning = useCallback(async () => {
    const signal = beginRequest()
    dispatch({ type: 'MEANING_START' })
    try {
      await extractMeaning(signal)
      dispatch({ type: 'MEANING_READY' })
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'TASK_ERROR', id: 'meaning', message: getErrorMessage(error, 'Meaning extraction failed.') })
    }
  }, [beginRequest])

  const requestRevision = useCallback(async () => {
    const signal = beginRequest()
    dispatch({ type: 'REVISION_START' })
    try {
      await reviseMeaning(signal)
      dispatch({ type: 'REVISION_READY' })
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'TASK_ERROR', id: 'meaning', message: getErrorMessage(error, 'Unable to revise semantic hints.') })
    }
  }, [beginRequest])

  const approveMeaning = useCallback(async () => {
    const signal = beginRequest()
    dispatch({ type: 'INDEX_START' })
    try {
      await buildSearchIndex(signal)
      dispatch({ type: 'INDEX_READY' })
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'TASK_ERROR', id: 'index', message: getErrorMessage(error, 'Unable to build the search index.') })
    }
  }, [beginRequest])

  const setSearchQuery = useCallback((query: string) => dispatch({ type: 'SEARCH_QUERY', query }), [])
  const search = useCallback(async () => {
    if (!state.searchQuery.trim()) return
    const signal = beginRequest()
    dispatch({ type: 'SEARCH_START' })
    try {
      const result = await searchIndexedEvidence(state.searchQuery, signal)
      dispatch({ type: 'SEARCH_SUCCESS', query: result.query })
    } catch (error) {
      if (!isAbortError(error)) dispatch({ type: 'SEARCH_ERROR', message: getErrorMessage(error, 'Search is temporarily unavailable.') })
    }
  }, [beginRequest, state.searchQuery])

  const navigateProgress = useCallback((progress: ProgressStage) => {
    const busy = state.uploadStatus === 'loading' || state.connectorJobStatus === 'submitting' || state.connectorJobStatus === 'polling' || state.pipelineStatus === 'loading' || state.meaningStatus === 'extracting' || state.meaningStatus === 'revising' || state.indexStatus === 'building' || state.connectionStatus === 'loading' || state.connectionStatus === 'saving' || state.searchStatus === 'loading'
    if (busy) return
    const targetIndex = ['source', 'transfer', 'pipeline', 'profile', 'meaning', 'index'].indexOf(progress)
    if (targetIndex > state.furthestProgress) return
    const stage: IngestionStage = progress === 'transfer'
      ? ['upload', 'mysql', 's3', 'snowflake'].includes(state.stage)
        ? state.stage
        : state.source?.kind === 'files'
          ? 'upload'
          : state.source?.kind === 'mysql'
            ? 'mysql'
            : 'catalog'
      : progress === 'pipeline' && state.source?.kind === 'files' && state.uploadResult
        ? 'processing'
        : progress
    dispatch({ type: 'NAVIGATE', stage })
  }, [state.connectionStatus, state.connectorJobStatus, state.furthestProgress, state.indexStatus, state.meaningStatus, state.pipelineStatus, state.searchStatus, state.source, state.stage, state.uploadResult, state.uploadStatus])

  return {
    ...state,
    openSource,
    openCatalog,
    selectConnector,
    updateConnection,
    updateS3Connection,
    updateSnowflakeConnection,
    submitS3Import,
    submitSnowflakeImport,
    retryIngestionStatus,
    startNewConnectorImport,
    addFiles,
    selectFile,
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
  }
}
