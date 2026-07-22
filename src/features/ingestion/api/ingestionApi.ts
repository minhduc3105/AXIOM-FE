const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
