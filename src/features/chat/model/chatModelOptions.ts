import type { ChatModelOption } from "./types";

function normalizedModelLabel(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

function isActive(model: ChatModelOption) {
  return model.status?.toLowerCase() === "active";
}

export function toChatModelOptions(models: ChatModelOption[]) {
  const options: ChatModelOption[] = [];
  const indexByLabel = new Map<string, number>();

  for (const model of models) {
    const option = { ...model, label: normalizedModelLabel(model.label) };
    const key = option.label.toLowerCase();
    const existingIndex = indexByLabel.get(key);

    if (existingIndex === undefined) {
      indexByLabel.set(key, options.length);
      options.push(option);
      continue;
    }

    if (!isActive(options[existingIndex]) && isActive(option)) {
      options[existingIndex] = {
        ...option,
        label: options[existingIndex].label,
      };
    }
  }

  return options;
}
