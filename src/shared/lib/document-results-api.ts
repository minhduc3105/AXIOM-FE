import { getBrowserStorageUrl } from "@/shared/lib/storage-url";
import type {
  IngestedDocumentMetadata,
  IngestedProcessingRun,
  InlinePreview,
  LayoutBlock,
  NumericBbox,
  ParsedDocumentResult,
} from "@/shared/types/document-results";

type IngestedDataSelector = {
  organizationId: string;
  bucket: string;
  objectKey: string;
  documentId?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseBbox(value: unknown): NumericBbox | undefined {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(isFiniteNumber)) {
    return undefined;
  }
  const bbox: NumericBbox = [value[0], value[1], value[2], value[3]];
  return bbox[2] > bbox[0] && bbox[3] > bbox[1] ? bbox : undefined;
}

function parsePolygon(value: unknown): [number, number][] | undefined {
  if (!Array.isArray(value)) return undefined;
  const points = value.filter(
    (point): point is [number, number] =>
      Array.isArray(point) &&
      point.length === 2 &&
      isFiniteNumber(point[0]) &&
      isFiniteNumber(point[1]),
  );
  return points.length === value.length && points.length >= 3 ? points : undefined;
}

function parseLayoutBlock(value: unknown): LayoutBlock | null {
  if (!isRecord(value) || typeof value.component_id !== "string" || !value.component_id) {
    return null;
  }

  const page = Number.isInteger(value.page) && (value.page as number) >= 0
    ? value.page as number
    : null;
  const blockIndex = Number.isInteger(value.block_index) && (value.block_index as number) >= 0
    ? value.block_index as number
    : null;
  const bbox = parseBbox(value.bbox);
  const pageBbox = parseBbox(value.page_bbox);
  const polygon = parsePolygon(value.polygon);

  return {
    ...value,
    component_id: value.component_id,
    page,
    block_index: blockIndex,
    type: typeof value.type === "string" && value.type ? value.type : "Block",
    text: typeof value.text === "string" ? value.text : "",
    ...(typeof value.semantic_text === "string" ? { semantic_text: value.semantic_text } : {}),
    ...(typeof value.html === "string" ? { html: value.html } : {}),
    ...(bbox ? { bbox } : {}),
    ...(pageBbox ? { page_bbox: pageBbox } : {}),
    ...(polygon ? { polygon } : {}),
  };
}

