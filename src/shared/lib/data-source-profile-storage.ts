import type {
  DataSourceProfileDraft,
  SavedDataSourceProfile,
  SavedS3Config,
  SavedSnowflakeConfig,
} from "@/shared/types/data-source-profile";

const STORAGE_PREFIX = "axiom:data-source-profiles:v1";
const STORAGE_VERSION = 2;

type ProfileEnvelope = {
  version: 2;
  profiles: SavedDataSourceProfile[];
};

export class DataSourceProfileStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataSourceProfileStorageError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) >= 1);
}

function isS3Config(value: unknown): value is SavedS3Config {
  return (
    isRecord(value) &&
    typeof value.region === "string" &&
    typeof value.bucketName === "string"
  );
}

function isSnowflakeConfig(value: unknown): value is SavedSnowflakeConfig {
  return (
    isRecord(value) &&
    typeof value.account === "string" &&
    typeof value.user === "string" &&
    typeof value.warehouse === "string" &&
    typeof value.database === "string" &&
    typeof value.schema === "string" &&
    typeof value.role === "string" &&
    typeof value.discoverTables === "boolean" &&
    typeof value.discoverStages === "boolean" &&
    typeof value.stagePattern === "string" &&
    isNullableNumber(value.tableLimit) &&
    isNullableNumber(value.stageLimit)
  );
}

function isProfile(
  value: unknown,
  organizationId: string,
): value is SavedDataSourceProfile {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.organizationId !== "string" ||
    value.organizationId !== organizationId ||
    (value.type !== "s3" && value.type !== "snowflake") ||
    typeof value.name !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string" ||
    !Array.isArray(value.linkedJobIds) ||
    !value.linkedJobIds.every((jobId) => typeof jobId === "string") ||
    (value.backendDatasourceId !== undefined &&
      typeof value.backendDatasourceId !== "string")
  ) {
    return false;
  }
  return value.type === "s3"
    ? isS3Config(value.config)
    : isSnowflakeConfig(value.config);
}

function getStorage(storage?: Storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getDataSourceProfileStorageKey(organizationId: string) {
  return `${STORAGE_PREFIX}:${organizationId}`;
}

export function readDataSourceProfiles(
  organizationId: string,
  storage?: Storage,
): SavedDataSourceProfile[] {
  return readDataSourceProfilesResult(organizationId, storage).profiles;
}

export function readDataSourceProfilesResult(
  organizationId: string,
  storage?: Storage,
): { profiles: SavedDataSourceProfile[]; warning: string | null } {
  const target = getStorage(storage);
  if (!target) {
    return {
      profiles: [],
      warning: "Saved source storage is unavailable in this browser.",
    };
  }
  try {
    const serialized = target.getItem(
      getDataSourceProfileStorageKey(organizationId),
    );
    if (!serialized) return { profiles: [], warning: null };
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      (value.version !== 1 && value.version !== STORAGE_VERSION) ||
      !Array.isArray(value.profiles)
    ) {
      return {
        profiles: [],
        warning: "Saved source data uses an unsupported or malformed format and was ignored.",
      };
    }
    const profiles = value.profiles.filter((profile) =>
      isProfile(profile, organizationId),
    );
    return {
      profiles,
      warning: profiles.length === value.profiles.length
        ? null
        : "Some malformed saved sources were ignored.",
    };
  } catch {
    return {
      profiles: [],
      warning: "Saved source data could not be read and was ignored.",
    };
  }
}

function writeProfiles(
  organizationId: string,
  profiles: SavedDataSourceProfile[],
  storage?: Storage,
) {
  const target = getStorage(storage);
  if (!target) {
    throw new DataSourceProfileStorageError(
      "Saved source storage is unavailable in this browser.",
    );
  }
  const envelope: ProfileEnvelope = { version: STORAGE_VERSION, profiles };
  try {
    target.setItem(
      getDataSourceProfileStorageKey(organizationId),
      JSON.stringify(envelope),
    );
  } catch {
    throw new DataSourceProfileStorageError(
      "Unable to save this source in browser storage.",
    );
  }
}

