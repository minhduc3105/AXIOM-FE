import {
  BinaryIcon,
  EyeIcon,
  ListFilterIcon,
  MessageSquareTextIcon,
  type LucideIcon,
} from "lucide-react";
import type { ModelCapability } from "../model/registryTypes";
import type { ReadinessLevel } from "../model/readiness";

export const modelServiceSurface = "rounded-xl border bg-card text-card-foreground shadow-sm";
export const modelServiceSection = "border-b px-4 py-4 sm:px-5";
export const modelServiceMutedText = "text-sm text-muted-foreground";
export const modelServiceInput = "bg-background";

export type ModelCapabilityDefinition = {
  id: ModelCapability;
  label: string;
  detail: string;
  icon: LucideIcon;
};

export const modelCapabilities: ModelCapabilityDefinition[] = [
  { id: "llm", label: "LLM", detail: "Chat and reasoning", icon: MessageSquareTextIcon },
  { id: "vlm", label: "VLM", detail: "Images and documents", icon: EyeIcon },
  { id: "embedding", label: "Embedding", detail: "Search and indexing", icon: BinaryIcon },
  { id: "reranker", label: "Reranker", detail: "Evidence relevance", icon: ListFilterIcon },
];

export function capabilityLabel(capability: ModelCapability) {
  return modelCapabilities.find((item) => item.id === capability)?.label ?? capability;
}

export function readinessBadgeClass(level: ReadinessLevel) {
  if (level === "ready") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (level === "testing") return "border-primary/30 bg-primary/10 text-primary";
  if (level === "failed") return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  if (level === "inactive" || level === "blocked") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-border bg-muted text-muted-foreground";
}

export function readinessLabel(level: ReadinessLevel) {
  if (level === "ready") return "Ready";
  if (level === "testing") return "Testing";
  if (level === "inactive") return "Inactive";
  if (level === "blocked") return "Blocked";
  if (level === "failed") return "Failed";
  if (level === "unknown") return "Unknown";
  return "Not configured";
}
