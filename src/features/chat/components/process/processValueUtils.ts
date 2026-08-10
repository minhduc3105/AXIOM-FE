export function hasDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return true;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function formatDetailLabel(value: string) {
  return value
    .replace(/^pipeline\./, "")
    .replace(/[._-]+/g, " ")
    .replace(/\w/g, (character) => character.toUpperCase());
}

export function artifactName(ref: string) {
  const path = ref.replace(/^artifact:\/\//, "");
  return path.split("/").filter(Boolean).pop() || "Artifact";
}

export function stringFromUnknown(value: unknown) {
  return typeof value === "string" && value ? value : "";
}

export function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
