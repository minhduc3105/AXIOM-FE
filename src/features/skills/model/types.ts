export type SkillSummary = {
  id: string;
  name: string;
  language: string;
  enabled: boolean;
  version: string;
  path: string;
  entry: string;
  description: string;
  metadata: Record<string, unknown>;
};

export type UserSkillSummary = SkillSummary & {
  user_enabled: boolean;
};

export type SkillDetail = SkillSummary & {
  body: string;
  files: string[];
};

export type SkillPreferenceResponse = {
  skill_id: string;
  enabled: boolean;
  changed: boolean;
};

export type SkillStatusFilter = "all" | "enabled" | "disabled";
export type SkillCatalogSort = "name" | "language" | "version";

export type SkillCatalogViewState = {
  query: string;
  language?: string;
  status: SkillStatusFilter;
  sort: SkillCatalogSort;
  scrollY: number;
};

export const defaultSkillCatalogViewState: SkillCatalogViewState = {
  query: "",
  language: undefined,
  status: "all",
  sort: "name",
  scrollY: 0,
};

export type SkillCatalogFilters = {
  workspaceId: string | null;
  language?: string;
};
