import type { ToolKind, ToolPresentation } from "./types";

const presentations: Record<string, Partial<ToolPresentation>> = {
  corpus_retrieve_context: {
    version: "2.4.1",
    updatedAt: "2026-07-18",
    author: "Knowledge Systems",
    defaultEnabled: true,
  },
  corpus_get_file_ingested_data: {
    version: "1.8.0",
    updatedAt: "2026-07-12",
    author: "Data Platform",
    defaultEnabled: true,
  },
  document_search_text: {
    version: "2.1.3",
    updatedAt: "2026-07-22",
    author: "Retrieval Team",
    defaultEnabled: true,
  },
  text_normalize: {
    version: "1.6.2",
    updatedAt: "2026-06-28",
    author: "Methods Hub",
    defaultEnabled: true,
  },
};

const authorsByKind: Record<ToolKind, string> = {
  builtin_tool: "AXIOM Core",
  database_method: "Data Platform",
  datalake_action: "Retrieval Team",
  utility_method: "Methods Hub",
};

export function getToolPresentation(
  name: string,
  kind: ToolKind = "utility_method",
): ToolPresentation {
  const override = presentations[name];
  return {
    version: override?.version ?? "1.0.0",
    updatedAt: override?.updatedAt ?? "2026-07-01",
    author: override?.author ?? authorsByKind[kind],
    defaultEnabled: override?.defaultEnabled ?? false,
  };
}

export function formatToolName(name: string) {
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatToolKind(kind: ToolKind) {
  return kind
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
