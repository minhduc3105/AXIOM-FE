import type { ModelTask } from "../api/modelServiceContract";
import type { ModelOption } from "./modelServiceTypes";

/**
 * A NUL separator cannot be produced by the provider/model identifiers
 * accepted by Model Service and lets the UI preserve both IDs exactly.
 */
export function taskAssignmentSelectionKey(providerId: string, modelId: string) {
  return `${providerId}\u0000${modelId}`;
}

export function getEligibleTaskCandidates(
  task: ModelTask,
  options: ModelOption[],
): ModelOption[] {
  return options.filter(({ provider, model }) => {
    if (provider.status !== "active" || model.status !== "active") return false;
    if (!task.required_capabilities.includes(model.capability)) return false;
    return task.required_features.every((feature) => {
      const featureName = feature as keyof NonNullable<typeof model.features>;
      const value = model.features && Object.prototype.hasOwnProperty.call(model.features, featureName)
        ? model.features[featureName]
        : model[featureName];
      return value === true;
    });
  });
}

export function taskAssignmentSelection(
  option: ModelOption,
) {
  return {
    provider_id: option.provider.id,
    model_id: option.model.model_id,
  } as const;
}
