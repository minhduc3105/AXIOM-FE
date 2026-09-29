import type { SkillSummary } from "./types";

export function formatSkillName(skill: { name: string; id: string }) {
  const value = skill.name || skill.id;
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function isGeneralSkill(skill: Pick<SkillSummary, "metadata">) {
  return skill.metadata.axiom_system_bootstrap === true;
}

export function formatSkillOrigin(
  skill: Pick<SkillSummary, "metadata" | "organization_shared">,
) {
  if (isGeneralSkill(skill)) return "General";
  return skill.organization_shared ? "Organization" : "Your skill";
}

export function formatSkillLanguage(language: string) {
  return language.trim() ? language.trim().toUpperCase() : "Unknown language";
}

export function formatSkillVersion(version: string) {
  return version.trim() ? `v${version}` : "Version unavailable";
}

export function skillArchiveFileName(
  skill: { id: string; version: string },
  fileName: string | null,
) {
  if (fileName) return fileName;
  const safeId = skill.id.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const safeVersion = skill.version.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${safeId}-${safeVersion || "latest"}.zip`;
}
