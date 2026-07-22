import { useCallback, useState } from 'react'
import { runIngestionPipeline, saveConnection as persistConnection, testMySqlConnection } from '../api/ingestionApi'
import type { IngestionStage, IngestionStatus } from './types'

type UseIngestionWorkflowOptions = {
  onStageChange: (stage: IngestionStage) => void
}

export function useIngestionWorkflow({ onStageChange }: UseIngestionWorkflowOptions) {
  const [selected, setSelected] = useState('MySQL')
  const [host, setHostValue] = useState('mysql.company.internal')
  const [tested, setTested] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState<IngestionStatus>('ready')
  const [error, setError] = useState<string | null>(null)

  const setHost = useCallback((value: string) => {
    setHostValue(value)
    setTested(false)
    setSaved(false)
    setError(null)
  }, [])

  const handleFiles = useCallback((nextFiles: FileList | File[]) => {
    const next = Array.from(nextFiles)
    if (next.length === 0) return
    setFiles((current) => [...current, ...next])
    setStatus('ready')
    setError(null)
    onStageChange('upload')
  }, [onStageChange])

  const testConnection = useCallback(async () => {
    setTesting(true)
    setError(null)
    try {
      const result = await testMySqlConnection(host)
      if (!result.ok) setError(result.message)
      setTested(result.ok)
    } catch (requestError) {
      setTested(false)
      setError(requestError instanceof Error ? requestError.message : 'Unable to test the connection.')
    } finally {
      setTesting(false)
    }
  }, [host])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await persistConnection()
      setSaved(true)
      onStageChange('upload')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the connection.')
    } finally {
      setSaving(false)
    }
  }, [onStageChange])

  const startIngestion = useCallback(async () => {
    setStatus('running')
    setError(null)
    try {
      await runIngestionPipeline()
      setStatus('complete')
    } catch (requestError) {
      setStatus('ready')
      setError(requestError instanceof Error ? requestError.message : 'Unable to index the selected files.')
    }
  }, [])

  return { selected, setSelected, host, setHost, tested, testing, saving, saved, files, status, error, handleFiles, testConnection, save, startIngestion }
}