function parseJsonText(text: string, contentType: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Corpus returned invalid JSON for ${contentType}.`);
  }
}

function parseDocument(value: unknown): IngestedDocumentMetadata | null {
  if (!isRecord(value)
    || typeof value.document_id !== "string"
    || typeof value.organization_id !== "string"
    || typeof value.file_name !== "string"
    || typeof value.bucket !== "string"
    || typeof value.object_key !== "string"
    || typeof value.current_status !== "string"
    || !isNullableString(value.latest_run_id)
    || !Number.isInteger(value.size_bytes)) return null;

  return {
    document_id: value.document_id,
    organization_id: value.organization_id,
    file_name: value.file_name,
    bucket: value.bucket,
    object_key: value.object_key,
    current_status: value.current_status,
    latest_run_id: value.latest_run_id,
    size_bytes: value.size_bytes as number,
  };
}

function parseProcessingRun(value: unknown): IngestedProcessingRun | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)
    || typeof value.run_id !== "string"
    || typeof value.status !== "string"
    || !isNullableString(value.error_message)) {
    throw new Error("Corpus returned an invalid processing run.");
  }
  return {
    run_id: value.run_id,
    status: value.status,
    error_message: value.error_message,
  };
}

export function parseIngestedDocumentPayload(value: unknown): ParsedDocumentResult {
  if (!isRecord(value)) throw new Error("Corpus returned an invalid document result.");
  if (typeof value.error === "string" && value.error) {
    const message = typeof value.message === "string" && value.message
      ? value.message
      : value.error.split("_").join(" ");
    throw new Error(message);
  }

  const document = parseDocument(value.document);
  if (!document || !Array.isArray(value.contents)) {
    throw new Error("Corpus returned an incomplete document result.");
  }

  const contents = value.contents.map((item) => {
    if (!isRecord(item)
      || typeof item.content_id !== "string"
      || typeof item.type !== "string"
      || typeof item.text !== "string") {
      throw new Error("Corpus returned invalid parsed content.");
    }
    return { contentId: item.content_id, type: item.type, text: item.text };
  });

  const blocksContent = contents.find((item) => item.type === "blocks");
  let blocks: LayoutBlock[] = [];
  if (blocksContent) {
    const parsed = parseJsonText(blocksContent.text, "blocks");
    if (!Array.isArray(parsed)) throw new Error("Corpus blocks content must be an array.");
    blocks = parsed.map(parseLayoutBlock).filter((block): block is LayoutBlock => Boolean(block));
  }

  const readingOrderContent = contents.find((item) => item.type === "reading_order");
  let readingOrder: string[] = [];
  if (readingOrderContent) {
    const parsed = parseJsonText(readingOrderContent.text, "reading_order");
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
      throw new Error("Corpus reading order content must be an array of component IDs.");
    }
    readingOrder = parsed;
  }

  if (readingOrder.length) {
    const blocksById = new Map(blocks.map((block) => [block.component_id, block]));
    const ordered = readingOrder
      .map((componentId) => blocksById.get(componentId))
      .filter((block): block is LayoutBlock => Boolean(block));
    const orderedIds = new Set(ordered.map((block) => block.component_id));
    blocks = [...ordered, ...blocks.filter((block) => !orderedIds.has(block.component_id))];
  }

  const summary = isRecord(value.content_summary) && Array.isArray(value.content_summary.content_types)
    ? value.content_summary.content_types.filter((item): item is string => typeof item === "string")
    : contents.map((item) => item.type);

  return {
    document,
    processingRun: parseProcessingRun(value.processing_run),
    blocks,
    readingOrder,
    mainText: contents.find((item) => item.type === "main_text")?.text ?? "",
    contentTypes: summary,
  };
}

async function getHttpError(response: Response, operation: string) {
  const fallback = `${operation} failed with HTTP ${response.status}.`;
  const responseText = (await response.text()).trim();
  if (!responseText) return fallback;
  try {
    const payload: unknown = JSON.parse(responseText);
    if (isRecord(payload) && typeof payload.detail === "string") return payload.detail;
    if (isRecord(payload) && typeof payload.message === "string") return payload.message;
  } catch {
    return responseText;
  }
  return fallback;
}

export async function presignFileForPreview(
  bucket: string,
  objectKey: string,
  signal?: AbortSignal,
): Promise<InlinePreview> {
  const response = await fetch("/api/document/files/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      object_path: objectKey,
      bucket_name: bucket,
      expires_in: 900,
      force_download: false,
    }),
    signal,
  });
  if (!response.ok) throw new Error(await getHttpError(response, "Preview URL"));

  const payload: unknown = await response.json();
  if (!isRecord(payload)
    || typeof payload.url !== "string"
    || typeof payload.key !== "string"
    || !isNullableString(payload.bucket)
    || !Number.isInteger(payload.expires_in)
    || payload.force_download !== false) {
    throw new Error("Document Service returned an invalid preview URL.");
  }

  const expiresIn = payload.expires_in as number;
  return {
    url: getBrowserStorageUrl(payload.url),
    key: payload.key,
    bucket: payload.bucket,
    expiresIn,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export async function getIngestedDocumentData(
  selector: IngestedDataSelector,
  signal?: AbortSignal,
): Promise<ParsedDocumentResult> {
  const response = await fetch("/api/corpus/documents/ingested-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organization_id: selector.organizationId,
      bucket: selector.bucket,
      object_key: selector.objectKey,
      ...(selector.documentId ? { document_id: selector.documentId } : {}),
      match_mode: "exact",
      mode: "all",
    }),
    signal,
  });
  if (!response.ok) throw new Error(await getHttpError(response, "Parsed document"));
  return parseIngestedDocumentPayload(await response.json());
}
