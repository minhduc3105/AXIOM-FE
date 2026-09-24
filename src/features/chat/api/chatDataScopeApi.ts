import { getOrganizationFiles } from "@/features/data/api/dataApi";
import { authFetch } from "@/features/auth/model/authFetch";
import {
  intelligenceApiError,
  intelligenceApiUrl,
} from "@/shared/lib/intelligence-api";
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

export type ChatDataScopePreference = {
  excludedResourceIds: string[];
  updatedAt: string | null;
};

export async function getChatDataScopePreference(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<ChatDataScopePreference> {
  const requestSignal = signal ?? new AbortController().signal;
  const response = await authFetch(
    intelligenceApiUrl(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/chat-data-scope-preference`,
    ),
    { signal: requestSignal },
  );
  if (!response.ok) throw await intelligenceApiError(response);
  return toChatDataScopePreference(await response.json());
}

export async function replaceChatDataScopePreference(
  workspaceId: string,
  excludedResourceIds: string[],
  signal?: AbortSignal,
): Promise<ChatDataScopePreference> {
  const requestSignal = signal ?? new AbortController().signal;
  const response = await authFetch(
    intelligenceApiUrl(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/chat-data-scope-preference`,
    ),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excluded_resource_ids: excludedResourceIds }),
      signal: requestSignal,
    },
  );
  if (!response.ok) throw await intelligenceApiError(response);
  return toChatDataScopePreference(await response.json());
}

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
  const status =
    file.status === "success"
      ? "ready"
      : file.status === "processing"
        ? "syncing"
        : "unavailable";
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
      status,
    },
    status,
  };
}

function toChatDataScopePreference(value: unknown): ChatDataScopePreference {
  const payload =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    excludedResourceIds: Array.isArray(payload.excluded_resource_ids)
      ? payload.excluded_resource_ids.filter(
          (resourceId): resourceId is string => typeof resourceId === "string",
        )
      : [],
    updatedAt:
      typeof payload.updated_at === "string" ? payload.updated_at : null,
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
