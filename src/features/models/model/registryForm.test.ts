import { describe, expect, it } from "vitest";
import {
  modelMetadataFromCandidate,
  normalizeProviderId,
  parseModelCapability,
} from "./registryForm";

describe("Model Service v2 form parsing", () => {
  it("maps capability and provider IDs safely", () => {
    expect(parseModelCapability("embedding")).toBe("embedding");
    expect(parseModelCapability("unexpected")).toBe("llm");
    expect(normalizeProviderId(" Research OpenAI / GPT ")).toBe("research-openai-gpt");
  });

  it("keeps discovered model metadata when registering a candidate", () => {
    expect(modelMetadataFromCandidate({
      model_id: "deepseek/deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      capability: "llm",
      max_tokens: 943718,
      max_context_length: 1310720,
      tools: true,
      streaming: true,
      structured_output: true,
      vision: false,
      discovered_at: "2026-09-23T00:00:00Z",
    })).toEqual({
      max_tokens: 943718,
      max_context_length: 1310720,
      tools: true,
      streaming: true,
      structured_output: true,
      vision: false,
    });
  });

});
