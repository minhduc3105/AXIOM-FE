export type ChatStage = "welcome" | "pending" | "intent" | "process" | "result";
export type WorkflowStage = Exclude<ChatStage, "welcome" | "pending">;
export type ProcessStatus = "waiting" | "running" | "done" | "failed";
export type ChatEngine = "auto" | "general" | "reason" | "report";

export type ChatModelOption = {
  id: string;
  alias: string;
  label: string;
  status?: string;
};

export type Investigation = {
  question: string;
  attachments?: ChatAttachment[];
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

export type MockResult = {
  title: string;
  summary: string;
  markdown: string;
  metrics: ResultMetric[];
  flags: string[];
  evidence: EvidenceItem[];
  artifacts: string[];
};

export type ChatTurn = {
  investigation: Investigation;
  result: MockResult;
  processEvents?: ProcessEvent[];
};

export type ChatWorkflowState = {
  activeConversationId: string | null;
  stage: ChatStage;
  evidenceOpen: boolean;
  investigation: Investigation | null;
  draft: EditableSpecification | null;
  approvedSpecification: EditableSpecification | null;
  processEvents: ProcessEvent[];
  result: MockResult | null;
  history: ChatTurn[];
  loading: boolean;
  error: string | null;
};
