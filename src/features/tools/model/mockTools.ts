import type {
  ToolCatalogFilters,
  ToolCatalogResponse,
  ToolDetail,
  ToolKind,
  ToolParameter,
} from "./types";
import { toolKinds } from "./types";

function parameter(
  name: string,
  type: string,
  description: string,
  options: {
    required?: boolean;
    defaultValue?: unknown;
    schema?: ToolParameter["json_schema"];
  } = {},
): ToolParameter {
  return {
    name,
    type,
    description,
    required: options.required ?? false,
    default: options.defaultValue ?? null,
    json_schema: options.schema ?? {},
  };
}

function createDetail(
  name: string,
  kind: ToolKind,
  description: string,
  params: ToolParameter[],
  extras: Partial<ToolDetail> = {},
): ToolDetail {
  const properties = Object.fromEntries(
    params.map((item) => [
      item.name,
      {
        type:
          item.type === "str"
            ? "string"
            : item.type === "int"
              ? "integer"
              : item.type,
        description: item.description,
        ...item.json_schema,
      },
    ]),
  );

  return {
    name,
    kind,
    description,
    params,
    input_schema: {
      type: "object",
      properties,
      additionalProperties: false,
      required: params.filter((item) => item.required).map((item) => item.name),
    },
    ...extras,
  };
}

export const mockToolDetails: ToolDetail[] = [
  createDetail(
    "corpus_retrieve_context",
    "database_method",
    "Retrieve ranked context chunks from the corpus for a keyword or phrase query.",
    [
      parameter("query", "str", "Keyword or phrase query.", {
        required: true,
        schema: { minLength: 1 },
      }),
      parameter("top_k", "int", "Maximum number of ranked chunks.", {
        defaultValue: 5,
        schema: { minimum: 1, maximum: 100 },
      }),
      parameter("organization_id", "str", "Limit results to an organization."),
      parameter("document_id", "str", "Limit results to one document."),
      parameter("content_type", "str", "Filter by content type."),
    ],
    {
      implementation: {
        class: "CorpusRetrieveContextMethod",
        module: "database_methods.corpus_retrieval",
      },
    },
  ),
  createDetail(
    "corpus_get_file_ingested_data",
    "database_method",
    "Inspect ingested file content and metadata using file, document, or object identifiers.",
    [
      parameter("file_name", "str", "File name to match."),
      parameter("document_id", "str", "Document identifier."),
      parameter("organization_id", "str", "Organization identifier."),
      parameter("match_mode", "str", "File-name matching strategy.", {
        defaultValue: "exact",
        schema: { enum: ["exact", "contains"] },
      }),
      parameter("mode", "str", "Amount of content to return.", {
        defaultValue: "all",
        schema: { enum: ["all", "overview", "page"] },
      }),
    ],
    {
      implementation: {
        class: "CorpusGetFileIngestedDataMethod",
        module: "database_methods.corpus_retrieval",
      },
    },
  ),
  createDetail(
    "document_search_text",
    "datalake_action",
    "Search document datasets for exact text with configurable context and result limits.",
    [
      parameter("dataset_id", "str", "Dataset identifier returned by list_datasets.", {
        required: true,
        schema: { minLength: 1 },
      }),
      parameter("query", "str", "Keyword or phrase to search for.", {
        required: true,
        schema: { minLength: 1 },
      }),
      parameter("case_sensitive", "bool", "Match letter casing.", {
        defaultValue: false,
      }),
      parameter("limit", "int", "Maximum number of matches.", {
        defaultValue: 10,
        schema: { minimum: 1, maximum: 100 },
      }),
      parameter("context_chars", "int", "Characters around each match.", {
        defaultValue: 300,
        schema: { minimum: 0, maximum: 5000 },
      }),
    ],
    {
      supported_dataset_types: ["DocumentDataset"],
      implementations: [
        {
          class: "DocumentSearchTextAction",
          module: "actions.retrieval.document_retrieval",
        },
      ],
    },
  ),
  createDetail(
    "document_retrieve_context",
    "datalake_action",
    "Return context windows from a document dataset for grounded analysis workflows.",
    [
      parameter("dataset_id", "str", "Dataset identifier.", { required: true }),
      parameter("query", "str", "Context query.", { required: true }),
      parameter("limit", "int", "Maximum context windows.", {
        defaultValue: 5,
        schema: { minimum: 1, maximum: 50 },
      }),
    ],
    { supported_dataset_types: ["DocumentDataset"] },
  ),
  createDetail(
    "text_normalize",
    "utility_method",
    "Normalize whitespace and text formatting before indexing, comparison, or extraction.",
    [parameter("text", "str", "Text to normalize.", { required: true })],
    {
      implementation: {
        class: "TextNormalizeMethod",
        module: "utility_methods.text",
      },
    },
  ),
  createDetail(
    "keyword_extract",
    "utility_method",
    "Extract the most relevant keywords from unstructured text for downstream analysis.",
    [
      parameter("text", "str", "Source text.", { required: true }),
      parameter("limit", "int", "Maximum keyword count.", {
        defaultValue: 10,
        schema: { minimum: 1, maximum: 100 },
      }),
    ],
  ),
  createDetail(
    "list_datasets",
    "builtin_tool",
    "List datasets available to the current Methods-Hub runtime and organization.",
    [parameter("organization_id", "str", "Optional organization scope.")],
  ),
  createDetail(
    "refresh_catalog",
    "builtin_tool",
    "Refresh the runtime dataset and method catalog after source changes.",
    [parameter("force", "bool", "Bypass the current catalog cache.", { defaultValue: false })],
  ),
];

function createCounts(tools: ToolDetail[]) {
  return Object.fromEntries(
    toolKinds.map((kind) => [
      kind,
      tools.filter((tool) => tool.kind === kind).length,
    ]),
  ) as Record<ToolKind, number>;
}

export function getMockToolCatalog(
  filters: ToolCatalogFilters = {},
): ToolCatalogResponse {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const tools = mockToolDetails.filter((tool) => {
    if (filters.kind && tool.kind !== filters.kind) return false;
    if (!query) return true;
    const searchValue = [
      tool.name,
      tool.kind,
      tool.description,
      ...tool.params.map((item) => item.name),
      ...(tool.supported_dataset_types ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return searchValue.includes(query);
  });

  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      kind: tool.kind,
      description: tool.description,
      required_params: tool.params
        .filter((item) => item.required)
        .map((item) => item.name),
      param_count: tool.params.length,
    })),
    count: tools.length,
    counts_by_kind: createCounts(tools),
  };
}

export function getMockToolDetail(name: string) {
  return mockToolDetails.find((tool) => tool.name === name) ?? null;
}
