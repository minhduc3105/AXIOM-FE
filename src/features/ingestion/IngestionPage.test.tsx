import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IngestionPage } from './IngestionPage'
import { MeaningWorkspace } from './components/MeaningWorkspace'
import { ProfileWorkspace } from './components/ProfileWorkspace'
import type { IngestionSource } from './model/types'

const mysqlSource: IngestionSource = {
  kind: 'mysql',
  connectionId: 'mysql-test',
  connection: {
    host: 'mysql.company.internal',
    port: '3306',
    database: 'analytics',
    schema: 'public',
    username: 'axiom_readonly',
    password: 'readonly',
    sslMode: 'Require',
    encrypted: true,
  },
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('Data ingestion workflow', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('shows selected files and advances through every review stage before indexing', async () => {
    render(<IngestionPage onBack={vi.fn()} />)

    const input = document.querySelector<HTMLInputElement>('#axiom-upload-input')
    expect(input).not.toBeNull()
    const file = new File(['customer_id,revenue'], 'revenue.csv', { type: 'text/csv', lastModified: 1 })
    fireEvent.change(input!, { target: { files: [file] } })

    expect(screen.getByRole('heading', { name: 'Upload queue' })).toBeInTheDocument()
    expect(screen.getAllByText('revenue.csv')).toHaveLength(2)
    expect(screen.getByText('1 file staged')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start ingestion' }))
    expect(screen.getAllByText('Pipeline running')).toHaveLength(2)
    expect(screen.queryByText('Index ready')).not.toBeInTheDocument()

    await advance(1300)
    expect(screen.getByText('Normalize content').closest('article')).toHaveClass('running')
    await advance(1600)
    expect(screen.getByText('Profile structure').closest('article')).toHaveClass('running')
    await advance(1500)

    fireEvent.click(screen.getByRole('button', { name: 'Review profile' }))
    expect(screen.getByRole('heading', { name: 'Cross-source quality matrix' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue to meaning' }))
    expect(screen.getByRole('heading', { name: 'Extracting meaning' })).toBeInTheDocument()
    await advance(1500)

    expect(screen.getByRole('heading', { name: 'Semantic map' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Request revision' }))
    expect(screen.getByRole('button', { name: 'Revising…' })).toBeDisabled()
    await advance(1400)
    expect(screen.getByText('Revision 1 applied')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Approve meaning' }))
    expect(screen.getByRole('heading', { name: 'Building searchable index' })).toBeInTheDocument()
    await advance(2000)

    expect(screen.getByRole('heading', { name: 'Search indexed asset' })).toBeInTheDocument()
    expect(screen.getByText('1/1 sources searchable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByRole('button', { name: 'Searching…' })).toBeDisabled()
    await advance(500)
    expect(screen.getByText(/Showing mock evidence/)).toBeInTheDocument()
  })

  it('saves a verified MySQL connection directly into the pipeline', async () => {
    render(<IngestionPage onBack={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Browse data sources' }))
    fireEvent.click(screen.getByRole('button', { name: /MySQL.*SQL connector/ }))
    expect(screen.getByRole('heading', { name: 'MySQL connection' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(screen.getByRole('button', { name: 'Testing…' })).toBeDisabled()
    await advance(900)
    expect(screen.getByText('Verified')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save connection and continue to pipeline' }))
    await advance(700)

    expect(screen.getByRole('heading', { name: 'Run pipeline' })).toBeInTheDocument()
    expect(screen.getByText('MySQL · analytics/public')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Upload queue' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run pipeline' })).toBeEnabled()
  })

  it('selects a profile source and synchronizes its detail summary', () => {
    render(<ProfileWorkspace source={mysqlSource} onContinue={vi.fn()} onBack={vi.fn()} />)

    const paymentEvents = screen.getByRole('button', { name: 'View profile for payment_events' })
    expect(paymentEvents).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(paymentEvents)

    expect(paymentEvents).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Selected source').parentElement).toHaveTextContent('payment_events')
    expect(screen.getByText('Detected risk').parentElement).toHaveTextContent('nested metadata')
  })

  it('selects semantic concepts and updates the relationship evidence', () => {
    render(<MeaningWorkspace status="ready" revisionCount={0} onApprove={vi.fn()} onRevision={vi.fn()} onBack={vi.fn()} />)

    const revenue = screen.getByRole('button', { name: 'Select semantic concept Revenue' })
    expect(revenue).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(revenue)

    expect(revenue).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Suggested relationship graph · Revenue')).toBeInTheDocument()
    expect(screen.getByText(/currency-normalized financial claims/)).toBeInTheDocument()
  })
})
