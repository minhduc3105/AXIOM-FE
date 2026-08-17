import type {
  ExperienceRecord,
  ExtractionJob,
  FeedbackResult,
  MemoryRecord,
  MemoryScope,
  MemorySearchResult,
  ProcedureRecord,
  RecallResult,
  ServiceStatus,
} from "../model/types";

const intentBase = (import.meta.env.VITE_MEMORY_API_BASE_URL ?? "/api/v1").replace(/\/$/, "");
const remeBase = import.meta.env.VITE_REME_API_BASE_URL?.replace(/\/$/, "");

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const stringValue = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;
const numberValue = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const arrayValue = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export const memoryScope: MemoryScope = {
  tenant_id: import.meta.env.VITE_MEMORY_TENANT_ID ?? import.meta.env.VITE_ORGANIZATION_ID ?? "test-org",
  workspace_id: import.meta.env.VITE_MEMORY_WORKSPACE_ID ?? null,
  user_id: import.meta.env.VITE_MEMORY_USER_ID ?? null,
  agent_id: import.meta.env.VITE_MEMORY_AGENT_ID ?? null,
  session_id: "axiom-fe-memory",
};

async function request<T>(base: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const payload: unknown = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(stringValue(asRecord(payload).detail, `Request failed (${response.status}).`));
  return payload as T;
}

function scopeParams(scope: MemoryScope) {
  const params = new URLSearchParams({ tenant_id: scope.tenant_id, limit: "50" });
  if (scope.user_id) params.set("user_id", scope.user_id);
  if (scope.workspace_id) params.set("workspace_id", scope.workspace_id);
  if (scope.agent_id) params.set("agent_id", scope.agent_id);
  return params;
}

function sourceRefs(value: unknown) {
  return arrayValue(value).map(asRecord).map((item) => ({
    source_type: stringValue(item.source_type) || undefined,
    source_id: stringValue(item.source_id),
  })).filter((item) => item.source_id);
}

function normalizeMemory(value: unknown, score: number | null = null): MemorySearchResult {
  const raw = asRecord(value);
  const refs = sourceRefs(raw.source_refs);
  const reme = refs.some((ref) => ref.source_id.startsWith("reme:"));
  const id = stringValue(raw.memory_id) || stringValue(raw.id);
  return {
    id,
    memory_id: id,
    content: stringValue(raw.content),
    memory_type: stringValue(raw.memory_type, "semantic"),
    confidence: numberValue(raw.confidence),
    importance: numberValue(raw.importance),
    source_refs: refs,
    created_at: stringValue(raw.created_at) || null,
    updated_at: stringValue(raw.updated_at) || null,
    backend: reme ? "reme" : stringValue(raw.backend) === "postgresql" ? "postgresql" : "unknown",
    score: score ?? numberValue(raw.score),
    matched_by: arrayValue(raw.matched_by).filter((item): item is string => typeof item === "string"),
    raw,
  };
}

function normalizeExperience(value: unknown): ExperienceRecord {
  const raw = asRecord(value);
  return { id: stringValue(raw.id), goal: stringValue(raw.goal), lesson: stringValue(raw.lesson), confidence: numberValue(raw.confidence), source_refs: sourceRefs(raw.source_refs), created_at: stringValue(raw.created_at) || null, raw };
}

function normalizeProcedure(value: unknown): ProcedureRecord {
  const raw = asRecord(value);
  return { id: stringValue(raw.id), name: stringValue(raw.name), trigger: stringValue(raw.trigger), confidence: numberValue(raw.confidence), source_refs: sourceRefs(raw.source_refs), created_at: stringValue(raw.created_at) || null, raw };
}

export async function getServiceStatus(): Promise<{ intent: ServiceStatus; reme: ServiceStatus }> {
  const [intent, reme] = await Promise.allSettled([
    request(intentBase, "/health"),
    remeBase
      ? request(remeBase, "/health_check", { method: "POST", body: "{}" })
      : Promise.reject(new Error("ReMe is not configured")),
  ]);
  return { intent: intent.status === "fulfilled" ? "online" : "offline", reme: reme.status === "fulfilled" ? "online" : "offline" };
}

