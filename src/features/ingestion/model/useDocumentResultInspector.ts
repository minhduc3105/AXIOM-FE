import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getIngestedDocumentData,
  presignFileForPreview,
} from "../api/documentResultsApi";
import type { DocumentProcessingStatus } from "../api/ingestionApi";
import type {
  InlinePreview,
  InspectorResource,
  ParsedDocumentResult,
} from "./documentResults";
import { idleInspectorResource } from "./documentResults";
import { getSourcePreviewKind, type DocumentProcessingBatch } from "./types";

const PREVIEW_EXPIRY_BUFFER_MS = 30_000;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useDocumentResultInspector(
  batch: DocumentProcessingBatch,
  results: DocumentProcessingStatus[],
) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [parsingAttempt, setParsingAttempt] = useState(0);
  const [preview, setPreview] = useState<InspectorResource<InlinePreview>>(
    idleInspectorResource,
  );
  const [parsing, setParsing] = useState<InspectorResource<ParsedDocumentResult>>(
    idleInspectorResource,
  );
  const previewCache = useRef(new Map<string, InlinePreview>());
  const parsingCache = useRef(new Map<string, ParsedDocumentResult>());

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
  const parsingCacheKey = selectedFile
    ? `${selectedFile.key}:${selectedResult?.run_id ?? "no-run"}`
    : null;

  useEffect(() => {
    if (!selectedFile
      || selectedResult?.status !== "completed"
      || getSourcePreviewKind(selectedFile) === "unsupported") {
      setPreview(idleInspectorResource());
      return;
    }

    const cacheKey = `${batch.bucket}:${selectedFile.key}`;
    const cached = previewCache.current.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + PREVIEW_EXPIRY_BUFFER_MS) {
      setPreview({ status: "success", data: cached, error: null });
      return;
    }

    previewCache.current.delete(cacheKey);
    const controller = new AbortController();
    setPreview({ status: "loading", data: cached ?? null, error: null });
    void presignFileForPreview(batch.bucket, selectedFile.key, controller.signal)
      .then((data) => {
        previewCache.current.set(cacheKey, data);
        setPreview({ status: "success", data, error: null });
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setPreview({
            status: "error",
            data: cached ?? null,
            error: getErrorMessage(error, "Unable to load the source preview."),
          });
        }
      });

    return () => controller.abort();
  }, [batch.bucket, previewAttempt, selectedFile, selectedResult?.status]);

  useEffect(() => {
    if (!selectedFile || selectedResult?.status !== "completed" || !parsingCacheKey) {
      setParsing(idleInspectorResource());
      return;
    }

    const cached = parsingCache.current.get(parsingCacheKey);
    if (cached) {
      setParsing({ status: "success", data: cached, error: null });
      return;
    }

    const controller = new AbortController();
    setParsing({ status: "loading", data: null, error: null });
    void getIngestedDocumentData({
      organizationId: batch.organization_id,
      bucket: batch.bucket,
      objectKey: selectedFile.key,
      documentId: selectedResult.document_id,
    }, controller.signal)
      .then((data) => {
        parsingCache.current.set(parsingCacheKey, data);
        setParsing({ status: "success", data, error: null });
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setParsing({
            status: "error",
            data: null,
            error: getErrorMessage(error, "Unable to load parsed content."),
          });
        }
      });

    return () => controller.abort();
  }, [batch.bucket, batch.organization_id, parsingAttempt, parsingCacheKey, selectedFile, selectedResult]);

  const selectFile = useCallback((key: string) => {
    if (resultsByKey.get(key)?.status === "completed") setSelectedKey(key);
  }, [resultsByKey]);

  const retryPreview = useCallback(() => {
    if (selectedFile) previewCache.current.delete(`${batch.bucket}:${selectedFile.key}`);
    setPreviewAttempt((attempt) => attempt + 1);
  }, [batch.bucket, selectedFile]);

  const retryParsing = useCallback(() => {
    if (parsingCacheKey) parsingCache.current.delete(parsingCacheKey);
    setParsingAttempt((attempt) => attempt + 1);
  }, [parsingCacheKey]);

  return {
    selectedKey,
    selectedFile,
    selectedResult,
    preview,
    parsing,
    selectFile,
    retryPreview,
    retryParsing,
  };
}
