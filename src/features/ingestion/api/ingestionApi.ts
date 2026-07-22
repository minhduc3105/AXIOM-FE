import type { MySqlConnection, PipelineTaskId } from '../model/types'

const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(resolve, ms)
  signal?.addEventListener('abort', () => {
    window.clearTimeout(timer)
    reject(new DOMException('The mock request was cancelled.', 'AbortError'))
  }, { once: true })
})

const pipelineDelays: Partial<Record<PipelineTaskId, number>> = {
  'source-intake': 1300,
  normalize: 1600,
  profile: 1500,
  meaning: 1500,
  index: 2000,
}

export async function testMySqlConnection(connection: MySqlConnection, signal?: AbortSignal): Promise<{ ok: true; message: string }> {
  await wait(900, signal)
  const required = [connection.host, connection.port, connection.database, connection.username, connection.password]
  if (required.some((value) => !value.trim())) throw new Error('Complete the required connection fields before testing.')
  return { ok: true, message: 'Connection verified. Read-only credentials accepted.' }
}

export async function saveConnection(connection: MySqlConnection, signal?: AbortSignal): Promise<{ ok: true; connectionId: string }> {
  await wait(700, signal)
  if (!connection.host.trim()) throw new Error('The verified connection is no longer valid.')
  return { ok: true, connectionId: 'mysql-workspace-q3' }
}

export async function runPipelineTask(task: PipelineTaskId, signal?: AbortSignal): Promise<{ ok: true; task: PipelineTaskId }> {
  await wait(pipelineDelays[task] ?? 1200, signal)
  return { ok: true, task }
}

export async function extractMeaning(signal?: AbortSignal): Promise<{ ok: true }> {
  await runPipelineTask('meaning', signal)
  return { ok: true }
}

export async function reviseMeaning(signal?: AbortSignal): Promise<{ ok: true }> {
  await wait(1400, signal)
  return { ok: true }
}

export async function buildSearchIndex(signal?: AbortSignal): Promise<{ ok: true; indexedAssets: number }> {
  await runPipelineTask('index', signal)
  return { ok: true, indexedAssets: 4 }
}

export async function searchIndexedEvidence(query: string, signal?: AbortSignal): Promise<{ ok: true; query: string }> {
  await wait(500, signal)
  return { ok: true, query: query.trim() }
}
