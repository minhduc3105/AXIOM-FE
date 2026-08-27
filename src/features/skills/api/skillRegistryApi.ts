import { authFetch } from "@/features/auth/model/authFetch";
import type {
  SkillCatalogFilters,
  SkillDetail,
  SkillPreferenceResponse,
  UserSkillSummary,
} from "../model/types";

const skillRegistryApiBaseUrl =
  (
    import.meta.env.VITE_SKILL_REGISTRY_API_BASE_URL ?? "/skill-registry"
  ).replace(/\/$/, "") || "/skill-registry";

type SkillRequestOperation = "catalog" | "detail" | "preference" | "archive";

export type SkillRegistryErrorKind =
  | "skill_registry_unavailable"
  | "skill_not_found"
  | "workspace_forbidden"
  | "unauthorized"
  | "request_failed";

export class SkillRegistryError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly operation: SkillRequestOperation,
  ) {
    super(message);
    this.name = "SkillRegistryError";
  }
}

export function getSkillRegistryErrorKind(
  error: unknown,
): SkillRegistryErrorKind {
  if (!(error instanceof SkillRegistryError)) {
    return "skill_registry_unavailable";
  }
  if (error.status === 401) return "unauthorized";
  if (error.status === 403) return "workspace_forbidden";
  if (
    (error.operation === "detail" || error.operation === "archive") &&
    error.status === 404
  ) {
    return "skill_not_found";
  }
  if (error.status >= 500) return "skill_registry_unavailable";
  return "request_failed";
}

function buildUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${skillRegistryApiBaseUrl}${path}${query ? `?${query}` : ""}`;
}

function workspaceParams(workspaceId: string | null) {
  const params = new URLSearchParams();
  if (workspaceId?.trim()) params.set("workspace_id", workspaceId.trim());
  return params;
}

function catalogParams(filters: SkillCatalogFilters) {
  const params = workspaceParams(filters.workspaceId);
  if (filters.language?.trim()) params.set("language", filters.language.trim());
  return params;
}

async function readErrorDetail(response: Response) {
  try {
    const payload = (await response.json()) as {
      detail?: unknown;
      message?: unknown;
    };
    const detail = payload.detail ?? payload.message;
    if (typeof detail === "string") return detail;
    if (detail !== undefined) return JSON.stringify(detail);
  } catch {
    // The service may return a non-JSON proxy error.
  }
  return "";
}

async function getJson<T>(
  url: string,
  signal: AbortSignal,
  operation: Exclude<SkillRequestOperation, "preference" | "archive">,
) {
  const response = await authFetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new SkillRegistryError(
      `Skill Registry request failed (${response.status}).${detail ? ` ${detail}` : ""}`,
      response.status,
      operation,
    );
  }
  return response.json() as Promise<T>;
}

async function patchJson<T>(url: string, body: unknown) {
  const response = await authFetch(url, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new SkillRegistryError(
      `Skill Registry request failed (${response.status}).${detail ? ` ${detail}` : ""}`,
      response.status,
      "preference",
    );
  }
  return response.json() as Promise<T>;
}

function sanitizeFileName(value: string) {
  const clean = value
    .replace(/[\\/]/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
  return clean ? clean.slice(0, 180) : null;
}

function contentDispositionFileName(value: string | null) {
  if (!value) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];
  if (encoded) {
    try {
      return sanitizeFileName(decodeURIComponent(encoded));
    } catch {
      return sanitizeFileName(encoded);
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(value)?.[1];
  return plain ? sanitizeFileName(plain) : null;
}

export function listUserSkills(
  filters: SkillCatalogFilters,
  signal: AbortSignal,
) {
  return getJson<UserSkillSummary[]>(
    buildUrl("/me/skills", catalogParams(filters)),
    signal,
    "catalog",
  );
}

export function getSkill(
  skillId: string,
  workspaceId: string | null,
  signal: AbortSignal,
) {
  return getJson<SkillDetail>(
    buildUrl(
      `/skills/${encodeURIComponent(skillId)}`,
      workspaceParams(workspaceId),
    ),
    signal,
    "detail",
  );
}

export function updateSkillEnabled(
  skillId: string,
  workspaceId: string | null,
  enabled: boolean,
) {
  return patchJson<SkillPreferenceResponse>(
    buildUrl(
      `/me/skills/${encodeURIComponent(skillId)}`,
      workspaceParams(workspaceId),
    ),
    { enabled },
  );
}

export async function downloadSkillArchive(
  skillId: string,
  workspaceId: string | null,
  signal: AbortSignal,
) {
  const response = await authFetch(
    buildUrl(
      `/skills/${encodeURIComponent(skillId)}/archive`,
      workspaceParams(workspaceId),
    ),
    {
      signal,
      headers: { Accept: "application/zip" },
    },
  );
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new SkillRegistryError(
      `Skill Registry request failed (${response.status}).${detail ? ` ${detail}` : ""}`,
      response.status,
      "archive",
    );
  }
  return {
    blob: await response.blob(),
    fileName: contentDispositionFileName(
      response.headers.get("Content-Disposition"),
    ),
    sha256: response.headers.get("X-Skill-Sha256"),
  };
}
