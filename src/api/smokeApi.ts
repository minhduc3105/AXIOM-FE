import type { Investigation } from '../types'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function createInvestigation(question: string): Promise<Investigation> {
  await wait(900)
  return {
    question,
    confidence: 94,
    intent: 'generate_revenue_report',
    scope: 'Q3 revenue, payments',
    policy: 'strict read-only sandbox',
  }
}

export async function approveSpecification(): Promise<{ ok: true }> {
  await wait(600)
  return { ok: true }
}

export async function runSandbox(): Promise<{ reviewedRevenue: string; flags: number }> {
  await wait(1100)
  return { reviewedRevenue: '$571K', flags: 2 }
}

export async function testMySqlConnection(host: string): Promise<{ ok: boolean; message: string }> {
  await wait(900)
  const ok = host.trim().length > 0
  return {
    ok,
    message: ok ? 'Connection verified. Read-only credentials accepted.' : 'Host is required.',
  }
}

export async function saveConnection(): Promise<{ ok: true }> {
  await wait(700)
  return { ok: true }
}

export async function runIngestionPipeline(): Promise<{ ok: true; indexedFiles: number }> {
  await wait(1200)
  return { ok: true, indexedFiles: 1 }
}
