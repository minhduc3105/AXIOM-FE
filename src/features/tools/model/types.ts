export const toolKinds = [
  "builtin_tool",
  "database_method",
  "datalake_action",
  "utility_method",
] as const;

export type ToolKind = (typeof toolKinds)[number];

export type ToolSummary = {
  name: string;
  kind: ToolKind;
  description: string;
  required_params: string[];
  param_count: number;
};

export type ToolCatalogResponse = {
  tools: ToolSummary[];
  count: number;
  counts_by_kind: Record<ToolKind, number>;
};

export type ToolJsonSchema = {
  type?: string;
  title?: string;
  description?: string;
  enum?: Array<string | number | boolean>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  items?: ToolJsonSchema;
  properties?: Record<string, ToolJsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
};

export type ToolParameter = {
  name: string;
  type: string;
  default: unknown;
  required: boolean;
  description: string;
  json_schema: ToolJsonSchema;
};

export type ToolImplementation = {
  class?: string;
  module?: string;
  [key: string]: unknown;
};

export type ToolDetail = {
  name: string;
  kind: ToolKind;
  description: string;
  params: ToolParameter[];
  input_schema: ToolJsonSchema;
  implementation?: ToolImplementation;
  implementations?: ToolImplementation[];
  supported_dataset_types?: string[];
};

export type ToolDetailResponse = {
  tool: ToolDetail;
};

export type ToolCatalogFilters = {
  kind?: ToolKind;
  query?: string;
};

export type CatalogSource = "api" | "sample";

export type ToolPresentation = {
  version: string;
  updatedAt: string;
  author: string;
  defaultEnabled: boolean;
};
