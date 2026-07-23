import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function mockDesktop(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function submitQuestion(question = 'Create a Q3 revenue report') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Ask AXIOM' }), { target: { value: question } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
}

describe('Chat workflow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockDesktop(true)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('runs the editable three-stage workflow before showing a cited final answer', async () => {
    render(<App />)
    submitQuestion('hello')

    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Understanding your request' })).toBeInTheDocument()
    expect(screen.getAllByText('Intent & Spec')).not.toHaveLength(0)
    expect(screen.getAllByText('Process')).not.toHaveLength(0)
    expect(screen.getAllByText('Final Answer')).not.toHaveLength(0)

    await advance(1000)

    const intent = screen.getByRole('textbox', { name: 'Intent' })
    const scope = screen.getByRole('textbox', { name: 'Scope' })
    fireEvent.change(intent, { target: { value: 'review_enterprise_revenue' } })
    fireEvent.change(scope, { target: { value: 'Enterprise accounts, Q3 revenue' } })
    fireEvent.click(screen.getByRole('button', { name: 'Approve & run' }))

    expect(screen.getByRole('heading', { name: 'Processing workflow' })).toBeInTheDocument()
    expect(screen.getByText('Retrieve scoped sources').closest('li')).toHaveClass('running')

    await advance(1300)
    expect(screen.getByText('Retrieve scoped sources').closest('li')).toHaveClass('done')
    expect(screen.getByText('Build plan & workflow code').closest('li')).toHaveClass('running')

    await advance(7200)
    expect(screen.getByRole('heading', { name: 'Final Answer' })).toBeInTheDocument()
    expect(screen.getByText(/review enterprise revenue/)).toBeInTheDocument()
    expect(screen.getByText(/Enterprise accounts, Q3 revenue/)).toBeInTheDocument()
    expect(screen.getByLabelText('Evidence')).toBeInTheDocument()
    expect(screen.getByText('4/4 cited')).toBeInTheDocument()
  })

  it('resets edited values and prevents an empty specification from running', async () => {
    render(<App />)
    submitQuestion()
    await advance(1000)

    const intent = screen.getByRole('textbox', { name: 'Intent' })
    const scope = screen.getByRole('textbox', { name: 'Scope' })
    fireEvent.change(intent, { target: { value: 'changed_intent' } })
    fireEvent.change(scope, { target: { value: 'Changed scope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset changes' }))

    expect(intent).toHaveValue('generate_revenue_report')
    expect(scope).toHaveValue('Q3 revenue, payments')

    fireEvent.change(intent, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Approve & run' })).toBeDisabled()
  })

  it('keeps evidence closed on mobile until the user requests it', async () => {
    mockDesktop(false)
    render(<App />)
    submitQuestion()
    await advance(1000)
    fireEvent.click(screen.getByRole('button', { name: 'Approve & run' }))
    await advance(8500)

    expect(screen.getByRole('heading', { name: 'Final Answer' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Evidence')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View evidence (4)' }))
    expect(screen.getByLabelText('Evidence')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close evidence' }))
    expect(screen.queryByLabelText('Evidence')).not.toBeInTheDocument()
  })

  it('cancels an active process when starting a new chat', async () => {
    render(<App />)
    submitQuestion()
    await advance(1000)
    fireEvent.click(screen.getByRole('button', { name: 'Approve & run' }))
    await advance(1300)

    fireEvent.click(screen.getByRole('button', { name: '+ New chat' }))
    expect(screen.getByRole('heading', { name: 'What would you like to investigate?' })).toBeInTheDocument()

    await advance(10000)
    expect(screen.queryByRole('heading', { name: 'Final Answer' })).not.toBeInTheDocument()
  })
})
