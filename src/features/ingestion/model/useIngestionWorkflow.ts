import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  buildSearchIndex,
  extractMeaning,
  reviseMeaning,
  runPipelineTask,
  saveConnection,
  searchIndexedEvidence,
  testMySqlConnection,
} from '../api/ingestionApi'
import type {
  AsyncStatus,
  IndexStatus,
  IngestionFile,
  IngestionSource,
  IngestionStage,
  MeaningStatus,
  MySqlConnection,
  PipelineTask,
  PipelineTaskId,
  ProgressStage,
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
  source: IngestionSource | null
  files: IngestionFile[]
  selectedFileId: string | null
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
  source: null,
  files: [],
  selectedFileId: null,
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
  | { type: 'TEST_START' }
  | { type: 'TEST_SUCCESS' }
  | { type: 'TEST_ERROR'; message: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; connectionId: string }
  | { type: 'SAVE_ERROR'; message: string }
  | { type: 'ADD_FILES'; files: IngestionFile[] }
  | { type: 'SELECT_FILE'; id: string }
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

function reducer(state: WorkflowState, action: Action): WorkflowState {
  switch (action.type) {
    case 'OPEN_SOURCE':
      return { ...state, stage: 'source', error: null }
    case 'OPEN_CATALOG':
      return { ...state, stage: 'catalog', furthestProgress: Math.max(state.furthestProgress, 1), error: null }
    case 'SELECT_CONNECTOR':
      return { ...state, selectedConnector: action.connector, stage: action.connector === 'MySQL' ? 'mysql' : state.stage, error: null }
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
      const byId = new Map(state.files.map((file) => [file.id, file]))
      action.files.forEach((file) => byId.set(file.id, file))
      const files = Array.from(byId.values())
      return {
        ...state,
        files,
        selectedFileId: action.files[0]?.id ?? state.selectedFileId ?? files[0]?.id ?? null,
        source: { kind: 'files', files },
        stage: 'upload',
        furthestProgress: 1,
        ...resetRunState(state),
        error: null,
      }
    }
    case 'SELECT_FILE':
      return { ...state, selectedFileId: action.id }
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

  const openSource = useCallback(() => dispatch({ type: 'OPEN_SOURCE' }), [])
  const openCatalog = useCallback(() => dispatch({ type: 'OPEN_CATALOG' }), [])
  const selectConnector = useCallback((connector: string) => dispatch({ type: 'SELECT_CONNECTOR', connector }), [])
  const updateConnection = useCallback((field: keyof MySqlConnection, value: string | boolean) => dispatch({ type: 'UPDATE_CONNECTION', field, value }), [])
  const addFiles = useCallback((files: FileList | File[]) => {
    const mapped = mapFiles(files)
    if (mapped.length) dispatch({ type: 'ADD_FILES', files: mapped })
  }, [])
  const selectFile = useCallback((id: string) => dispatch({ type: 'SELECT_FILE', id }), [])

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
    const busy = state.pipelineStatus === 'loading' || state.meaningStatus === 'extracting' || state.meaningStatus === 'revising' || state.indexStatus === 'building' || state.connectionStatus === 'loading' || state.connectionStatus === 'saving' || state.searchStatus === 'loading'
    if (busy) return
    const targetIndex = ['source', 'transfer', 'pipeline', 'profile', 'meaning', 'index'].indexOf(progress)
    if (targetIndex > state.furthestProgress) return
    const stage: IngestionStage = progress === 'transfer'
      ? state.source?.kind === 'files' ? 'upload' : state.source?.kind === 'mysql' ? 'mysql' : 'catalog'
      : progress
    dispatch({ type: 'NAVIGATE', stage })
  }, [state.connectionStatus, state.furthestProgress, state.indexStatus, state.meaningStatus, state.pipelineStatus, state.searchStatus, state.source])

  return {
    ...state,
    openSource,
    openCatalog,
    selectConnector,
    updateConnection,
    addFiles,
    selectFile,
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
