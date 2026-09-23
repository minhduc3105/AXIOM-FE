import { describe, expect, it } from "vitest";
import type { ModelTask } from "../api/modelServiceContract";
import type { ModelOption } from "./modelServiceTypes";
import {
  getEligibleTaskCandidates,
  taskAssignmentSelectionKey,
} from "./taskAssignmentUtils";

const task: ModelTask = {
  task_id: "report.generate",
  display_name: "Report generation",
  group: "report",
  required_capabilities: ["llm"],
  required_features: ["tools", "streaming"],
  allowed_consumers: ["api"],
  requires_index_profile: false,
  vision_optional: true,
};

function option(overrides: Partial<ModelOption> = {}): ModelOption {
  return {
    provider: {
      resource_id: "provider:acme",
      id: "acme",
      scope: "organization",
      organization_id: "org-1",
      display_name: "Acme",
      base_url: "https://example.test",
      status: "active",
      connection_status: "available",
    credential_configured: true,
    credential_source: "database",
    discovered_models: [],
      created_at: "",
      updated_at: "",
    },
    model: {
      resource_id: "provider:acme:model:reporter",
      provider_id: "acme",
      provider_scope: "organization",
      organization_id: "org-1",
      model_id: "reporter",
      name: "Reporter",
      capability: "llm",
      max_tokens: null,
      max_context_length: null,
      status: "active",
      connection_status: "available",
      is_default: false,
      features: {
        tools: true,
        streaming: true,
        structured_output: null,
        vision: null,
      },
      tools: true,
      streaming: true,
      structured_output: null,
      vision: null,
      created_at: "",
      updated_at: "",
    },
    ...overrides,
  };
}

describe("task assignment candidates", () => {
  it("keeps only active models satisfying every capability and required feature", () => {
    const eligible = getEligibleTaskCandidates(task, [
      option(),
      option({
        model: {
          ...option().model,
          model_id: "missing-tools",
          tools: null,
          features: {
            tools: null,
            streaming: option().model.streaming ?? null,
            structured_output: option().model.structured_output ?? null,
            vision: option().model.vision ?? null,
          },
        },
      }),
      option({
        model: { ...option().model, model_id: "wrong-capability", capability: "embedding" },
      }),
      option({
        provider: { ...option().provider, id: "inactive-provider", status: "inactive" },
      }),
      option({
        model: { ...option().model, model_id: "inactive-model", status: "inactive" },
      }),
    ]);

    expect(eligible.map(({ model }) => model.model_id)).toEqual(["reporter"]);
  });

  it("forms a lossless selection key for literal provider and model IDs", () => {
    expect(taskAssignmentSelectionKey("provider/name", "model/name:1")).toBe(
      "provider/name\u0000model/name:1",
    );
  });
});
