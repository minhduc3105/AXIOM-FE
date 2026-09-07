import { authFetch } from "@/features/auth/model/authFetch";
import { intelligenceApiUrl } from "@/shared/lib/intelligence-api";
import type { DataFile } from "../model/types";

export type RelatedFile = {
  source_id: string;
  document_id: string;
  object_key: string;
  filename: string;
  bucket: string;
  size: number;
  content_type: string | null;
  last_modified: string | null;
};

export async function discoverRelatedFiles(
  workspaceId: string,
  files: DataFile[],
  signal: AbortSignal,
): Promise<RelatedFile[]> {
  const response = await authFetch(
    intelligenceApiUrl(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/auto-reports/related-files`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: files.map((file) => ({
          object_key: file.key,
          document_id: file.documentId,
        })),
      }),
      signal,
    },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.detail === "string"
        ? payload.detail
        : "Unable to find related files. Try again.",
    );
  }
  const payload = (await response.json()) as { files: RelatedFile[] };
  return payload.files;
}

export function relatedFileToDataFile(
  file: RelatedFile,
  organizationId: string,
  workspaceId: string,
): DataFile {
  return {
    key: file.object_key,
    name: file.filename,
    bucket: file.bucket,
    documentId: file.document_id,
    size: file.size,
    lastModified: file.last_modified,
    organizationId,
    workspaceId,
    type: file.content_type ?? "File",
    status: "success",
    sourceStatus: "completed",
    statusDetail: "Indexed",
    canInspect: true,
    datasourceId: null,
    downloadUrl: "",
    etag: null,
    errorMessage: null,
    runId: null,
  };
}
