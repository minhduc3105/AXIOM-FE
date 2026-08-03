export type ProviderSource = "cloud" | "local";

export type ModelProvider = {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  apiKeyHint: string;
  source: ProviderSource;
  status: "online" | "offline";
  updatedAt: string;
};

export type ManagedModel = {
  id: string;
  providerId: string;
  name: string;
  label: string;
  contextWindow: string;
  primary: boolean;
  enabled: boolean;
};

export const initialProviders: ModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Production reasoning and general-purpose language models.",
    endpoint: "https://api.openai.com/v1",
    apiKeyHint: "Configured · sk-…4D7p",
    source: "cloud",
    status: "online",
    updatedAt: "Updated 12 min ago",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Long-context analysis models for review workflows.",
    endpoint: "https://api.anthropic.com/v1",
    apiKeyHint: "Configured · sk-ant-…Vn2Q",
    source: "cloud",
    status: "online",
    updatedAt: "Updated yesterday",
  },
];

export const initialModels: ManagedModel[] = [
  {
    id: "gpt-5",
    providerId: "openai",
    name: "gpt-5",
    label: "GPT-5",
    contextWindow: "400K context",
    primary: true,
    enabled: true,
  },
  {
    id: "gpt-5-mini",
    providerId: "openai",
    name: "gpt-5-mini",
    label: "GPT-5 mini",
    contextWindow: "400K context",
    primary: false,
    enabled: true,
  },
  {
    id: "claude-sonnet-4-5",
    providerId: "anthropic",
    name: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    contextWindow: "200K context",
    primary: false,
    enabled: true,
  },
];

export const availableProviders = [
  "Azure OpenAI",
  "Google Gemini",
  "Amazon Bedrock",
  "Mistral AI",
  "Cohere",
  "Groq",
  "OpenRouter",
  "Ollama",
  "DeepSeek",
  "Together AI",
];
