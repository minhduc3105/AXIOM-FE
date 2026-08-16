import { describe, expect, it } from "vitest";
import { hasErrors, validateCredential, validateModelForm, validateProviderForm } from "./formValidation";

describe("model service form validation", () => {
  it("requires a valid provider ID, name, and HTTP endpoint when creating a provider", () => {
    const errors = validateProviderForm({ id: "Open Router", name: "", baseUrl: "ftp://example.com" }, false);
    expect(errors.id).toBeTruthy();
    expect(errors.name).toBeTruthy();
    expect(errors.baseUrl).toBeTruthy();
  });

  it("accepts an editable provider without a replacement ID", () => {
    expect(hasErrors(validateProviderForm({ id: "", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" }, true))).toBe(false);
  });

  it("validates model identifiers, capabilities, and token limits", () => {
    const errors = validateModelForm({ modelId: "", name: "", capability: "unsupported", maxTokens: "4096", contextLength: "1000" }, false);
    expect(errors.modelId).toBeTruthy();
    expect(errors.name).toBeTruthy();
    expect(errors.capability).toBeTruthy();
    expect(errors.limits).toBeTruthy();
  });

  it("does not accept an empty API key", () => {
    expect(hasErrors(validateCredential("  "))).toBe(true);
    expect(hasErrors(validateCredential("secret-value"))).toBe(false);
  });
});
