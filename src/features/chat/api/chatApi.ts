import type {
  EditableSpecification,
  EvidenceItem,
  ChatAttachment,
  ChatEngine,
  ChatExecutionMode,
  ChatTurn,
  Investigation,
  MockResult,
  ProcessEvent,
  ProcessStatus,
  ResultMetric,
} from "../model/types";
import {
  intelligenceApiUrl,
  listConversationMessagesPage,
} from "@/shared/lib/intelligence-api";
import { authFetch } from "@/features/auth/model/authFetch";
import type { IntelligenceMessage } from "@/shared/types/intelligence";
import { getChatError, type ChatError } from "../model/chatError";
import {
  allChatDataScope,
  chatDataScopeLabel,
  type ChatDataScope,
} from "../model/chatDataScope";

export class ChatApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly retryable: boolean | null;
  readonly cause: unknown;

  constructor({
    status,
    code = null,
    retryable = null,
    cause,
  }: {
    status: number | null;
    code?: string | null;
    retryable?: boolean | null;
    cause: unknown;
  }) {
    super("Chat request failed.");
    this.name = "ChatApiError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.cause = cause;
  }
}

type SseEvent = {
  type: string;
  response_id?: string;
  [key: string]: unknown;
};

type CapabilityRequirement = {
  name: string;
  description?: string | null;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  constraints: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

type EditableExecutionSpec = {
  intent?: string;
  objective?: string;
  data_requirements?: string[];
  capability_requirements?: CapabilityRequirement[];
  constraints?: Record<string, unknown>;
  confirmed?: boolean;
  engine_hint?: string | null;
};

type PendingConfirmation = {
  responseId: string;
  token: string;
  revision: number;
  intent: string;
  confidence: number;
  specMarkdown: string;
  spec?: EditableExecutionSpec;
};

type CompletedResponse = {
  responseId: string;
  outputText: string;
  evidence: unknown;
  metadata: Record<string, unknown>;
  processEvents: ProcessEvent[];
  pending?: boolean;
};

type HydratedAssistantResponse = {
  completed: CompletedResponse | null;
  error: ChatError | null;
};

type StreamOutcome = {
  confirmation?: PendingConfirmation;
  completed?: CompletedResponse;
  processEvents: ProcessEvent[];
  outputText: string;
};

type StreamCallbacks = {
  onProcessEvents?: (events: ProcessEvent[]) => void;
  onOutputText?: (result: MockResult) => void;
};

type CreateInvestigationOptions = {
  files?: File[];
  organizationId?: string | null;
  workspaceId?: string | null;
  modelAlias?: string | null;
  dataScope?: ChatDataScope;
  onProcessEvents?: (events: ProcessEvent[]) => void;
  onOutputText?: (result: MockResult) => void;
};

const defaultWorkspaceId = import.meta.env.VITE_AXIOM_WORKSPACE_ID ?? "default";

export type UploadedCorpusFile = {
  artifactId: string;
  filename: string;
  size: number;
  contentType?: string;
  fileRef: Record<string, unknown>;
};

export type ConversationHistorySnapshot = {
  turns: ChatTurn[];
  pendingInvestigation: Investigation | null;
  pendingQuestion: string | null;
  pendingExecutionMode: ChatExecutionMode;
  pendingResponse: boolean;
};

export type InitialChatOutcome =
  | { kind: "confirmation"; investigation: Investigation }
  | {
      kind: "completed";
      investigation: Investigation;
      result: MockResult;
      processEvents: ProcessEvent[];
    };

let pendingConfirmation: PendingConfirmation | null = null;

export function createProcessEvents(): ProcessEvent[] {
  return [];
}

export async function loadConversationHistory(
  conversationId: string,
  signal?: AbortSignal,
): Promise<ConversationHistorySnapshot> {
  const messages: IntelligenceMessage[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const payload = await listConversationMessagesPage(
      conversationId,
      { page },
      signal,
    );
    if (Array.isArray(payload.items)) messages.push(...payload.items);
    hasNextPage = payload.pagination?.has_next === true;
    page += 1;
  }

  return messagesToChatTurns(messages);
}

export async function createInvestigation(
  question: string,
  conversationId: string | null = null,
  engine: ChatEngine = "auto",
  executionMode: ChatExecutionMode = "thinking",
  signal?: AbortSignal,
  options: CreateInvestigationOptions | ((result: MockResult) => void) = {},
): Promise<InitialChatOutcome> {
  pendingConfirmation = null;
  const sessionId = conversationId ?? crypto.randomUUID();
  const resolvedOptions =
    typeof options === "function" ? { onOutputText: options } : options;
  const workspaceId = resolvedOptions.workspaceId?.trim() || defaultWorkspaceId;
  const uploadedFiles =
    conversationId && resolvedOptions.files?.length
      ? await uploadCorpusFiles(
          conversationId,
          resolvedOptions.organizationId,
          workspaceId,
          resolvedOptions.files,
          signal,
        )
      : [];
  const response = await postJson(
    "/api/v1/responses",
    {
      input: question,
      session_id: sessionId,
      conversation_id: conversationId,
      workspace_id: workspaceId,
      uploaded_files: uploadedFiles.map((file) => ({
        filename: file.filename,
        size: file.size,
        content_type: file.contentType,
        metadata: { file_ref: file.fileRef },
      })),
      input_artifact_ids: uploadedFiles.map((file) => file.artifactId),
      execution_mode: executionMode,
      ...(resolvedOptions.dataScope?.mode === "selected"
        ? { data_scope: serializeDataScope(resolvedOptions.dataScope) }
        : {}),
      runtime_options: {
        engine,
        ...(resolvedOptions.modelAlias
          ? { model: resolvedOptions.modelAlias }
          : {}),
      },
    },
    signal,
  );
  const outcome = await readResponseStream(response, signal, {
    onOutputText: resolvedOptions.onOutputText,
    onProcessEvents: resolvedOptions.onProcessEvents,
  });

  if (executionMode === "instant" && outcome.confirmation) {
    throw new Error("Instant execution unexpectedly requested confirmation.");
  }

  if (outcome.completed) {
    return {
      kind: "completed",
      investigation:
        executionMode === "instant"
          ? instantEngineInvestigation(question)
          : directAnswerInvestigation(question),
      result: completedToResult(outcome.completed),
      processEvents: outcome.processEvents,
    };
  }

  if (!outcome.confirmation)
    throw new Error("The intelligence service returned no usable outcome.");

  pendingConfirmation = outcome.confirmation;
  return {
    kind: "confirmation",
    investigation: confirmationToInvestigation(outcome.confirmation, question),
  };
}

function serializeDataScope(scope: ChatDataScope) {
  if (scope.mode === "all") return { mode: "all" };
  return {
    mode: "selected",
    resource_ids: scope.resourceIds,
    resource_names: scope.resourceNames,
  };
}

export async function uploadCorpusFiles(
  conversationId: string,
  organizationId: string | null | undefined,
  workspaceId: string,
  files: File[],
  signal?: AbortSignal,
): Promise<UploadedCorpusFile[]> {
  if (!files.length) return [];
  if (!organizationId?.trim()) {
    throw new Error(
      "Organization ID is required before uploading attachments.",
    );
  }
  const formData = new FormData();
  formData.append("workspace_id", workspaceId);
  files.forEach((file) => formData.append("files", file));

  const response = await authFetch(
    intelligenceApiUrl(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/attachments`,
    ),
    { method: "POST", body: formData, signal },
  );
  if (!response.ok) {
    throw new ChatApiError({
      status: response.status,
      ...(await responseErrorDetails(response)),
    });
  }

  const payload: unknown = await response.json();
  const data = asRecord(asRecord(payload).data);
  const rawFiles = Array.isArray(data.files) ? data.files : [];
  const uploaded = rawFiles.flatMap((item, index) => {
    const record = asRecord(item);
    const fileRef = asRecord(record.file_ref);
    const artifactId =
      stringValue(fileRef.file_id) || stringValue(fileRef.object_key);
    if (!artifactId || !stringValue(fileRef.url)) return [];
    return [
      {
        artifactId,
        filename:
          stringValue(record.filename) || files[index]?.name || "upload",
        size: numberValue(record.size),
        contentType: files[index]?.type || undefined,
        fileRef,
      },
    ];
  });

  if (uploaded.length !== files.length) {
    throw new Error("Upload succeeded but returned incomplete file paths.");
  }
  return uploaded;
}

export async function runWorkflow(
  specification: EditableSpecification,
  onProcessEvents: (events: ProcessEvent[]) => void,
  signal?: AbortSignal,
): Promise<MockResult> {
  if (!pendingConfirmation) {
    throw new Error("No pending AXIOM response is ready to run.");
  }

  let confirmation = pendingConfirmation;
  if (specificationChanged(specification, confirmation)) {
    const reviseResponse = await postDecision(
      confirmation,
      {
        action: "revise",
        revision: confirmation.revision,
        feedback:
          specification.intent !== confirmation.intent
            ? `Use intent: ${specification.intent}`
            : undefined,
        spec_markdown: specification.specMarkdown,
      },
      signal,
    );
    const reviseOutcome = await readResponseStream(reviseResponse, signal, {
      onProcessEvents,
    });
    if (reviseOutcome.completed) {
      pendingConfirmation = null;
      markAllDone(reviseOutcome.processEvents, onProcessEvents);
      return completedToResult(reviseOutcome.completed);
    }
    if (!reviseOutcome.confirmation) {
      throw new Error(
        "The intelligence service did not return a revised confirmation plan.",
      );
    }
    confirmation = reviseOutcome.confirmation;
    pendingConfirmation = confirmation;
  }

  const confirmResponse = await postDecision(
    confirmation,
    { action: "confirm", revision: confirmation.revision },
    signal,
  );
  const outcome = await readResponseStream(confirmResponse, signal, {
    onProcessEvents,
  });

  if (!outcome.completed) {
    throw new Error("The intelligence service did not complete the response.");
  }

  pendingConfirmation = null;
  markAllDone(outcome.processEvents, onProcessEvents);
  return completedToResult(outcome.completed);
}

export async function reviseInvestigation(
  specification: EditableSpecification,
  feedback: string,
  question: string,
  signal?: AbortSignal,
): Promise<Investigation> {
  if (!pendingConfirmation) {
    throw new Error("No pending AXIOM response is ready to revise.");
  }

  const response = await postDecision(
    pendingConfirmation,
    {
      action: "revise",
      revision: pendingConfirmation.revision,
      feedback,
      spec_markdown: specification.specMarkdown,
    },
    signal,
  );
  const outcome = await readResponseStream(response, signal);

  if (!outcome.confirmation) {
    throw new Error(
      "The intelligence service did not return a revised confirmation plan.",
    );
  }

  pendingConfirmation = outcome.confirmation;
  return confirmationToInvestigation(outcome.confirmation, question);
}

async function postJson(path: string, body: unknown, signal?: AbortSignal) {
  const response = await authFetch(intelligenceApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new ChatApiError({
      status: response.status,
      ...(await responseErrorDetails(response)),
    });
  }
  return response;
}

function postDecision(
  confirmation: PendingConfirmation,
  body: unknown,
  signal?: AbortSignal,
) {
  return postJsonWithHeaders(
    `/api/v1/responses/${encodeURIComponent(confirmation.responseId)}/decision`,
    body,
    { "X-Confirmation-Token": confirmation.token },
    signal,
  );
}

async function postJsonWithHeaders(
  path: string,
  body: unknown,
  headers: Record<string, string>,
  signal?: AbortSignal,
) {
  const response = await authFetch(intelligenceApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new ChatApiError({
      status: response.status,
      ...(await responseErrorDetails(response)),
    });
  }
  return response;
}

async function responseErrorDetails(response: Response) {
  const fallback = `AXIOM Intelligence API returned ${response.status}.`;
  try {
    const text = await response.text();
    if (!text) return { cause: fallback };
    try {
      const payload = asRecord(JSON.parse(text));
      const error = asRecord(payload.error);
      const detail = asRecord(payload.detail);
      return {
        cause:
          stringValue(error.message) ||
          stringValue(detail.message) ||
          stringValue(payload.message) ||
          text,
        code:
          stringValue(error.code) ||
          stringValue(detail.code) ||
          stringValue(payload.code) ||
          null,
        retryable:
          booleanValue(error.retryable) ??
          booleanValue(detail.retryable) ??
          booleanValue(payload.retryable) ??
          null,
      };
    } catch {
      return { cause: text };
    }
    return { cause: text };
  } catch {
    return { cause: fallback };
  }
}

async function readResponseStream(
  response: Response,
  signal?: AbortSignal,
  callbacks?: StreamCallbacks,
): Promise<StreamOutcome> {
  if (!response.body)
    throw new Error(
      "The intelligence service returned an empty response stream.",
    );
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new ResponsesSSEParser();
  const outcome: StreamOutcome = { processEvents: [], outputText: "" };
  let latestResponseId: string | null = null;
  let cancellationSent = false;
  const notifyCancellation = () => {
    if (!latestResponseId || cancellationSent) return;
    cancellationSent = true;
    void postJson(
      `/api/v1/responses/${encodeURIComponent(latestResponseId)}/cancel`,
      {},
    ).catch(() => undefined);
  };
  const cancelReader = () => {
    notifyCancellation();
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", cancelReader);
  if (signal?.aborted) cancelReader();

  try {
    while (true) {
      if (signal?.aborted)
        throw new DOMException("The request was aborted.", "AbortError");
      const { done, value } = await reader.read();
      if (signal?.aborted)
        throw new DOMException("The request was aborted.", "AbortError");
      const events = done
        ? parser.finish()
        : parser.push(decoder.decode(value, { stream: true }));
      for (const event of events) {
        if (signal?.aborted)
          throw new DOMException("The request was aborted.", "AbortError");
        if (typeof event.response_id === "string") {
          latestResponseId = event.response_id;
          if (signal?.aborted) notifyCancellation();
        }
        applyStreamEvent(event, outcome, callbacks);
      }
      if (done) break;
    }
  } finally {
    signal?.removeEventListener("abort", cancelReader);
    try {
      reader.releaseLock();
    } catch {
      // The reader may already be released as part of abort cleanup.
    }
  }

  return outcome;
}

function applyStreamEvent(
  event: SseEvent,
  outcome: StreamOutcome,
  callbacks?: StreamCallbacks,
) {
  if (event.type === "delta") {
    const delta = rawStringValue(event.content);
    if (delta) {
      outcome.outputText += delta;
      callbacks?.onOutputText?.(
        completedToResult(
          streamingCompletedResponse(event, outcome.outputText),
        ),
      );
    }
    return;
  }

  if (isLambdaProcessEvent(event.type)) {
    const processEvent = {
      ...event,
      type: `pipeline.lambda.${event.type}`,
      event_id: lambdaEventId(event, outcome.processEvents.length),
      label: lambdaEventLabel(event),
      details: event,
    };
    outcome.processEvents = upsertProcessEvent(
      outcome.processEvents,
      processEventFromApiEvent(processEvent),
    );
    callbacks?.onProcessEvents?.(outcome.processEvents);
    return;
  }

  if (event.type.startsWith("pipeline.")) {
    outcome.processEvents = upsertProcessEvent(
      outcome.processEvents,
      processEventFromApiEvent(event),
    );
    callbacks?.onProcessEvents?.(outcome.processEvents);
  }

  if (event.type === "response.output_text.delta") {
    const delta = rawStringValue(event.delta);
    if (delta) {
      outcome.outputText += delta;
      callbacks?.onOutputText?.(
        completedToResult(
          streamingCompletedResponse(event, outcome.outputText),
        ),
      );
    }
    return;
  }

  if (event.type === "response.output_text.done") {
    const text = stringValue(event.text) || outcome.outputText;
    outcome.outputText = text;
    if (text) {
      callbacks?.onOutputText?.(
        completedToResult(streamingCompletedResponse(event, text)),
      );
    }
    return;
  }

  if (event.type === "response.requires_confirmation") {
    outcome.confirmation = confirmationFromEvent(event);
    return;
  }

  if (event.type === "response.completed") {
    const completed = completedFromEvent(event, outcome.outputText);
    outcome.completed = completed;
    const artifactEvent = completionArtifactProcessEvent(completed);
    if (artifactEvent) {
      outcome.processEvents = upsertProcessEvent(
        outcome.processEvents,
        artifactEvent,
      );
      callbacks?.onProcessEvents?.(outcome.processEvents);
    }
    return;
  }

  if (
    event.type === "response.cancelled" ||
    event.type === "response.canceled"
  ) {
    const error = asRecord(event.error);
    throw new ChatApiError({
      status: null,
      code: "cancelled",
      retryable: false,
      cause:
        stringValue(error.message) || "The intelligence response was stopped.",
    });
  }

  if (event.type === "response.failed") {
    const error = asRecord(event.error);
    throw new ChatApiError({
      status: null,
      code: stringValue(error.code) || null,
      retryable: booleanValue(error.retryable),
      cause: stringValue(error.message) || "The intelligence response failed.",
    });
  }
}

function isLambdaProcessEvent(type: string) {
  return ["status", "tool_call", "tool_result", "keepalive"].includes(type);
}

function lambdaEventId(event: SseEvent, index: number) {
  const toolCall = asRecord(event.tool_call);
  const toolCallId =
    stringValue(event.tool_call_id) || stringValue(toolCall.id);
  const step = stringValue(event.step);
  if (toolCallId) return ["tool", toolCallId].join(":");
  return [event.type, step, toolCallId, String(index)]
    .filter(Boolean)
    .join(":");
}

function lambdaEventLabel(event: SseEvent) {
  const toolCall = asRecord(event.tool_call);
  const fn = asRecord(toolCall.function);
  return (
    stringValue(event.tool_name) ||
    stringValue(fn.name) ||
    stringValue(event.content) ||
    event.type
  );
}

function confirmationFromEvent(event: SseEvent): PendingConfirmation {
  const responseId =
    stringValue(event.response_id) || stringValue(event.responseId);
  const token = stringValue(event.confirmation_token);
  if (!responseId || !token)
    throw new Error(
      "The confirmation event was missing required response data.",
    );

  const intent = asRecord(event.intent);
  const rawSpec = asRecord(event.spec);
  const spec = Object.keys(rawSpec).length
    ? (rawSpec as EditableExecutionSpec)
    : undefined;
  const specMarkdown =
    stringValue(event.spec_markdown) ||
    stringValue(event.specMarkdown) ||
    legacySpecToMarkdown(spec);
  return {
    responseId,
    token,
    revision: numberValue(event.revision) || 1,
    intent:
      stringValue(intent.value) ||
      stringValue(spec?.intent) ||
      titleFromMarkdown(specMarkdown) ||
      "workflow_specification",
    confidence: percentValue(intent.confidence),
    specMarkdown,
    spec,
  };
}

function completedFromEvent(
  event: SseEvent,
  streamedOutputText = "",
): CompletedResponse {
  const response = asRecord(event.response);
  return {
    responseId:
      stringValue(event.response_id) || stringValue(response.id) || "",
    outputText:
      stringValue(response.output_text) ||
      stringValue(event.output_text) ||
      streamedOutputText,
    evidence: event.evidence,
    metadata: asRecord(event.metadata),
    processEvents: [],
  };
}

function streamingCompletedResponse(
  event: SseEvent,
  outputText: string,
): CompletedResponse {
  return {
    responseId: stringValue(event.response_id) || "",
    outputText,
    evidence: null,
    metadata: { route: "general_direct" },
    processEvents: [],
  };
}

function confirmationToInvestigation(
  confirmation: PendingConfirmation,
  question: string,
): Investigation {
  const constraints = asRecord(confirmation.spec?.constraints);
  return {
    question,
    confidence: confirmation.confidence,
    intent: confirmation.intent,
    scope:
      stringValue(confirmation.spec?.objective) ||
      titleFromMarkdown(confirmation.specMarkdown) ||
      summaryFromMarkdown(confirmation.specMarkdown),
    specMarkdown: confirmation.specMarkdown,
    policy:
      stringValue(constraints.policy) ||
      stringValue(constraints.execution_policy),
    output: capabilityOutputSummary(confirmation.spec?.capability_requirements),
  };
}

function directAnswerInvestigation(question: string): Investigation {
  return {
    question,
    confidence: 100,
    intent: "general_direct",
    scope: "Answered from general knowledge or conversation context.",
    specMarkdown: "",
    policy: "No data workflow or engine execution was required.",
    output: "Direct answer",
  };
}

export function instantEngineInvestigation(question: string): Investigation {
  return {
    question,
    confidence: 100,
    intent: "instant_engine",
    scope: "Executed immediately by the selected AXIOM engine.",
    specMarkdown: "",
    policy: "AXIOM engine routing and request-scoped authorization.",
    output: "Engine response and available artifact references",
  };
}

function completedToResult(completed: CompletedResponse): MockResult {
  const markdown =
    completed.outputText.trim() || "No response text was returned.";
  const metadata = completed.metadata;
  const evidence = normalizeEvidence(completed.evidence);
  return {
    title:
      stringValue(metadata.title) ||
      titleFromMarkdown(markdown) ||
      "AXIOM response",
    summary: stringValue(metadata.summary) || summaryFromMarkdown(markdown),
    markdown,
    metrics: normalizeMetrics(metadata.metrics),
    flags: normalizeFlags(metadata.flags, evidence),
    evidence,
    artifacts: normalizeArtifacts(metadata),
  };
}

function specificationChanged(
  specification: EditableSpecification,
  confirmation: PendingConfirmation,
) {
  return (
    specification.intent !== confirmation.intent ||
    specification.specMarkdown.trim() !== confirmation.specMarkdown.trim()
  );
}

function legacySpecToMarkdown(spec: EditableExecutionSpec | undefined) {
  if (!spec) return "";
  const dataRequirements = spec.data_requirements || [];
  const capabilityRequirements = spec.capability_requirements || [];
  const constraints = asRecord(spec.constraints);
  const lines = [
    "# Workflow specification",
    "",
    stringValue(spec.objective) ? `## Objective\n${spec.objective}` : "",
    dataRequirements.length
      ? `## Data requirements\n${dataRequirements.map((item) => `- ${item}`).join("\n")}`
      : "",
    capabilityRequirements.length
      ? `## Capabilities\n${capabilityRequirements
          .map((item) => `- ${item.name || "Capability"}`)
          .join("\n")}`
      : "",
    Object.keys(constraints).length
      ? `## Constraints\n${Object.entries(constraints)
          .map(([key, value]) => `- **${key}:** ${String(value)}`)
          .join("\n")}`
      : "",
    stringValue(spec.engine_hint)
      ? `## Engine preference\n${spec.engine_hint}`
      : "",
  ];

  return lines.filter(Boolean).join("\n\n");
}

function capabilityOutputSummary(
  requirements: CapabilityRequirement[] | undefined,
) {
  const outputNames = (requirements || []).flatMap((requirement) => {
    const title = stringValue(requirement.output_schema?.title);
    const description = stringValue(requirement.output_schema?.description);
    const type = stringValue(requirement.output_schema?.type);
    return title || description || type ? [title || description || type] : [];
  });

  return outputNames.join(", ");
}

function upsertProcessEvent(
  events: ProcessEvent[],
  nextEvent: ProcessEvent,
): ProcessEvent[] {
  const preparedEvents = events.map((event) =>
    event.status === "running" ? { ...event, status: "done" as const } : event,
  );
  const existingIndex = preparedEvents.findIndex(
    (event) => event.id === nextEvent.id,
  );

  if (existingIndex < 0) return [...preparedEvents, nextEvent];

  return preparedEvents.map((event, index) =>
    index === existingIndex ? { ...event, ...nextEvent } : event,
  );
}

function processEventFromApiEvent(event: SseEvent): ProcessEvent {
  const explicitStep = asRecord(event.step);
  const runtimeFields = processRuntimeFields(event, explicitStep);
  const runtime = event.type === "pipeline.runtime_event";
  const toolCall = asRecord(event.tool_call);
  const eventId =
    stringValue(explicitStep.id) ||
    stringValue(event.step_id) ||
    stringValue(event.tool_call_id) ||
    stringValue(toolCall.id) ||
    stringValue(event.event_id) ||
    stringValue(event.sequence) ||
    stringValue(event.name) ||
    stringValue(event.event_type) ||
    event.type;
  const label =
    stringValue(explicitStep.label) ||
    stringValue(explicitStep.title) ||
    stringValue(event.label) ||
    stringValue(event.title) ||
    stringValue(event.name) ||
    stringValue(event.event_type) ||
    event.type;
  const detail =
    stringValue(explicitStep.detail) ||
    stringValue(explicitStep.description) ||
    stringValue(event.detail) ||
    stringValue(event.description) ||
    processEventDetail(event);

  return {
    id: runtime ? `${event.type}:${eventId}` : eventId,
    label: humanizeEventName(label),
    detail,
    status: normalizeProcessStatus(event.status, event.type),
    ...runtimeFields,
  };
}

function processRuntimeFields(
  event: Record<string, unknown>,
  explicitStep: Record<string, unknown> = {},
): Partial<ProcessEvent> {
  const details = asRecord(event.details);
  const detailToolCall = asRecord(details.tool_call);
  const detailToolFunction = asRecord(detailToolCall.function);
  const inputs = firstPresent(
    details.inputs,
    parseJsonString(detailToolFunction.arguments) ||
      detailToolFunction.arguments,
    detailToolCall,
    event.inputs,
    explicitStep.inputs,
    event.input,
    explicitStep.input,
    event.action_input,
    event.actionInput,
  );
  const outputs = firstPresent(
    details.outputs,
    details.result,
    event.outputs,
    explicitStep.outputs,
    event.output,
    explicitStep.output,
    event.result,
  );
  const artifactRefs = stringArrayValue(
    firstPresent(
      event.artifact_refs,
      event.artifactRefs,
      details.artifact_refs,
      details.artifactRefs,
    ),
  );
  const code = normalizeProcessCode(firstPresent(event.code, details.code));
  const error = firstPresent(event.error, details.error);
  const fields: Partial<ProcessEvent> = {};
  const phase = stringValue(event.phase);
  const eventType = stringValue(event.event_type) || stringValue(event.type);

  if (phase) fields.phase = phase;
  if (eventType) fields.eventType = eventType;
  if (hasRuntimeValue(inputs)) fields.inputs = inputs;
  if (hasRuntimeValue(outputs)) fields.outputs = outputs;
  if (Object.keys(details).length > 0) fields.details = details;
  if (artifactRefs.length > 0) fields.artifactRefs = artifactRefs;
  if (code) fields.code = code;
  if (hasRuntimeValue(error)) fields.error = error;

  return fields;
}

function firstPresent(...values: unknown[]) {
  return values.find(hasRuntimeValue);
}

function parseJsonString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function hasRuntimeValue(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function normalizeProcessCode(
  value: unknown,
): ProcessEvent["code"] | undefined {
  const record = asRecord(value);
  const content = stringValue(record.content) || stringValue(record.code);
  if (!content) return undefined;

  return {
    name:
      stringValue(record.name) ||
      stringValue(record.filename) ||
      artifactNameFromRef(stringValue(record.artifact_ref)),
    language: stringValue(record.language) || stringValue(record.lang),
    content,
    truncated: Boolean(record.truncated),
  };
}

function artifactNameFromRef(ref: string) {
  if (!ref) return "";
  return (
    ref
      .replace(/^artifact:\/\//, "")
      .split("/")
      .filter(Boolean)
      .pop() || ""
  );
}

function stringArrayValue(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function processEventDetail(event: SseEvent) {
  const details = asRecord(event.details);
  const parts = [
    stringValue(event.content),
    stringValue(details.content),
    stringValue(event.phase),
    stringValue(event.engine),
    stringValue(event.objective),
    stringValue(event.source),
  ];
  return parts.filter(Boolean).join(" · ");
}

function normalizeProcessStatus(
  rawStatus: unknown,
  eventType: string,
): ProcessStatus {
  const status = String(rawStatus || "").toLowerCase();
  if (
    eventType === "pipeline.completed" ||
    ["complete", "completed", "done", "success", "succeeded"].includes(status)
  ) {
    return "done";
  }
  if (
    eventType === "pipeline.failed" ||
    ["failed", "failure", "error", "errored"].includes(status)
  ) {
    return "failed";
  }
  return "running";
}

function markAllDone(
  events: ProcessEvent[],
  onProcessEvents: (events: ProcessEvent[]) => void,
) {
  if (events.length === 0) return;
  onProcessEvents(events.map((event) => ({ ...event, status: "done" })));
}

function messagesToChatTurns(
  messages: IntelligenceMessage[],
): ConversationHistorySnapshot {
  const orderedMessages = [...messages].sort(
    (first, second) =>
      Date.parse(first.created_at) - Date.parse(second.created_at),
  );
  const turns: ChatTurn[] = [];
  let pendingQuestion: string | null = null;
  let pendingAttachments: ChatAttachment[] = [];
  let pendingDataScope: ChatDataScope | undefined;
  let pendingExecutionMode: ChatExecutionMode = "thinking";
  let pendingInvestigation: Investigation | null = null;
  let historyConfirmation: PendingConfirmation | null = null;
  let pendingResponse = false;

  for (const message of orderedMessages) {
    if (message.role === "user") {
      pendingQuestion = userQuestionFromMessage(message) || pendingQuestion;
      pendingAttachments = attachmentsFromMessage(message);
      pendingDataScope = dataScopeFromMessage(message);
      pendingExecutionMode = executionModeFromMessage(message);
      pendingInvestigation = null;
      historyConfirmation = null;
      continue;
    }

    if (message.role === "system") {
      const confirmation = confirmationFromMessage(message);
      if (confirmation) {
        const question = pendingQuestion || "Conversation response";
        pendingInvestigation = confirmationToInvestigation(
          confirmation,
          question,
        );
        pendingInvestigation = withSubmissionContext(
          pendingInvestigation,
          pendingAttachments,
          pendingDataScope,
        );
        historyConfirmation = confirmation;
      }
      continue;
    }

    if (message.role !== "assistant") continue;

    const hydrated = completedResponseFromMessage(message);
    if (!hydrated) continue;

    const question =
      pendingQuestion ||
      pendingInvestigation?.question ||
      "Conversation response";
    pendingResponse = Boolean(hydrated.completed?.pending);
    turns.push({
      executionMode: pendingExecutionMode,
      investigation:
        pendingExecutionMode === "instant"
          ? withSubmissionContext(
              instantEngineInvestigation(question),
              pendingAttachments,
              pendingDataScope,
            )
          : withSubmissionContext(
              pendingInvestigation || storedInvestigation(question),
              pendingAttachments,
              pendingDataScope,
            ),
      result: hydrated.completed ? completedToResult(hydrated.completed) : null,
      error: hydrated.error,
      processEvents:
        hydrated.completed?.processEvents ?? processEventsFromMessage(message),
    });
    pendingQuestion = null;
    pendingAttachments = [];
    pendingDataScope = undefined;
    pendingInvestigation = null;
    historyConfirmation = null;
    pendingExecutionMode = "thinking";
  }

  pendingConfirmation = historyConfirmation;

  return {
    turns,
    pendingInvestigation,
    pendingQuestion,
    pendingExecutionMode,
    pendingResponse,
  };
}

function executionModeFromMessage(
  message: IntelligenceMessage,
): ChatExecutionMode {
  const mode = stringValue(asRecord(message.content).execution_mode);
  return mode === "instant" ? "instant" : "thinking";
}

function userQuestionFromMessage(message: IntelligenceMessage) {
  const content = message.content;
  if (typeof content === "string") return content;
  const record = asRecord(content);
  return (
    stringValue(record.input) ||
    stringValue(record.text) ||
    stringValue(record.question) ||
    ""
  );
}

function attachmentsFromMessage(
  message: IntelligenceMessage,
): ChatAttachment[] {
  const uploadedFiles = asRecord(message.content).uploaded_files;
  if (!Array.isArray(uploadedFiles)) return [];

  return uploadedFiles.flatMap((item) => {
    const file = asRecord(item);
    const name = stringValue(file.filename) || stringValue(file.name);
    if (!name) return [];
    const type =
      stringValue(file.content_type) ||
      stringValue(file.contentType) ||
      stringValue(file.type);
    return [
      {
        name,
        size: numberValue(file.size),
        ...(type ? { type } : {}),
      },
    ];
  });
}

function dataScopeFromMessage(
  message: IntelligenceMessage,
): ChatDataScope | undefined {
  const rawScope = asRecord(asRecord(message.content).data_scope);
  const mode = stringValue(rawScope.mode);
  if (mode === "all") return allChatDataScope;
  if (mode !== "selected") return undefined;

  const resourceIds = stringArrayValue(rawScope.resource_ids);
  if (resourceIds.length === 0) return allChatDataScope;
  const resourceNames = stringArrayValue(rawScope.resource_names);
  return {
    mode: "selected",
    resourceIds,
    resourceNames:
      resourceNames.length === resourceIds.length ? resourceNames : resourceIds,
  };
}

function withSubmissionContext(
  investigation: Investigation,
  attachments: ChatAttachment[],
  dataScope?: ChatDataScope,
): Investigation {
  return {
    ...investigation,
    ...(attachments.length ? { attachments } : {}),
    ...(dataScope
      ? { dataScope, scope: chatDataScopeLabel(dataScope) }
      : {}),
  };
}

function completedResponseFromMessage(
  message: IntelligenceMessage,
): HydratedAssistantResponse | null {
  const content = message.content;
  const record = asRecord(content);
  const response = asRecord(record.response);
  const failed = isFailedAssistantStatus(message.status);
  const error = failed
    ? historyErrorFromMessage(message, record, response)
    : null;
  const outputText =
    stringValue(record.output_text) ||
    stringValue(response.output_text) ||
    (!failed && typeof content === "string" ? content : "");

  if (!outputText && !error) return null;
  if (!outputText) return { completed: null, error };

  const completed = {
    responseId: message.response_id || stringValue(response.id),
    outputText,
    evidence: record.evidence,
    metadata: {
      ...message.metadata,
      ...asRecord(record.metadata),
    },
    processEvents: processEventsFromMessage(message),
    pending: !isTerminalAssistantStatus(message.status),
  };
  const artifactEvent = completionArtifactProcessEvent(completed);
  if (artifactEvent) {
    completed.processEvents = upsertProcessEvent(
      completed.processEvents,
      artifactEvent,
    );
  }
  return { completed, error };
}

function historyErrorFromMessage(
  message: IntelligenceMessage,
  record: Record<string, unknown>,
  response: Record<string, unknown>,
) {
  const error = asRecord(record.error);
  const cancelled = ["cancelled", "canceled"].includes(
    message.status.toLowerCase(),
  );
  return getChatError(
    new ChatApiError({
      status: null,
      code:
        (cancelled ? "cancelled" : stringValue(error.code)) ||
        stringValue(record.code) ||
        null,
      retryable: cancelled ? false : booleanValue(error.retryable),
      cause:
        stringValue(error.message) ||
        stringValue(record.message) ||
        stringValue(response.error) ||
        "The intelligence response failed.",
    }),
  );
}

function completionArtifactProcessEvent(
  completed: CompletedResponse,
): ProcessEvent | null {
  const artifacts = finalizedArtifactRecords(completed.metadata);
  if (artifacts.length === 0) return null;
  return {
    id: `artifacts:${completed.responseId || "response"}`,
    label: "Generated files",
    detail: `${artifacts.length} finalized ${artifacts.length === 1 ? "file" : "files"}`,
    status: "done",
    phase: "artifact",
    eventType: "runtime.completed",
    outputs: { artifacts },
  };
}

function finalizedArtifactRecords(metadata: Record<string, unknown>) {
  for (const value of [
    metadata.generated_files,
    metadata.generatedFiles,
    metadata.artifacts,
  ]) {
    if (!Array.isArray(value)) continue;
    const records = value
      .map(asRecord)
      .filter((record) => Object.keys(record).length > 0);
    if (records.length > 0) return records;
  }
  return [];
}

function isTerminalAssistantStatus(status: string) {
  const normalized = status.toLowerCase();
  return [
    "completed",
    "complete",
    "done",
    "success",
    "failed",
    "error",
    "cancelled",
    "canceled",
  ].includes(normalized);
}

function isFailedAssistantStatus(status: string) {
  return ["failed", "error", "cancelled", "canceled"].includes(
    status.toLowerCase(),
  );
}

function confirmationFromMessage(
  message: IntelligenceMessage,
): PendingConfirmation | null {
  const content = asRecord(message.content);
  const eventType = stringValue(content.type) || message.status;
  if (
    eventType !== "response.requires_confirmation" &&
    eventType !== "requires_confirmation"
  ) {
    return null;
  }

  try {
    return confirmationFromEvent({
      ...content,
      response_id:
        stringValue(content.response_id) || message.response_id || undefined,
      type: "response.requires_confirmation",
    });
  } catch {
    return null;
  }
}

function processEventsFromMessage(
  message: IntelligenceMessage,
): ProcessEvent[] {
  const content = asRecord(message.content);
  const metadata = { ...message.metadata, ...asRecord(content.metadata) };
  const candidates = [
    content.steps,
    content.process_events,
    content.processEvents,
    content.pipeline_events,
    content.pipelineEvents,
    content.trace,
    metadata.steps,
    metadata.process_events,
    metadata.processEvents,
    metadata.pipeline_events,
    metadata.pipelineEvents,
    metadata.trace,
  ];

  for (const candidate of candidates) {
    const events = normalizeStoredProcessEvents(candidate);
    if (events.length > 0) return events;
  }
  return [];
}

function normalizeStoredProcessEvents(value: unknown): ProcessEvent[] {
  const items = Array.isArray(value)
    ? value
    : Object.entries(asRecord(value)).map(([id, step]) => ({
        id,
        ...asRecord(step),
      }));

  const normalizedEvents = items.flatMap((item) => {
    const record = asRecord(item);
    const eventType = stringValue(record.type);
    if (eventType.startsWith("pipeline.")) {
      return [processEventFromApiEvent(record as SseEvent)];
    }
    if (eventType === "runtime.progress") {
      return [
        processEventFromApiEvent(
          normalizeLegacyRuntimeProgressEvent(record as SseEvent),
        ),
      ];
    }

    const id =
      stringValue(record.id) ||
      stringValue(record.step_id) ||
      stringValue(record.name) ||
      stringValue(record.title);
    if (!id) return [];

    return [
      {
        id,
        label: humanizeEventName(
          stringValue(record.label) ||
            stringValue(record.title) ||
            stringValue(record.name) ||
            id,
        ),
        detail:
          stringValue(record.detail) || stringValue(record.description) || "",
        status: normalizeStoredProcessStatus(record.status),
        ...processRuntimeFields(record),
      },
    ];
  });

  return normalizedEvents.reduce<ProcessEvent[]>(
    (events, event) => upsertProcessEvent(events, event),
    [],
  );
}

function normalizeStoredProcessStatus(rawStatus: unknown): ProcessStatus {
  const status = String(rawStatus || "").toLowerCase();
  if (["pending", "waiting", "queued"].includes(status)) return "waiting";
  if (["running", "active", "started", "in_progress"].includes(status))
    return "running";
  if (["failed", "failure", "error", "errored"].includes(status))
    return "failed";
  return "done";
}

function storedInvestigation(question: string): Investigation {
  return {
    question,
    confidence: 0,
    intent: "conversation_history",
    scope: "Stored conversation",
    specMarkdown:
      "# Stored conversation\n\nThis conversation was loaded from history without a persisted workflow specification.",
    policy: "Loaded from AXIOM conversation history",
    output: "Stored answer with available evidence",
  };
}

class ResponsesSSEParser {
  private buffer = "";

  push(chunk: string): SseEvent[] {
    this.buffer += chunk.replace(/\r\n/g, "\n");
    const records = this.buffer.split("\n\n");
    this.buffer = records.pop() || "";
    return records.flatMap((record) => this.parseRecord(record));
  }

  finish(): SseEvent[] {
    const record = this.buffer.trim();
    this.buffer = "";
    return record ? this.parseRecord(record) : [];
  }

  private parseRecord(record: string): SseEvent[] {
    let eventName = "";
    const dataLines: string[] = [];
    for (const line of record.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) return [];
    try {
      const payload = JSON.parse(dataLines.join("\n")) as SseEvent;
      if (!payload?.type) return [];
      if (!eventName || payload.type === eventName) return [payload];
      if (
        eventName === "pipeline.progress" &&
        payload.type === "runtime.progress"
      ) {
        return [normalizeLegacyRuntimeProgressEvent(payload)];
      }
      return [];
    } catch {
      return [];
    }
  }
}

function normalizeLegacyRuntimeProgressEvent(payload: SseEvent): SseEvent {
  return {
    ...payload,
    ...asRecord(payload.payload),
    type: "pipeline.progress",
  };
}

function normalizeEvidence(value: unknown): EvidenceItem[] {
  const items = Array.isArray(value) ? value : [];
  return items.map((item, index) => {
    const record = asRecord(item);
    const tone = stringValue(record.tone);
    return {
      id:
        stringValue(record.id) ||
        stringValue(record.evidence_id) ||
        `EV-${String(index + 1).padStart(3, "0")}`,
      source:
        stringValue(record.source) ||
        stringValue(record.source_ref) ||
        "AXIOM evidence",
      locator:
        stringValue(record.locator) ||
        stringValue(record.location) ||
        stringValue(record.page) ||
        "referenced output",
      claim:
        stringValue(record.claim) ||
        stringValue(record.text) ||
        stringValue(record.summary) ||
        "Evidence item returned by AXIOM.",
      tone: tone === "warning" ? "warning" : "success",
    };
  });
}

function normalizeMetrics(value: unknown): ResultMetric[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    const label = stringValue(record.label) || stringValue(record.name);
    const metricValue = stringValue(record.value);
    return label && metricValue ? [{ label, value: metricValue }] : [];
  });
}

function normalizeFlags(value: unknown, evidence: EvidenceItem[]): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return evidence
    .filter((item) => item.tone === "warning")
    .map((item) => item.claim);
}

function normalizeArtifacts(metadata: Record<string, unknown>): string[] {
  const values = [
    metadata.generated_files,
    metadata.generatedFiles,
    metadata.artifacts,
    metadata.artifact_refs,
    metadata.artifactRefs,
  ];
  for (const value of values) {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          const record = asRecord(item);
          return (
            stringValue(record.url) ||
            stringValue(record.oss_url) ||
            stringValue(record.name) ||
            stringValue(record.filename) ||
            String(item)
          );
        })
        .filter(Boolean);
    }
  }
  const artifact = stringValue(metadata.artifact_ref);
  return artifact ? [artifact] : [];
}

function titleFromMarkdown(markdown: string) {
  const heading = markdown.split("\n").find((line) => line.startsWith("# "));
  return heading?.replace(/^#\s+/, "").trim() || "";
}

function summaryFromMarkdown(markdown: string) {
  const firstParagraph = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  return (
    firstParagraph ||
    markdown
      .replace(/[#*_`>\-]/g, "")
      .trim()
      .slice(0, 180)
  );
}

function humanizeEventName(value: unknown) {
  const normalized = String(value || "")
    .replace(/^pipeline\./, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "Workflow step";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function rawStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function percentValue(value: unknown) {
  const numeric = numberValue(value);
  if (!numeric) return 0;
  return numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
