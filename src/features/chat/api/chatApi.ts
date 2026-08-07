import type {
  EditableSpecification,
  EvidenceItem,
  ChatEngine,
  ChatTurn,
  Investigation,
  MockResult,
  ProcessEvent,
  ProcessStatus,
  ResultMetric,
} from "../model/types";
import {
  intelligenceApiUrl,
  listConversationMessages,
} from "@/shared/lib/intelligence-api";
import { authFetch } from "@/features/auth/model/authFetch";
import type { IntelligenceMessage } from "@/shared/types/intelligence";

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

export type ConversationHistorySnapshot = {
  turns: ChatTurn[];
  pendingInvestigation: Investigation | null;
  pendingQuestion: string | null;
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
  const messages = await listConversationMessages(conversationId, signal);
  return messagesToChatTurns(messages);
}

export async function createInvestigation(
  question: string,
  conversationId: string | null = null,
  engine: ChatEngine = "auto",
  signal?: AbortSignal,
  onOutputText?: (result: MockResult) => void,
): Promise<InitialChatOutcome> {
  pendingConfirmation = null;
  const response = await postJson(
    "/api/v1/responses",
    {
      input: question,
      conversation_id: conversationId,
      data_corpus_package: { sources: [], schemas: {}, metadata: {} },
      runtime_options: { engine },
    },
    signal,
  );
  const outcome = await readResponseStream(response, signal, { onOutputText });

  if (outcome.completed) {
    return {
      kind: "completed",
      investigation: directAnswerInvestigation(question),
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
    const reviseOutcome = await readResponseStream(
      reviseResponse,
      signal,
      { onProcessEvents },
    );
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
  const outcome = await readResponseStream(
    confirmResponse,
    signal,
    { onProcessEvents },
  );

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
  if (!response.ok) throw new Error(await responseErrorMessage(response));
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
  if (!response.ok) throw new Error(await responseErrorMessage(response));
  return response;
}

async function responseErrorMessage(response: Response) {
  const fallback = `AXIOM Intelligence API returned ${response.status}.`;
  try {
    const text = await response.text();
    if (!text) return fallback;
    try {
      const payload = JSON.parse(text) as {
        detail?: unknown;
        error?: { message?: unknown };
      };
      if (typeof payload.detail === "string") return payload.detail;
      if (typeof payload.error?.message === "string")
        return payload.error.message;
    } catch {
      return text;
    }
    return fallback;
  } catch {
    return fallback;
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

  try {
    while (true) {
      if (signal?.aborted)
        throw new DOMException("The request was aborted.", "AbortError");
      const { done, value } = await reader.read();
      const events = done
        ? parser.finish()
        : parser.push(decoder.decode(value, { stream: true }));
      for (const event of events)
        applyStreamEvent(event, outcome, callbacks);
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  return outcome;
}

function applyStreamEvent(
  event: SseEvent,
  outcome: StreamOutcome,
  callbacks?: StreamCallbacks,
) {
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
        completedToResult(streamingCompletedResponse(event, outcome.outputText)),
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
    outcome.completed = completedFromEvent(event, outcome.outputText);
    return;
  }

  if (event.type === "response.failed") {
    const error = asRecord(event.error);
    throw new Error(
      typeof error.message === "string"
        ? error.message
        : "The intelligence response failed.",
    );
  }
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
  const eventId =
    stringValue(explicitStep.id) ||
    stringValue(event.step_id) ||
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
  const inputs = firstPresent(
    details.inputs,
    event.inputs,
    explicitStep.inputs,
    event.input,
    explicitStep.input,
    event.action_input,
    event.actionInput,
  );
  const outputs = firstPresent(
    details.outputs,
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

function hasRuntimeValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function normalizeProcessCode(value: unknown): ProcessEvent["code"] | undefined {
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
  return ref.replace(/^artifact:\/\//, "").split("/").filter(Boolean).pop() || "";
}

function stringArrayValue(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function processEventDetail(event: SseEvent) {
  const parts = [
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
  let pendingInvestigation: Investigation | null = null;
  let historyConfirmation: PendingConfirmation | null = null;
  let pendingResponse = false;

  for (const message of orderedMessages) {
    if (message.role === "user") {
      pendingQuestion = userQuestionFromMessage(message) || pendingQuestion;
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
        historyConfirmation = confirmation;
      }
      continue;
    }

    if (message.role !== "assistant") continue;

    const completed = completedResponseFromMessage(message);
    if (!completed) continue;

    const question =
      pendingQuestion ||
      pendingInvestigation?.question ||
      "Conversation response";
    pendingResponse = Boolean(completed.pending);
    turns.push({
      investigation: pendingInvestigation || storedInvestigation(question),
      result: completedToResult(completed),
      processEvents: completed.processEvents,
    });
    pendingQuestion = null;
    pendingInvestigation = null;
    historyConfirmation = null;
  }

  pendingConfirmation = historyConfirmation;

  return { turns, pendingInvestigation, pendingQuestion, pendingResponse };
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

function completedResponseFromMessage(
  message: IntelligenceMessage,
): CompletedResponse | null {
  const content = message.content;
  const record = asRecord(content);
  const response = asRecord(record.response);
  const error = asRecord(record.error);
  const failedMessage =
    stringValue(error.message) ||
    stringValue(record.message) ||
    stringValue(response.error);
  const outputText =
    stringValue(record.output_text) ||
    stringValue(response.output_text) ||
    (message.status === "failed" ? failedMessage : "") ||
    (typeof content === "string" ? content : "");

  if (!outputText) return null;

  return {
    responseId: message.response_id || stringValue(response.id),
    outputText,
    evidence: record.evidence,
    metadata: {
      ...message.metadata,
      ...asRecord(record.metadata),
      ...(message.status === "failed"
        ? {
            title: "AXIOM response failed",
            summary: failedMessage || outputText,
          }
        : {}),
    },
    processEvents: processEventsFromMessage(message),
    pending: !isTerminalAssistantStatus(message.status),
  };
}

function isTerminalAssistantStatus(status: string) {
  const normalized = status.toLowerCase();
  return ["completed", "complete", "done", "success", "failed", "error"].includes(
    normalized,
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

  return items.flatMap((item) => {
    const record = asRecord(item);
    const eventType = stringValue(record.type);
    if (eventType.startsWith("pipeline.")) {
      return [processEventFromApiEvent(record as SseEvent)];
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
    if (!eventName || dataLines.length === 0) return [];
    try {
      const payload = JSON.parse(dataLines.join("\n")) as SseEvent;
      return payload && payload.type === eventName ? [payload] : [];
    } catch {
      return [];
    }
  }
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
    metadata.artifacts,
    metadata.artifact_refs,
    metadata.artifactRefs,
  ];
  for (const value of values) {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
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
