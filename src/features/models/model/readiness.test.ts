import { describe, expect, it } from "vitest";
import { getModelReadiness, getProviderReadiness } from "./readiness";
import type { ProviderModelView, ProviderView } from "./registryTypes";

const provider: ProviderView = {
  resource_id: "provider-resource",
  id: "openai",
  scope: "organization",
  organization_id: "org-1",
  display_name: "OpenAI",
  source: "cloud",
  base_url: "https://api.openai.com/v1",
  protocol: "openai_compatible",
  status: "active",
  connection_status: "available",
  credential_configured: true,
  credential_source: "database",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const model: ProviderModelView = {
  resource_id: "model-resource",
  provider_id: "openai",
  provider_scope: "organization",
  organization_id: "org-1",
  model_id: "gpt-test",
  name: "GPT Test",
  capability: "llm",
  max_tokens: 4096,
  max_context_length: 128000,
  status: "active",
  connection_status: "available",
  is_default: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("model readiness", () => {
  it("requires an active, available provider", () => {
    expect(getProviderReadiness(provider).level).toBe("ready");
    expect(
      getProviderReadiness({ ...provider, status: "inactive" }).label,
    ).toBe("Inactive");
    expect(
      getProviderReadiness({ ...provider, connection_status: "unavailable" }).label,
    ).toBe("Unavailable");
  });

  it("combines provider and model readiness", () => {
    expect(getModelReadiness(provider, model).level).toBe("ready");
    expect(
      getModelReadiness(provider, { ...model, connection_status: "unknown" }).label,
    ).toBe("Test recommended");
    expect(
      getModelReadiness(
        { ...provider, status: "inactive" },
        model,
      ).label,
    ).toBe("Inactive");
  });
});
