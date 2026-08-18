import type { ProcessEvent } from "../../model/types";
import { CheckIcon, Clock3Icon, LoaderCircleIcon, XIcon } from "lucide-react";

export type ProcessStepSelectionHandler = (
  event: ProcessEvent,
  key: string,
) => void;

export type ProcessInspectorItem = {
  key: string;
  event: ProcessEvent;
};

export type ProcessPresentation = ReturnType<typeof getProcessPresentation>;

export function getProcessPresentation(events: ProcessEvent[]) {
  const visibleEvents = events.filter(
    (event) => event.status !== "waiting" && isToolProcessEvent(event),
  );
  const transcriptEvents = visibleEvents;

  return { transcriptEvents };
}

export function isToolProcessEvent(event: ProcessEvent) {
  const eventType = event.eventType?.toLowerCase() ?? "";
  const phase = event.phase?.toLowerCase() ?? "";
  return (
    isLambdaProcessEvent(event) ||
    phase === "tool" ||
    phase === "artifact" ||
    eventType === "tool.called" ||
    eventType.endsWith(".tool.called") ||
    Boolean(event.code) ||
    Boolean(event.artifactRefs?.some((ref) => /\/executions?\//i.test(ref)))
  );
}

function isLambdaProcessEvent(event: ProcessEvent) {
  const eventType = event.eventType?.toLowerCase() ?? "";
  const phase = event.phase?.toLowerCase() ?? "";
  const label = event.label.toLowerCase();
  return (
    eventType.startsWith("pipeline.lambda.") ||
    (eventType === "engine.step" &&
      phase === "engine" &&
      label.startsWith("lambda "))
  );
}

export function processStatusIcon(status: ProcessEvent["status"]) {
  if (status === "done") return CheckIcon;
  if (status === "failed") return XIcon;
  if (status === "running") return LoaderCircleIcon;
  return Clock3Icon;
}

export function processStatusLabel(status: ProcessEvent["status"]) {
  if (status === "done") return "Done";
  if (status === "failed") return "Failed";
  if (status === "running") return "Running";
  return "Waiting";
}
