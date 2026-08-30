import { getOrganizationFiles } from "@/features/data/api/dataApi";
import type { DataFile } from "@/features/data/model/types";
import type { ChatDataResource } from "../model/chatDataScope";

const FILES_PAGE_SIZE = 100;
const filesQuery = {
  page: 1,
  pageSize: FILES_PAGE_SIZE,
  search: "",
  sortBy: "last_modified" as const,
  sortOrder: "desc" as const,
};

export async function listChatDataResources(
  organizationId: string,
  workspaceId: string,
  signal?: AbortSignal,
): Promise<ChatDataResource[]> {
  if (!organizationId.trim() || !workspaceId.trim()) return [];

  const requestSignal = signal ?? new AbortController().signal;
  const firstPage = await getOrganizationFiles(
    organizationId,
    workspaceId,
    filesQuery,
    requestSignal,
  );
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) =>
      getOrganizationFiles(
        organizationId,
        workspaceId,
        { ...filesQuery, page: index + 2 },
        requestSignal,
      ),
    ),
  );

  return [firstPage, ...remainingPages]
    .flatMap((page) => page.files)
    .map(toChatDataResource);
}

function toChatDataResource(file: DataFile): ChatDataResource {
  return {
    id: file.documentId || file.datasetId || file.key,
    name: file.name,
    kind: "file",
    source: "Workspace file",
    detail: `${file.type} · ${formatFileSize(file.size)}`,
    updatedAt: formatUpdatedAt(file.lastModified),
    resourceRef: {
      resourceId: file.documentId || file.datasetId || file.key,
      filename: file.name,
      objectKey: file.key,
      bucket: file.bucket,
    },
    status:
      file.status === "success"
        ? "ready"
        : file.status === "processing"
          ? "syncing"
          : "unavailable",
  };
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Unknown update time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown update time";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
