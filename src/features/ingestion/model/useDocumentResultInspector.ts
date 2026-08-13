import { useCallback, useEffect, useMemo, useState } from "react";
import { useProcessedDocumentResources } from "@/shared/hooks/use-processed-document-resources";
import type { DocumentProcessingStatus } from "../api/ingestionApi";
import type { DocumentProcessingBatch } from "./types";

export function useDocumentResultInspector(
  batch: DocumentProcessingBatch,
  results: DocumentProcessingStatus[],
) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const resultsByKey = useMemo(
    () => new Map(results.map((result) => [result.object_key, result])),
    [results],
  );
  const indexedKeys = useMemo(
    () => batch.files
      .filter((file) => resultsByKey.get(file.key)?.status === "completed")
      .map((file) => file.key),
    [batch.files, resultsByKey],
  );

  useEffect(() => {
    if (selectedKey && indexedKeys.includes(selectedKey)) return;
    setSelectedKey(indexedKeys[0] ?? null);
  }, [indexedKeys, selectedKey]);

  const selectedFile = batch.files.find((file) => file.key === selectedKey) ?? null;
  const selectedResult = selectedKey ? resultsByKey.get(selectedKey) ?? null : null;
  const resources = useProcessedDocumentResources({
    organizationId: batch.organization_id,
    workspaceId: batch.workspace_id,
    bucket: batch.bucket,
    file: selectedFile,
    result: selectedResult,
  });

  const selectFile = useCallback((key: string) => {
    if (resultsByKey.get(key)?.status === "completed") setSelectedKey(key);
  }, [resultsByKey]);

  return {
    selectedKey,
    selectedFile,
    selectedResult,
    ...resources,
    selectFile,
  };
}
