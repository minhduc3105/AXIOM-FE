import type { Investigation } from '../model/types'

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
