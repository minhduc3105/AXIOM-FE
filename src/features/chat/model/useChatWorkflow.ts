import { useCallback, useReducer } from 'react'
import { approveSpecification, createInvestigation, runSandbox } from '../api/chatApi'
import type { ChatWorkflowState, DetailStage, Investigation } from './types'

const initialState: ChatWorkflowState = {
  stage: 'welcome',
  detailStage: null,
  investigation: null,
  loading: false,
  error: null,
}

type Action =
  | { type: 'submit/start'; investigation: Investigation }
  | { type: 'submit/success'; investigation: Investigation }
  | { type: 'request/failure'; message: string }
  | { type: 'approve/intent-start' }
  | { type: 'approve/intent-success' }
  | { type: 'approve/plan-start' }
  | { type: 'approve/plan-success' }
  | { type: 'detail/open'; stage: DetailStage }
  | { type: 'detail/close' }
  | { type: 'chat/new' }

function reducer(state: ChatWorkflowState, action: Action): ChatWorkflowState {
  switch (action.type) {
    case 'submit/start':
      return { ...state, stage: 'pending', detailStage: null, investigation: action.investigation, loading: true, error: null }
    case 'submit/success':
      return { ...state, stage: 'intent', investigation: action.investigation, loading: false }
    case 'approve/intent-start':
      return { ...state, loading: true, detailStage: null, error: null }
    case 'approve/intent-success':
      return { ...state, stage: 'planner', loading: false }
    case 'approve/plan-start':
      return { ...state, stage: 'execute', loading: true, detailStage: null, error: null }
    case 'approve/plan-success':
      return { ...state, stage: 'result', loading: false }
    case 'request/failure':
      return { ...state, loading: false, error: action.message }
    case 'detail/open':
      return { ...state, detailStage: action.stage, error: null }
    case 'detail/close':
      return { ...state, detailStage: null }
    case 'chat/new':
      return initialState
    default:
      return state
  }
}

const optimisticInvestigation = (question: string): Investigation => ({
  question,
  confidence: 94,
  intent: 'generate_revenue_report',
  scope: 'Q3 revenue, payments',
  policy: 'strict read-only sandbox',
})

export function useChatWorkflow() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const submitQuestion = useCallback(async (question: string) => {
    dispatch({ type: 'submit/start', investigation: optimisticInvestigation(question) })
    try {
      const investigation = await createInvestigation(question)
      dispatch({ type: 'submit/success', investigation })
    } catch (error) {
      dispatch({ type: 'request/failure', message: error instanceof Error ? error.message : 'Unable to create investigation.' })
    }
  }, [])

  const approve = useCallback(async () => {
    if (state.loading) return

    try {
      if (state.stage === 'intent') {
        dispatch({ type: 'approve/intent-start' })
        await approveSpecification()
        dispatch({ type: 'approve/intent-success' })
      } else if (state.stage === 'planner') {
        dispatch({ type: 'approve/plan-start' })
        await runSandbox()
        dispatch({ type: 'approve/plan-success' })
      } else if (state.stage === 'result') {
        dispatch({ type: 'detail/open', stage: 'result' })
      }
    } catch (error) {
      dispatch({ type: 'request/failure', message: error instanceof Error ? error.message : 'The workflow request failed.' })
    }
  }, [state.loading, state.stage])

  const newChat = useCallback(() => dispatch({ type: 'chat/new' }), [])
  const openDetail = useCallback((stage: DetailStage) => dispatch({ type: 'detail/open', stage }), [])
  const closeDetail = useCallback(() => dispatch({ type: 'detail/close' }), [])

  return { ...state, submitQuestion, approve, newChat, openDetail, closeDetail }
}
