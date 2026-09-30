import type { ChatDataScope } from "./chatDataScope";

export type ChatStage = "welcome" | "pending" | "intent" | "process" | "result";
export type WorkflowStage = Exclude<ChatStage, "welcome" | "pending">;
export type ProcessStatus = "waiting" | "running" | "done" | "failed";
export type ChatEngine = "auto" | "general" | "reason" | "report";
export type ChatExecutionMode = "instant" | "thinking";
export type UserInputReason =
  | "ambiguous_query"
  | "method_definition"
  | "data_quality_issue"
  | "source_conflict"
  | "insufficient_evidence";

export type SafeguardDecision =
  | "clear"
  | "needs_user_input"
  | "blocked"
  | "abstained";
export type SafeguardCategory =
  | "data_quality"
  | "connection_risk"
  | "source_conflict"
  | "insufficient_evidence";
export type SafeguardSeverity =
  | "info"
  | "low"
  | "moderate"
  | "high"
  | "critical"
  | "unknown";

export type SafeguardFinding = {
  id: string;
  category: SafeguardCategory;
  severity: SafeguardSeverity;
  title: string;
  detail: string;
  impact?: string;
  affectedScope?: string;
  evidenceRefs: string[];
  blocking: boolean;
};

export type SafeguardAssessment = {
  decision: SafeguardDecision;
  findings: SafeguardFinding[];
};

export type UserInputOption = {
  id: string;
  label: string;
  description?: string;
  source?: string;
};

export type PendingUserInput = {
  responseId: string;
  interactionId: string;
  reason: UserInputReason;
  question: string;
  options: UserInputOption[];
  safeguardAssessment?: SafeguardAssessment;
};

export type UserInputAnswer =
  | { selectedOptionId: string }
  | { otherText: string };

export type ChatModelOption = {
  id: string;
  alias: string;
  label: string;
  status?: string;
  providerId?: string;
  providerName?: string;
  capability?: "llm" | "vlm";
};

export type Investigation = {
  question: string;
  replyContext?: string;
  attachments?: ChatAttachment[];
  dataScope?: ChatDataScope;
  confidence: number;
  intent: string;
  scope: string;
  specMarkdown: string;
  policy: string;
  output: string;
};

export type ChatAttachment = {
  name: string;
  size: number;
  type?: string;
};

export type EditableSpecification = Pick<
  Investigation,
  "intent" | "specMarkdown"
>;

export type ProcessEvent = {
  id: string;
  label: string;
  detail: string;
  status: ProcessStatus;
  phase?: string;
  eventType?: string;
  inputs?: unknown;
  outputs?: unknown;
  details?: Record<string, unknown>;
  artifactRefs?: string[];
  code?: {
    name?: string;
    language?: string;
    content?: string;
    truncated?: boolean;
  };
  error?: unknown;
};

export type ChatTranscriptItem =
  | {
      kind: "response";
      id: string;
      markdown: string;
    }
  | {
      kind: "action";
      id: string;
      event: ProcessEvent;
    };

export type ResultMetric = {
  label: string;
  value: string;
};

export type EvidenceItem = {
  id: string;
  source: string;
  locator: string;
  claim: string;
  tone: "success" | "warning";
};

export type CitationSource = {
  id: string;
  source: string;
  locator: string;
  excerpt: string;
  documentId?: string;
  contentId?: string;
};

export type CitationStatus = "complete" | "partial" | "unavailable";

export type MockResult = {
  responseComplete?: boolean;
  title: string;
  summary: string;
  markdown: string;
  metrics: ResultMetric[];
  flags: string[];
  evidence: EvidenceItem[];
  artifacts: string[];
  safeguardAssessment?: SafeguardAssessment;
  citationSources?: CitationSource[];
  uncitedClaims?: string[];
  citationStatus?: CitationStatus;
};

export type ChatTurn = {
  executionMode: ChatExecutionMode;
  investigation: Investigation;
  result: MockResult | null;
  error: ChatError | null;
  processEvents?: ProcessEvent[];
  transcript?: ChatTranscriptItem[];
};

export type ChatWorkflowState = {
  activeConversationId: string | null;
  executionMode: ChatExecutionMode;
  stage: ChatStage;
  evidenceOpen: boolean;
  investigation: Investigation | null;
  draft: EditableSpecification | null;
  approvedSpecification: EditableSpecification | null;
  processEvents: ProcessEvent[];
  transcript: ChatTranscriptItem[];
  result: MockResult | null;
  history: ChatTurn[];
  historyLoading: boolean;
  loading: boolean;
  error: ChatError | null;
  pendingUserInput: PendingUserInput | null;
};
import type { ChatError } from "./chatError";
