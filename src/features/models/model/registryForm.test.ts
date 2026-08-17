import { describe, expect, it } from "vitest";
import {
  normalizeProviderId,
  parseModelCapability,
  parseProviderProtocol,
  parseProviderSource,
} from "./registryForm";

describe("Model Service v2 form parsing", () => {
  it("maps provider form values to the v1 enums", () => {
    expect(parseProviderSource("self_hosted")).toBe("self_hosted");
    expect(parseProviderSource("local")).toBe("self_hosted");
    expect(parseProviderSource("unexpected")).toBe("custom");
    expect(parseProviderProtocol("openrouter")).toBe("openrouter");
    expect(parseProviderProtocol("unexpected")).toBe("openai_compatible");
  });

  it("maps capability and provider IDs safely", () => {
    expect(parseModelCapability("embedding")).toBe("embedding");
    expect(parseModelCapability("unexpected")).toBe("llm");
    expect(normalizeProviderId(" Research OpenAI / GPT ")).toBe("research-openai-gpt");
  });
});
