export type NumericBbox = [number, number, number, number];

export type ProcessingFile = {
  key: string;
  filename: string | null;
  contentType: string | null;
};

export type SourcePreviewKind = "pdf" | "image" | "xlsx" | "unsupported";

export function getSourcePreviewKind(
  file: ProcessingFile | null | undefined,
): SourcePreviewKind {
  if (!file) return "unsupported";
  const contentType = file.contentType?.toLowerCase() ?? "";
  const extension = file.key.split(".").pop()?.toLowerCase() ?? "";
  if (contentType === "application/pdf" || extension === "pdf") return "pdf";
  if (
    contentType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    extension === "xlsx"
  )
    return "xlsx";
  if (
    contentType === "image/png" ||
    contentType === "image/jpeg" ||
    ["png", "jpg", "jpeg"].includes(extension)
  )
    return "image";
  return "unsupported";
}

export type LayoutBlock = {
  component_id: string;
  page: number | null;
  block_index: number | null;
  type: string;
  text: string;
  semantic_text?: string;
  html?: string;
  bbox?: NumericBbox;
  page_bbox?: NumericBbox;
  polygon?: [number, number][];
  [key: string]: unknown;
};

export type IngestedDocumentMetadata = {
  document_id: string;
  organization_id: string;
  file_name: string;
  bucket: string;
  object_key: string;
  current_status: string;
  latest_run_id: string | null;
  size_bytes: number;
};

export type IngestedProcessingRun = {
  run_id: string;
  status: string;
  error_message: string | null;
};

export type ParsedDocumentResult = {
  document: IngestedDocumentMetadata;
  processingRun: IngestedProcessingRun | null;
  blocks: LayoutBlock[];
  readingOrder: string[];
  mainText: string;
  contentTypes: string[];
};

export type InlinePreview = {
  url: string;
  key: string;
  bucket: string | null;
  expiresIn: number;
  expiresAt: number;
};

export type InspectorResource<T> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: T | null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: T | null; error: string };

export function idleInspectorResource<T>(): InspectorResource<T> {
  return { status: "idle", data: null, error: null };
}

export function getBlockOverlayStyle(block: LayoutBlock) {
  if (!block.bbox || !block.page_bbox) return null;
  const [pageX1, pageY1, pageX2, pageY2] = block.page_bbox;
  const [x1, y1, x2, y2] = block.bbox;
  const pageWidth = pageX2 - pageX1;
  const pageHeight = pageY2 - pageY1;
  if (pageWidth <= 0 || pageHeight <= 0 || x2 <= x1 || y2 <= y1) return null;

  return {
    left: `${((x1 - pageX1) / pageWidth) * 100}%`,
    top: `${((y1 - pageY1) / pageHeight) * 100}%`,
    width: `${((x2 - x1) / pageWidth) * 100}%`,
    height: `${((y2 - y1) / pageHeight) * 100}%`,
  };
}
