export type MemoryScope = {
  tenant_id: string;
  workspace_id: string | null;
  user_id: string | null;
  agent_id: string | null;
  session_id: string;
};

export type MemorySourceRef = {
  source_type?: string;
  source_id: string;
};

export type MemoryRecord = {
  id: string;
  memory_id: string;
  content: string;
  memory_type: string;
  confidence: number | null;
  importance: number | null;
  source_refs: MemorySourceRef[];
  created_at: string | null;
  updated_at: string | null;
  backend: "postgresql" | "reme" | "unknown";
  raw: Record<string, unknown>;
};

export type MemorySearchResult = MemoryRecord & {
  score: number | null;
  matched_by: string[];
};

export type RecallResult = {
  memories: MemorySearchResult[];
  bounded_context: string;
  raw: Record<string, unknown>;
};

export type ExperienceRecord = {
  id: string;
  goal: string;
  lesson: string;
  confidence: number | null;
  source_refs: MemorySourceRef[];
  created_at: string | null;
  raw: Record<string, unknown>;
};

export type ProcedureRecord = {
  id: string;
  name: string;
  trigger: string;
  confidence: number | null;
  source_refs: MemorySourceRef[];
  created_at: string | null;
  raw: Record<string, unknown>;
};

export type ExtractionJob = {
  id: string;
  status: "queued" | "captured" | "failed" | "unknown";
  message: string | null;
  raw: Record<string, unknown>;
};

export type ServiceStatus = "checking" | "online" | "offline";

export type FeedbackResult = "success" | "failure" | "irrelevant";
