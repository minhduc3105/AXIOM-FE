import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuthUser } from "@/features/auth/model/types";
import type { ProviderModelView, ProviderView } from "../model/registryTypes";
import { OrganizationModelRegistry } from "./OrganizationModelRegistry";

const mocks = vi.hoisted(() => ({
  useModelRegistry: vi.fn(),
  refresh: vi.fn(async () => undefined),
  replaceProvider: vi.fn(),
  replaceModel: vi.fn(),
  updateProviderModel: vi.fn(async () => undefined),
  testProvider: vi.fn(),
}));

vi.mock("../model/useModelRegistry", () => ({ useModelRegistry: mocks.useModelRegistry }));
vi.mock("../api/modelServiceApi", () => ({
  createProvider: vi.fn(),
  createProviderModel: vi.fn(),
  deleteProvider: vi.fn(),
  deleteProviderModel: vi.fn(),
  listProviderCatalog: vi.fn(async () => []),
  testProvider: mocks.testProvider,
  testProviderModel: vi.fn(),
  updateProvider: vi.fn(),
  updateProviderModel: mocks.updateProviderModel,
  upsertProviderCredential: vi.fn(),
}));

const admin: AuthUser = {
  id: "user-1", organization_id: "org-1", email: "admin@example.com",
  display_name: "Admin", status: "active", org_role: "org_admin",
};

const member: AuthUser = { ...admin, id: "user-2", org_role: "org_member" };

function provider(id: string, displayName: string, overrides: Partial<ProviderView> = {}): ProviderView {
  return {
    resource_id: id + "-resource", id, scope: "organization", organization_id: "org-1",
    display_name: displayName, source: "custom", base_url: "https://" + id + ".example.com/v1",
    protocol: "openai_compatible", status: "active", connection_status: "available",
    credential_configured: true, credential_source: "database",
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...overrides,
  };
}

function model(providerId: string, id: string, name: string, overrides: Partial<ProviderModelView> = {}): ProviderModelView {
  return {
    resource_id: providerId + "-" + id + "-resource", provider_id: providerId,
    provider_scope: "organization", organization_id: "org-1", model_id: id, name,
    capability: "llm", max_tokens: 4096, max_context_length: 128000, status: "active",
    connection_status: "available", is_default: false,
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T10:30:00Z", ...overrides,
  };
}

function renderRegistry(
  providers: ProviderView[],
  modelsByProvider: Record<string, ProviderModelView[]>,
  user = admin,
  state: Partial<{
    loading: boolean;
    isInitialLoading: boolean;
    isRefreshing: boolean;
    error: { message: string; status: number | null; retryable: boolean } | null;
    modelLoadErrors: Record<string, { message: string; status: number | null; retryable: boolean }>;
  }> = {},
) {
  mocks.useModelRegistry.mockReturnValue({
    providers, modelsByProvider, loading: false, isInitialLoading: false, isRefreshing: false,
    error: null, modelLoadErrors: {}, refresh: mocks.refresh,
    replaceProvider: mocks.replaceProvider, replaceModel: mocks.replaceModel,
    ...state,
  });
  return render(<OrganizationModelRegistry user={user} />);
}

