import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProvider,
  createProviderModel,
  deleteProvider,
  deleteProviderModel,
  listProviders,
  testProvider,
  testProviderModel,
  updateProvider,
  updateProviderModel,
  upsertProviderCredential,
} from "./modelServiceApi";
import { normalizeProvider, normalizeProviderModel } from "./modelServiceMappers";

describe("modelServiceApi", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the Model Service v1 registry endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listProviders({ userId: "user-1", organizationId: "org-1", orgRole: "org_admin" })).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/model-service/api/v1/providers");
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("X-Org-ID")).toBe("org-1");
  });

  it("stores credentials through the v1 credential contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      provider_id: "openrouter",
      credential_configured: true,
      credential_source: "database",
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await upsertProviderCredential(adminContext, "openrouter", "secret-value");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/model-service/api/v1/providers/openrouter/credential",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ api_key: "secret-value" }),
    }));
  });

  it("normalizes registry responses into the Model Service v1 UI domain", () => {
    expect(normalizeProvider({
      id: "openai", display_name: "OpenAI", source: "cloud",
      base_url: "https://api.openai.com/v1", protocol: "openai_compatible",
      status: "active", connection_status: "unavailable", credential_configured: false,
      created_at: "2026-08-15T00:00:00Z", updated_at: "2026-08-15T00:00:00Z",
    }, "org-1")).toMatchObject({
      resource_id: "provider:openai",
      scope: "organization", organization_id: "org-1",
      connection_status: "unavailable", credential_source: "unknown",
    });
    expect(normalizeProviderModel({
      provider_id: "openai", model_id: "gpt-test", name: "GPT Test",
      capability: "llm", status: "active",
    }, "org-1")).toMatchObject({
      resource_id: "provider:openai:model:gpt-test",
      provider_scope: "organization", organization_id: "org-1",
      connection_status: "unknown",
    });
  });

  it.each([
    ["create provider", () => createProvider(memberContext, { id: "openai", display_name: "OpenAI", source: "cloud", base_url: "https://api.openai.com/v1", protocol: "openai_compatible" })],
    ["update provider", () => updateProvider(memberContext, "openai", { display_name: "OpenAI" })],
    ["delete provider", () => deleteProvider(memberContext, "openai")],
    ["store credential", () => upsertProviderCredential(memberContext, "openai", "not-sent")],
    ["test provider", () => testProvider(memberContext, "openai")],
    ["create model", () => createProviderModel(memberContext, "openai", { model_id: "gpt", name: "GPT", capability: "llm" })],
    ["update or assign model", () => updateProviderModel(memberContext, "model-resource", { is_default: true })],
    ["delete model", () => deleteProviderModel(memberContext, "model-resource")],
    ["test model", () => testProviderModel(memberContext, "model-resource")],
  ])("blocks organization members from attempting to %s", (_label, action) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(action).toThrow(
      "Only organization admins can change Model Service configuration.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

const memberContext = {
  userId: "user-2",
  organizationId: "org-1",
  orgRole: "org_member" as const,
};

const adminContext = {
  userId: "user-1",
  organizationId: "org-1",
  orgRole: "org_admin" as const,
};
