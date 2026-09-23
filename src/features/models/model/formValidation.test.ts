import { describe, expect, it } from "vitest";
import { hasErrors, validateCredential, validateModelForm, validateProviderForm } from "./formValidation";

describe("model service form validation", () => {
  it("requires a provider name and HTTP endpoint", () => {
    const errors = validateProviderForm({ name: "", baseUrl: "ftp://example.com" });
    expect(errors.name).toBeTruthy();
    expect(errors.baseUrl).toBeTruthy();
  });

  it("accepts a provider without a user-supplied ID", () => {
    expect(hasErrors(validateProviderForm({ name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" }))).toBe(false);
  });

  it("validates model identifiers, names, and capabilities", () => {
    const errors = validateModelForm({ modelName: "", capability: "unsupported" });
    expect(errors.modelName).toBeTruthy();
    expect(errors.capability).toBeTruthy();
  });

  it("does not accept an empty API key", () => {
    expect(hasErrors(validateCredential("  "))).toBe(true);
    expect(hasErrors(validateCredential("secret-value"))).toBe(false);
  });
});