describe("OrganizationModelRegistry", () => {
  beforeEach(() => {
    mocks.useModelRegistry.mockClear();
    mocks.refresh.mockClear();
    mocks.replaceProvider.mockClear();
    mocks.replaceModel.mockClear();
    mocks.updateProviderModel.mockClear();
    mocks.testProvider.mockReset();
  });
  afterEach(cleanup);

  it("renders a dedicated Model Service header and only its two main areas", () => {
    renderRegistry([provider("openai", "OpenAI")], { openai: [] });

    expect(screen.getByRole("heading", { name: "Model Service" })).toBeTruthy();
    expect(screen.getByText("Organization · org-1")).toBeTruthy();
    expect(screen.getByText("Operational")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add provider" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Assignments" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Providers/ })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Model Catalog/ })).toBeNull();
    expect(screen.queryByText("Organization administration")).toBeNull();
  });

  it("uses dedicated skeletons while the registry is loading for the first time", async () => {
    const actor = userEvent.setup();
    renderRegistry([], {}, admin, { loading: true, isInitialLoading: true });

    expect(screen.getByLabelText("Loading default assignments")).toBeTruthy();
    await actor.click(screen.getByRole("tab", { name: /Providers/ }));
    expect(screen.getByLabelText("Loading providers")).toBeTruthy();
  });

  it("keeps existing assignments visible while refreshing", () => {
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], { openai: [model("openai", "gpt", "GPT", { is_default: true })] }, admin, {
      loading: true,
      isRefreshing: true,
    });

    expect(screen.getByText("Updating assignments. Current configuration remains available.")).toBeTruthy();
    expect(screen.getByText("GPT")).toBeTruthy();
  });

  it("offers retry for a retryable registry failure without leaving the content area blank", async () => {
    const actor = userEvent.setup();
    renderRegistry([], {}, admin, {
      error: { message: "Network error while loading providers.", status: null, retryable: true },
    });

    expect(screen.getByText("Assignments could not be loaded")).toBeTruthy();
    await actor.click(screen.getAllByRole("button", { name: "Retry" })[0]);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("keeps provider access available when only its model inventory failed", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], { openai: [] }, admin, {
      modelLoadErrors: {
        openai: { message: "Network error while loading models for OpenAI.", status: null, retryable: true },
      },
    });

    await actor.click(screen.getByRole("tab", { name: /Providers/ }));
    expect(screen.getByText("Models could not be loaded.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBeGreaterThan(0);
  });

  it("makes each assignment's provider, capability, organization, readiness, and last check visible", () => {
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], { openai: [model("openai", "gpt", "GPT", { is_default: true })] });

    expect(screen.getByText("Provider: OpenAI")).toBeTruthy();
    expect(screen.getAllByText(/LLM/).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, element) => element?.textContent?.includes("Organization: org-1") ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText(/Last checked:/)).toBeTruthy();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
  });

  it("reviews a ready model before confirming the default change", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], {
      openai: [
        model("openai", "current", "GPT Current", { is_default: true }),
        model("openai", "next", "GPT Next"),
      ],
    });

    await actor.click(screen.getByRole("button", { name: "Change LLM model" }));
    await actor.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Select model" }));
    const review = screen.getByRole("dialog");
    expect(within(review).getByText("GPT Current")).toBeTruthy();
    expect(within(review).getByText("GPT Next")).toBeTruthy();
    await actor.click(within(review).getByRole("button", { name: "Confirm default change" }));
    await waitFor(() => expect(mocks.updateProviderModel).toHaveBeenCalledWith(
      expect.anything(), "openai-next-resource", { is_default: true, status: "active" },
    ));
  });

  it("does not allow an untested or inactive model to become default and states why", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI", { status: "inactive" });
    renderRegistry([openai], { openai: [model("openai", "gpt", "GPT")] });

    await actor.click(screen.getByRole("button", { name: "Assign LLM model" }));
    const picker = screen.getByRole("dialog");
    expect(within(picker).queryByRole("button", { name: "Select model" })).toBeNull();
    expect(within(picker).getByText(/Unavailable: This model cannot be validated because this provider is disabled/)).toBeTruthy();
    expect(within(picker).getByRole("button", { name: "Not eligible" })).toBeTruthy();
  });

  it("replaces provider readiness immediately after a connection test", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI", { connection_status: "unknown" });
    mocks.testProvider.mockResolvedValue({ ...openai, connection_status: "available" });
    renderRegistry([openai], { openai: [] });

    await actor.click(screen.getByRole("tab", { name: /Providers/ }));
    await actor.click(screen.getByRole("button", { name: "Test connection" }));

    await waitFor(() => expect(mocks.replaceProvider).toHaveBeenCalledWith(
      expect.objectContaining({ id: "openai", connection_status: "available" }),
    ));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("organizes provider models by capability and reserves provider deletion for custom providers", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], {
      openai: [
        model("openai", "gpt", "GPT"),
        model("openai", "embed", "Embed", { capability: "embedding" }),
      ],
    });

    await actor.click(screen.getByRole("tab", { name: /Providers/ }));
    expect(screen.getByRole("tab", { name: /LLM\s*1/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Embedding\s*1/ })).toBeTruthy();
    await actor.click(screen.getByRole("tab", { name: /Embedding\s*1/ }));
    expect(screen.getByText("Embed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add model" })).toBeTruthy();
  });

  it("opens the guided setup pipeline from the provider setup notice", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], { openai: [] });

    expect(screen.getByText("Provider setup required")).toBeTruthy();
    await actor.click(screen.getByRole("button", { name: "Open setup" }));

    const pipeline = screen.getByRole("dialog");
    expect(within(pipeline).getByText("Complete provider setup")).toBeTruthy();
    expect(within(pipeline).getByText("Step 4 of 5: Add model.")).toBeTruthy();
    expect(within(pipeline).getByRole("button", { name: "Add model" })).toBeTruthy();
  });

  it("keeps platform defaults read-only and directs admins to create an organization provider", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI", {
      scope: "system", organization_id: null, source: "cloud",
    });
    renderRegistry([openai], { openai: [model("openai", "gpt", "GPT", { provider_scope: "system", organization_id: null })] });

    await actor.click(screen.getByRole("tab", { name: /Providers/ }));
    expect(screen.queryByRole("button", { name: "Edit provider" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add model" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Manage model" })).toBeNull();
    expect(screen.getByText(/Platform providers are read-only/)).toBeTruthy();
  });

  it("keeps providers visible but mutations unavailable to organization members", async () => {
    const actor = userEvent.setup();
    const openai = provider("openai", "OpenAI");
    renderRegistry([openai], { openai: [model("openai", "gpt", "GPT", { is_default: true })] }, member);

    expect(screen.getByText("Read-only Model Service access")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add provider" })).toBeNull();
    await actor.click(screen.getByRole("tab", { name: /Providers/ }));
    expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Read-only").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Add model" })).toBeNull();
  });

  it("supports keyboard selection and preserves accessible names for long provider and model values", async () => {
    const actor = userEvent.setup();
    const longProviderName = "Provider with an intentionally long organization connection name for responsive review";
    const longModelName = "Model with an intentionally long deployment name that must remain inspectable at high browser zoom";
    const openai = provider("openai", "OpenAI");
    const longProvider = provider("long-provider", longProviderName);
    renderRegistry([openai, longProvider], {
      openai: [],
      "long-provider": [model("long-provider", "long-model", longModelName)],
    });

    await actor.click(screen.getByRole("tab", { name: /Providers/ }));
    const providerName = screen.getAllByTitle(longProviderName)[0];
    const providerButton = providerName.closest("button");
    expect(providerButton).toBeTruthy();
    providerButton?.focus();
    expect(document.activeElement).toBe(providerButton);
    await actor.keyboard("{Enter}");

    expect(screen.getByRole("heading", { name: longProviderName })).toBeTruthy();
    expect(screen.getByTitle(longModelName)).toBeTruthy();
    expect(providerButton?.getAttribute("aria-current")).toBe("true");
  });
});