export async function listMemories(scope = memoryScope): Promise<MemoryRecord[]> {
  const data = asRecord(await request<unknown>(intentBase, `/memories?${scopeParams(scope)}`));
  return arrayValue(data.memories).map((item) => normalizeMemory(item));
}

export async function getMemory(memoryId: string, scope = memoryScope) {
  return normalizeMemory(await request<unknown>(intentBase, `/memories/${encodeURIComponent(memoryId)}?tenant_id=${encodeURIComponent(scope.tenant_id)}`));
}

export async function searchMemories(query: string, options: { type?: string; searchType?: string } = {}, scope = memoryScope) {
  const data = asRecord(await request<unknown>(intentBase, "/memories/search", { method: "POST", body: JSON.stringify({ ...scope, query, memory_types: options.type ? [options.type] : undefined, search_type: options.searchType ?? "hybrid", limit: 50 }) }));
  return arrayValue(data.memories).map((item) => normalizeMemory(item));
}

export async function updateMemory(memory: MemoryRecord, content: string, confidence: number, scope = memoryScope) {
  return normalizeMemory(await request<unknown>(intentBase, `/memories/${encodeURIComponent(memory.memory_id)}`, { method: "PATCH", body: JSON.stringify({ tenant_id: scope.tenant_id, content, confidence, importance: memory.importance ?? 0.5 }) }));
}

export async function deleteMemory(memoryId: string, scope = memoryScope) {
  const params = new URLSearchParams({ tenant_id: scope.tenant_id, actor_id: scope.user_id ?? "axiom-user", reason: "Deleted from Memory Management" });
  await request(intentBase, `/memories/${encodeURIComponent(memoryId)}?${params}`, { method: "DELETE" });
}

export async function feedbackMemory(memoryId: string, observed_result: FeedbackResult, scope = memoryScope) {
  return request(intentBase, "/memory-feedback", { method: "POST", body: JSON.stringify({ tenant_id: scope.tenant_id, memory_id: memoryId, observed_result, actor_id: scope.user_id, trace_id: `memory-feedback-${Date.now()}` }) });
}

export async function recallMemory(query: string, resolvedIntent: string, tokenBudget: number, scope = memoryScope): Promise<RecallResult> {
  const raw = asRecord(await request<unknown>(intentBase, "/personalization/recall", { method: "POST", body: JSON.stringify({ ...scope, message: query, resolved_intent: resolvedIntent, limit: 8, token_budget: tokenBudget }) }));
  return { memories: arrayValue(raw.memories).map((item) => normalizeMemory(item)), bounded_context: stringValue(raw.bounded_context), raw };
}

export async function captureFromIntent(storedIntentId: string, scope = memoryScope) {
  return request(intentBase, "/personalization/capture", { method: "POST", body: JSON.stringify({ ...scope, stored_intent_id: storedIntentId, trace_id: `memory-capture-${Date.now()}` }) });
}

export async function queueExtraction(storedIntentId: string, scope = memoryScope) {
  const raw = asRecord(await request<unknown>(intentBase, "/memory-captures", { method: "POST", body: JSON.stringify({ ...scope, source_intent_ids: [storedIntentId], idempotency_key: `memory-pg-capture:${storedIntentId}:${Date.now()}` }) }));
  return stringValue(arrayValue(raw.job_ids)[0]);
}

export async function getExtractionJob(id: string, scope = memoryScope): Promise<ExtractionJob> {
  const raw = asRecord(await request<unknown>(intentBase, `/memory-extraction-jobs/${encodeURIComponent(id)}?tenant_id=${encodeURIComponent(scope.tenant_id)}`));
  return { id, status: ["queued", "captured", "failed"].includes(stringValue(raw.status)) ? stringValue(raw.status) as ExtractionJob["status"] : "unknown", message: stringValue(raw.detail) || stringValue(raw.message) || null, raw };
}

