import { describe, expect, it } from "vitest";
import { normalizeConsumerProfiles } from "./consumerProfileMappers";

describe("consumer profile mappers", () => {
  it("normalizes SDK aliases and preserves role feature requirements", () => {
    const view = normalizeConsumerProfiles({
      organization_id: "org-1",
      revision: 2,
      profiles: [{
        consumer_id: "data-intelligence-api",
        display_name: "SDK",
        roles: [{
          role: "llm",
          status: "assigned",
          required: true,
          used: true,
          provider_id: "opencode",
          model_id: "deepseek-v4-flash-free",
          features: { tools: true },
          required_features: ["tools"],
        }],
      }],
    });

    expect(view.profiles[0]?.consumer_id).toBe("data-intelligence");
    expect(view.profiles[0]?.roles).toHaveLength(3);
    expect(view.profiles[0]?.roles.find((role) => role.role === "llm")).toMatchObject({
      provider_id: "opencode",
      model_id: "deepseek-v4-flash-free",
      required_features: ["tools"],
    });
    expect(view.profiles[0]?.roles.find((role) => role.role === "vlm")).toMatchObject({
      status: "not_used",
      required_features: [],
    });
  });
});
