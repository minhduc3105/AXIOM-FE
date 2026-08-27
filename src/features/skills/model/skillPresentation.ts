export function formatSkillName(skill: { name: string; id: string }) {
  const value = skill.name || skill.id;
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function formatSkillLanguage(language: string) {
  return language.trim() ? language.trim().toUpperCase() : "Unknown language";
}

export function getSkillScope(path: string) {
  if (path.startsWith("skills/global/")) return "Global";
  if (path.startsWith("skills/tenants/")) return "Workspace";
  return "Visible in current scope";
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
