import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProvider,
  createProviderModel,
  discoverProviderModels,
  deleteProvider,
  deleteProviderModel,
  getTaskAssignments,
  listModelTasks,
  listProviders,
  updateTaskAssignments,
  testProvider,
  testProviderModel,
  updateProvider,
  updateProviderModel,
  upsertProviderCredential,
} from "./modelServiceApi";
import { normalizeProvider, normalizeProviderModel } from "./modelServiceMappers";

describe("modelServiceApi", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the Model Service v2 registry endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listProviders({ userId: "user-1", organizationId: "org-1", orgRole: "org_admin" })).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/model-service/api/v2/providers");
    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) throw new Error("fetch was not called");
    const requestInit = firstCall[1];
    if (!requestInit) throw new Error("request init was not captured");
    expect((requestInit.headers as Headers).get("X-Org-ID")).toBe("org-1");
  });

  it("sends the provider API key only with the create request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "openai-main",
      display_name: "OpenAI Main",
      base_url: "https://api.openai.com/v1",
      scope: "organization",
      organization_id: "org-1",
      status: "active",
      connection_status: "unknown",
      credential_configured: false,
      credential_source: "none",
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await createProvider(adminContext, {
      display_name: "OpenAI Main",
      base_url: "https://api.openai.com/v1",
      api_key: "secret-value",
    });

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      display_name: "OpenAI Main",
      base_url: "https://api.openai.com/v1",
      api_key: "secret-value",
      status: "active",
    });
  });

  it("creates provider models as active by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      resource_id: "model-resource",
      provider_id: "openai-main",
      model_id: "gpt-5",
      name: "GPT-5",
      capability: "llm",
      status: "active",
      connection_status: "unknown",
      is_default: false,
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await createProviderModel(adminContext, "openai-main", {
      model_id: "gpt-5",
      name: "GPT-5",
      capability: "llm",
    });

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      model_id: "gpt-5",
      status: "active",
    });
  });

  it("stores credentials through the v2 credential contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      provider_id: "openrouter",
      credential_configured: true,
      credential_source: "database",
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await upsertProviderCredential(adminContext, "openrouter", "secret-value");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/model-service/api/v2/providers/openrouter/credential",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ api_key: "secret-value" }),
    }));
  });

  it("reads the task catalog and organization assignments from the routing contract", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        {
          task_id: "chat.answer",
          display_name: "Chat answer",
          group: "chat",
          required_capabilities: ["llm"],
          required_features: [],
          allowed_consumers: ["api"],
          requires_index_profile: false,
          vision_optional: false,
        },
      ]), { headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        organization_id: "org-1",
        revision: 4,
        config_revision: 4,
        assignments: [],
      }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listModelTasks(adminContext)).resolves.toHaveLength(1);
    await expect(getTaskAssignments(adminContext)).resolves.toMatchObject({
      organization_id: "org-1",
      revision: 4,
      assignments: [],
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/model-service/api/v2/model-tasks");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/model-service/api/v2/task-assignments");
  });

  it("saves a literal provider/model batch with the expected assignment revision", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      organization_id: "org-1",
      revision: 5,
      config_revision: 5,
      changed: true,
      changed_task_ids: ["chat.answer"],
      assignments: [],
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await updateTaskAssignments(adminContext, {
      expected_revision: 4,
      changes: [{
        task_id: "chat.answer",
        provider_id: "literal-provider",
        model_id: "literal/model:1",
      }],
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/model-service/api/v2/task-assignments");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({
        expected_revision: 4,
        changes: [{
          task_id: "chat.answer",
          provider_id: "literal-provider",
          model_id: "literal/model:1",
        }],
      }),
    }));
  });

  it("normalizes registry responses into the Model Service v2 UI domain", () => {
    expect(normalizeProvider({
      id: "openai", display_name: "OpenAI",
      base_url: "https://api.openai.com/v1",
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

  it("normalizes flat and nested nullable model feature payloads", () => {
    expect(normalizeProviderModel({
      provider_id: "openai", model_id: "gpt-flat", name: "Flat",
      capability: "llm", status: "active", tools: true, streaming: null,
      structured_output: false, vision: true,
    }, "org-1")).toMatchObject({
      features: {
        tools: true, streaming: null, structured_output: false, vision: true,
      },
      tools: true, streaming: null, structured_output: false, vision: true,
    });
    expect(normalizeProviderModel({
      provider_id: "openai", model_id: "gpt-nested", name: "Nested",
      capability: "llm", status: "active", features: {
        tools: false, streaming: true, structured_output: null, vision: false,
      },
    }, "org-1")).toMatchObject({
      features: {
        tools: false, streaming: true, structured_output: null, vision: false,
      },
      tools: false, streaming: true, structured_output: null, vision: false,
    });
  });

  it("refreshes persisted provider model candidates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "openai",
      display_name: "OpenAI",
      base_url: "https://api.openai.com/v1",
      scope: "organization",
      organization_id: "org-1",
      status: "active",
      connection_status: "available",
      credential_configured: true,
      credential_source: "database",
      discovered_models: [{
        model_id: "gpt-5",
        name: "GPT-5",
        capability: "llm",
        max_tokens: 32768,
        max_context_length: 131072,
        tools: true,
        streaming: true,
        structured_output: true,
        vision: false,
        discovered_at: "2026-09-12T00:00:00Z",
      }],
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverProviderModels(adminContext, "openai")).resolves.toMatchObject({
      id: "openai",
      discovered_models: [{
        model_id: "gpt-5",
        capability: "llm",
        max_tokens: 32768,
        max_context_length: 131072,
        tools: true,
        streaming: true,
        structured_output: true,
        vision: false,
      }],
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/model-service/api/v2/providers/openai:discover-models",
    );
  });

  it.each([
    ["create provider", () => createProvider(memberContext, { display_name: "OpenAI", base_url: "https://api.openai.com/v1", api_key: "not-sent" })],
    ["update provider", () => updateProvider(memberContext, "openai", { display_name: "OpenAI" })],
    ["delete provider", () => deleteProvider(memberContext, "openai")],
    ["store credential", () => upsertProviderCredential(memberContext, "openai", "not-sent")],
    ["test provider", () => testProvider(memberContext, "openai")],
    ["discover provider models", () => discoverProviderModels(memberContext, "openai")],
    ["create model", () => createProviderModel(memberContext, "openai", { model_id: "gpt", name: "GPT", capability: "llm" })],
    ["update or assign model", () => updateProviderModel(memberContext, "model-resource", { is_default: true })],
    ["update task assignments", () => updateTaskAssignments(memberContext, { expected_revision: 0, changes: [] })],
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
