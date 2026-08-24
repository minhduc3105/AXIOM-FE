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
});