export async function forgetReme(memory: MemoryRecord, scope = memoryScope) {
  const source = memory.source_refs.find((ref) => ref.source_id.startsWith("reme:"));
  if (!source) throw new Error("This memory is not backed by ReMe.");
  return request(intentBase, "/memories/forget", { method: "POST", body: JSON.stringify({ ...scope, memory_id: memory.memory_id, source_id: source.source_id, actor_id: scope.user_id ?? "axiom-user", reason: "Forgotten from Memory Management" }) });
}

export async function listExperiences(scope = memoryScope) {
  const raw = asRecord(await request<unknown>(intentBase, `/experiences?${scopeParams(scope)}`));
  return arrayValue(raw.experiences).map(normalizeExperience);
}
export async function getExperience(id: string, scope = memoryScope) {
  return normalizeExperience(await request<unknown>(intentBase, `/experiences/${encodeURIComponent(id)}?tenant_id=${encodeURIComponent(scope.tenant_id)}`));
}
export async function searchExperiences(query: string, scope = memoryScope) {
  const raw = asRecord(await request<unknown>(intentBase, "/experiences/search", { method: "POST", body: JSON.stringify({ ...scope, query, limit: 50 }) }));
  return arrayValue(raw.experiences).map(normalizeExperience);
}
export async function createExperience(goal: string, lesson: string, sourceId: string, scope = memoryScope) {
  return normalizeExperience(await request<unknown>(intentBase, "/experiences", { method: "POST", body: JSON.stringify({ ...scope, goal, situation: { source: "memory-management" }, actions: [{ order: 1, action: "captured_from_ui" }], outcome: { status: "success", user_confirmed: true }, lesson, confidence: 0.8, source_refs: [{ source_type: "artifact", source_id: sourceId }] }) }));
}
export async function listProcedures(scope = memoryScope) {
  const raw = asRecord(await request<unknown>(intentBase, `/procedures?${scopeParams(scope)}`));
  return arrayValue(raw.procedures).map(normalizeProcedure);
}
export async function getProcedure(id: string, scope = memoryScope) {
  return normalizeProcedure(await request<unknown>(intentBase, `/procedures/${encodeURIComponent(id)}?tenant_id=${encodeURIComponent(scope.tenant_id)}`));
}
export async function searchProcedures(query: string, scope = memoryScope) {
  const raw = asRecord(await request<unknown>(intentBase, "/procedures/search", { method: "POST", body: JSON.stringify({ ...scope, query, limit: 50 }) }));
  return arrayValue(raw.procedures).map(normalizeProcedure);
}
export async function createProcedure(name: string, trigger: string, sourceId: string, scope = memoryScope) {
  return normalizeProcedure(await request<unknown>(intentBase, "/procedures", { method: "POST", body: JSON.stringify({ ...scope, name, trigger, preconditions: [], steps: [{ order: 1, action: "review_memory" }], failure_modes: [], confidence: 0.8, source_refs: [{ source_type: "artifact", source_id: sourceId }] }) }));
}
export async function feedbackProcedure(id: string, observed_result: Exclude<FeedbackResult, "irrelevant">, scope = memoryScope) {
  return request(intentBase, `/procedures/${encodeURIComponent(id)}/feedback`, { method: "POST", body: JSON.stringify({ tenant_id: scope.tenant_id, observed_result, actor_id: scope.user_id, trace_id: `procedure-feedback-${Date.now()}` }) });
}

export async function remeOperation(operation: "capture" | "search" | "dream" | "reindex", input: string) {
  if (!remeBase) throw new Error("ReMe API is not configured.");
  const actions = {
    capture: ["/auto_memory", { session_id: `${memoryScope.tenant_id}-${memoryScope.user_id ?? "user"}`, messages: [{ role: "user", name: memoryScope.user_id ?? "user", content: input, time_created: new Date().toISOString() }] }],
    search: ["/search", { query: input, limit: 5 }],
    dream: ["/auto_dream", { scan_days: 2, max_units: 5, topic_count: 3 }],
    reindex: ["/reindex", {}],
  } as const;
  const [path, body] = actions[operation];
  return request(remeBase, path, { method: "POST", body: JSON.stringify(body) });
}
