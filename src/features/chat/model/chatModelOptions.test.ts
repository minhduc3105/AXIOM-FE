import { describe, expect, it } from "vitest";
import { toChatModelOptions } from "./chatModelOptions";

describe("toChatModelOptions", () => {
  it("deduplicates labels and prefers the active alias", () => {
    expect(
      toChatModelOptions([
        {
          id: "provider-a:model-1",
          alias: "provider-a:model-1",
          label: "  North Mini Code  ",
          status: "inactive",
        },
        {
          id: "provider-b:model-1",
          alias: "provider-b:model-1",
          label: "north   mini code",
          status: "active",
        },
        {
          id: "provider-c:model-2",
          alias: "provider-c:model-2",
          label: "Reasoning model",
          status: "active",
        },
      ]),
    ).toEqual([
      {
        id: "provider-b:model-1",
        alias: "provider-b:model-1",
        label: "North Mini Code",
        status: "active",
      },
      {
        id: "provider-c:model-2",
        alias: "provider-c:model-2",
        label: "Reasoning model",
        status: "active",
      },
    ]);
  });

  it("keeps equal model labels separate when they belong to different providers", () => {
    expect(
      toChatModelOptions([
        {
          id: "openai:gpt-4o",
          alias: "openai:gpt-4o",
          label: "GPT-4o",
          providerId: "openai",
          providerName: "OpenAI",
          status: "active",
        },
        {
          id: "azure:gpt-4o",
          alias: "azure:gpt-4o",
          label: "GPT-4o",
          providerId: "azure",
          providerName: "Azure OpenAI",
          status: "active",
        },
      ]),
    ).toHaveLength(2);
  });
});
