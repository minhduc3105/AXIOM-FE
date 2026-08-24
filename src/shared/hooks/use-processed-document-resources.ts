import { useCallback, useEffect, useRef, useState } from "react";
import {
  getIngestedDocumentData,
  presignFileForPreview,
} from "@/shared/lib/document-results-api";
import {
  getSourcePreviewKind,
  idleInspectorResource,
  type InlinePreview,
  type InspectorResource,
  type ParsedDocumentResult,
  type ProcessingFile,
} from "@/shared/types/document-results";

const PREVIEW_EXPIRY_BUFFER_MS = 30_000;

type ProcessedDocumentResultSelector = {
  status: string | null;
  run_id: string | null;
  document_id: string | null;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useProcessedDocumentResources({
  workspaceId,
  bucket,
  file,
  result,
}: {
  workspaceId: string;
  bucket: string;
  file: ProcessingFile | null;
  result: ProcessedDocumentResultSelector | null;
}) {
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
  const completed = result?.status?.trim().toLowerCase() === "completed";
  const previewCacheKey = file
    ? `${workspaceId}:${bucket}:${file.key}`
    : null;
  const parsingCacheKey = file
    ? `${workspaceId}:${bucket}:${file.key}:${result?.run_id ?? "no-run"}`
    : null;

  useEffect(() => {
    if (!file || !completed || getSourcePreviewKind(file) === "unsupported") {
      setPreview(idleInspectorResource());
      return;
    }
    if (!previewCacheKey) return;
    const cached = previewCache.current.get(previewCacheKey);
    if (cached && cached.expiresAt > Date.now() + PREVIEW_EXPIRY_BUFFER_MS) {
      setPreview({ status: "success", data: cached, error: null });
      return;
    }
    previewCache.current.delete(previewCacheKey);
    const controller = new AbortController();
    setPreview({ status: "loading", data: cached ?? null, error: null });
    void presignFileForPreview(bucket, file.key, workspaceId, controller.signal)
      .then((data) => {
        previewCache.current.set(previewCacheKey, data);
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
  }, [bucket, completed, file, previewAttempt, previewCacheKey, workspaceId]);

  useEffect(() => {
    if (!file || !completed || !parsingCacheKey) {
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
      workspaceId,
      bucket,
      objectKey: file.key,
      documentId: result?.document_id,
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
  }, [bucket, completed, file, parsingAttempt, parsingCacheKey, result?.document_id, workspaceId]);

  const retryPreview = useCallback(() => {
    if (previewCacheKey) previewCache.current.delete(previewCacheKey);
    setPreviewAttempt((attempt) => attempt + 1);
  }, [previewCacheKey]);
  const retryParsing = useCallback(() => {
    if (parsingCacheKey) parsingCache.current.delete(parsingCacheKey);
    setParsingAttempt((attempt) => attempt + 1);
  }, [parsingCacheKey]);

  return { preview, parsing, retryPreview, retryParsing };
}
