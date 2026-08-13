import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuthUser } from "@/features/auth/model/types";
import type { ProviderModelView, ProviderView } from "../model/registryTypes";
import { OrganizationModelRegistry } from "./OrganizationModelRegistry";

const mocks = vi.hoisted(() => ({
  useModelRegistry: vi.fn(),
  refresh: vi.fn(async () => undefined),
  updateProviderModel: vi.fn(async () => undefined),
}));

vi.mock("../model/useModelRegistry", () => ({
  useModelRegistry: mocks.useModelRegistry,
}));

vi.mock("../api/modelServiceApi", () => ({
  createProvider: vi.fn(),
  createProviderModel: vi.fn(),
  deleteProvider: vi.fn(),
  deleteProviderModel: vi.fn(),
  listProviderCatalog: vi.fn(async () => []),
  testProvider: vi.fn(),
  testProviderModel: vi.fn(),
  updateProvider: vi.fn(),
  updateProviderModel: mocks.updateProviderModel,
  upsertProviderCredential: vi.fn(),
}));

const user: AuthUser = {
  id: "user-1",
  organization_id: "org-1",
  email: "admin@example.com",
  display_name: "Admin",
  status: "active",
  org_role: "org_admin",
};

function provider(
  id: string,
  displayName: string,
  overrides: Partial<ProviderView> = {},
): ProviderView {
  return {
    resource_id: `${id}-resource`,
    id,
    scope: "organization",
    organization_id: "org-1",
    display_name: displayName,
    source: "cloud",
    base_url: `https://${id}.example.com/v1`,
    protocol: "openai_compatible",
    status: "active",
    connection_status: "available",
    credential_configured: true,
    credential_source: "database",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function model(
  providerId: string,
  id: string,
  name: string,
  overrides: Partial<ProviderModelView> = {},
): ProviderModelView {
  return {
    resource_id: `${providerId}-${id}-resource`,
    provider_id: providerId,
    provider_scope: "organization",
    organization_id: "org-1",
    model_id: id,
    name,
    capability: "llm",
    max_tokens: 4096,
    max_context_length: 128000,
    status: "active",
    connection_status: "available",
    is_default: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderRegistry(
  providers: ProviderView[],
  modelsByProvider: Record<string, ProviderModelView[]>,
) {
  mocks.useModelRegistry.mockReturnValue({
    providers,
    modelsByProvider,
    loading: false,
    error: null,
    warning: null,
    refresh: mocks.refresh,
  });
  return render(<OrganizationModelRegistry user={user} />);
}

describe("OrganizationModelRegistry", () => {
  beforeEach(() => {
    mocks.refresh.mockClear();
    mocks.updateProviderModel.mockClear();
  });

  afterEach(cleanup);

  it("keeps configured defaults scoped to their providers", () => {
    const openai = provider("openai", "OpenAI");
    const anthropic = provider("anthropic", "Anthropic");
    renderRegistry([openai, anthropic], {
      openai: [model("openai", "gpt", "GPT", { is_default: true })],
      anthropic: [model("anthropic", "claude", "Claude", { is_default: true })],
    });

    expect(screen.getByText("Default for OpenAI")).toBeTruthy();
    expect(screen.getByText("Default for Anthropic")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change LLM model" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add VLM model" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Embedding model" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Reranker model" })).toBeTruthy();
  });

  it("reviews the current and new model before changing a provider default", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], {
      openai: [
        model("openai", "current", "GPT Current", { is_default: true }),
        model("openai", "next", "GPT Next"),
      ],
    });

    await actor.click(screen.getByRole("button", { name: "Change LLM model" }));
    const picker = screen.getByRole("dialog");
    await actor.click(within(picker).getByRole("button", { name: "Select model" }));
    expect(mocks.updateProviderModel).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("GPT Current")).toBeTruthy();
    expect(within(dialog).getByText("GPT Next")).toBeTruthy();

    await actor.click(
      within(dialog).getByRole("button", { name: "Confirm default change" }),
    );
    await waitFor(() =>
      expect(mocks.updateProviderModel).toHaveBeenCalledWith(
        expect.anything(),
        "openai-next-resource",
        { is_default: true, status: "active" },
      ),
    );
  });

  it("offers only models that match the selected capability", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], {
      openai: [
        model("openai", "chat", "Chat Model"),
        model("openai", "embed", "Embedding Model", {
          capability: "embedding",
        }),
      ],
    });

    await actor.click(screen.getByRole("button", { name: "Assign LLM model" }));
    const picker = screen.getByRole("dialog");
    expect(within(picker).getByText("Chat Model")).toBeTruthy();
    expect(within(picker).queryByText("Embedding Model")).toBeNull();
  });

  it("blocks switching when the provider is inactive", async () => {
    const actor = userEvent.setup();
    const inactive = provider("openai", "OpenAI", { status: "inactive" });
    renderRegistry([inactive], {
      openai: [model("openai", "next", "GPT Next")],
    });

    await actor.click(screen.getByRole("button", { name: "Assign LLM model" }));
    const picker = screen.getByRole("dialog");
    expect(within(picker).queryByRole("button", { name: "Select model" })).toBeNull();
    expect(within(picker).getByRole("button", { name: "Review provider" })).toBeTruthy();
  });

  it("shows system resources as read-only and filters the inventory", async () => {
    const actor = userEvent.setup();
    const platform = provider("platform", "Platform", {
      scope: "system",
      organization_id: null,
    });
    const openai = provider("openai", "OpenAI");
    renderRegistry([platform, openai], {
      platform: [model("platform", "system", "System Model", { provider_scope: "system", organization_id: null })],
      openai: [model("openai", "private", "Private Model")],
    });

    await actor.click(screen.getByRole("tab", { name: /model catalog/i }));
    expect(screen.getByText("Read-only")).toBeTruthy();
    await actor.type(screen.getByPlaceholderText("Search model, ID or provider"), "Private");
    expect(screen.getByText("Private Model")).toBeTruthy();
    expect(screen.queryByText("System Model")).toBeNull();
  });
});
