import { createDataDocumentRoute, getAppRoutePath } from "@/app/routing/paths";
import type { AutoReportSource } from "../api/reportsApi";

export function getReportSourcePath(source: AutoReportSource) {
  return getAppRoutePath(
    createDataDocumentRoute({
      objectKey: source.object_key,
      bucket: "axiom-documents",
      filename: source.filename,
      documentId: source.document_id,
      sourceLabel: "All workspace files",
    }),
  );
}