function normalizeDraft(draft: DataSourceProfileDraft): DataSourceProfileDraft {
  const name = draft.name.trim();
  if (!name) throw new Error("Source name is required.");
  if (draft.type === "s3") {
    const config = draft.config as SavedS3Config;
    if (!config.region.trim() || !config.bucketName.trim()) {
      throw new Error("S3 region and bucket are required to save a source.");
    }
    return {
      ...draft,
      name,
      config: {
        region: config.region.trim(),
        bucketName: config.bucketName.trim(),
      },
    };
  }
  const config = draft.config as SavedSnowflakeConfig;
  if (!config.account.trim() || !config.user.trim()) {
    throw new Error("Snowflake account and user are required to save a source.");
  }
  if (!config.discoverTables && !config.discoverStages) {
    throw new Error("Enable table or stage discovery before saving.");
  }
  return {
    ...draft,
    name,
    config: {
      ...config,
      account: config.account.trim(),
      user: config.user.trim(),
      warehouse: config.warehouse.trim(),
      database: config.database.trim(),
      schema: config.schema.trim(),
      role: config.role.trim(),
      stagePattern: config.stagePattern.trim(),
    },
  };
}

export function saveDataSourceProfile(
  draft: DataSourceProfileDraft,
  profileId?: string | null,
  storage?: Storage,
): SavedDataSourceProfile {
  const normalized = normalizeDraft(draft);
  const profiles = readDataSourceProfiles(draft.organizationId, storage);
  const duplicate = profiles.find(
    (profile) =>
      profile.id !== profileId &&
      profile.name.localeCompare(normalized.name, undefined, {
        sensitivity: "accent",
      }) === 0,
  );
  if (duplicate) throw new Error("A saved source already uses this name.");

  const existing = profileId
    ? profiles.find((profile) => profile.id === profileId)
    : undefined;
  if (profileId && !existing) throw new Error("Saved source was not found.");
  if (existing && existing.type !== normalized.type) {
    throw new Error("Saved source connector type cannot be changed.");
  }

  const now = new Date().toISOString();
  const profile: SavedDataSourceProfile = {
    id: existing?.id ?? crypto.randomUUID(),
    organizationId: normalized.organizationId,
    type: normalized.type,
    name: normalized.name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    linkedJobIds: existing?.linkedJobIds ?? [],
    ...(existing?.backendDatasourceId
      ? { backendDatasourceId: existing.backendDatasourceId }
      : {}),
    config: normalized.config,
  };
  writeProfiles(
    draft.organizationId,
    existing
      ? profiles.map((item) => (item.id === existing.id ? profile : item))
      : [...profiles, profile],
    storage,
  );
  return profile;
}

export function deleteDataSourceProfile(
  organizationId: string,
  profileId: string,
  storage?: Storage,
) {
  const profiles = readDataSourceProfiles(organizationId, storage);
  writeProfiles(
    organizationId,
    profiles.filter((profile) => profile.id !== profileId),
    storage,
  );
}

export function linkJobToDataSourceProfile(
  organizationId: string,
  profileId: string,
  jobId: string,
  backendDatasourceId?: string,
  storage?: Storage,
) {
  const profiles = readDataSourceProfiles(organizationId, storage);
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) throw new Error("Saved source was not found.");
  if (
    profile.linkedJobIds.includes(jobId)
    && (!backendDatasourceId || profile.backendDatasourceId === backendDatasourceId)
  ) return profile;
  const updated: SavedDataSourceProfile = {
    ...profile,
    linkedJobIds: profile.linkedJobIds.includes(jobId)
      ? profile.linkedJobIds
      : [...profile.linkedJobIds, jobId],
    ...(backendDatasourceId ? { backendDatasourceId } : {}),
  };
  writeProfiles(
    organizationId,
    profiles.map((item) => (item.id === profileId ? updated : item)),
    storage,
  );
  return updated;
}
