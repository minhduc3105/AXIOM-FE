export type UploadPreviewKind =
  | "pdf"
  | "image"
  | "csv"
  | "text"
  | "workbook"
  | "metadata";

export type UploadFileDefinition = {
  extension: string;
  label: string;
  previewKind: UploadPreviewKind;
};

export const UPLOAD_FILE_REGISTRY = [
  { extension: "pdf", label: "PDF", previewKind: "pdf" },
  { extension: "png", label: "PNG", previewKind: "image" },
  { extension: "jpg", label: "JPG", previewKind: "image" },
  { extension: "docx", label: "DOCX", previewKind: "metadata" },
  { extension: "csv", label: "CSV", previewKind: "csv" },
  { extension: "txt", label: "TXT", previewKind: "text" },
  { extension: "xlsx", label: "XLSX", previewKind: "workbook" },
  { extension: "webp", label: "WEBP", previewKind: "image" },
  { extension: "md", label: "Markdown", previewKind: "text" },
] as const satisfies readonly UploadFileDefinition[];

export const SUPPORTED_UPLOAD_EXTENSIONS = UPLOAD_FILE_REGISTRY.map(
  (definition) => definition.extension,
);

export const UPLOAD_FILE_ACCEPT = SUPPORTED_UPLOAD_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",");

export const UPLOAD_FILE_SUPPORTED_FORMAT_LABEL =
  "PDF, PNG, JPG, DOCX, CSV, TXT, XLSX, WEBP, and Markdown";

function extensionFromFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
}

export function getUploadFileDefinition(fileName: string) {
  const extension = extensionFromFileName(fileName);
  return UPLOAD_FILE_REGISTRY.find(
    (definition) => definition.extension === extension,
  );
}

export function isSupportedUploadFile(fileName: string) {
  return getUploadFileDefinition(fileName) !== undefined;
}
