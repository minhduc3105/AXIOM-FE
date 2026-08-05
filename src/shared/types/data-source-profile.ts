export type DataSourceProfileType = "s3" | "snowflake";

export type SavedS3Config = {
  region: string;
  bucketName: string;
};

export type SavedSnowflakeConfig = {
  account: string;
  user: string;
  warehouse: string;
  database: string;
  schema: string;
  role: string;
  discoverTables: boolean;
  discoverStages: boolean;
  stagePattern: string;
  tableLimit: number | null;
  stageLimit: number | null;
};

export type SavedDataSourceProfile = {
  id: string;
  organizationId: string;
  type: DataSourceProfileType;
  name: string;
  createdAt: string;
  updatedAt: string;
  linkedJobIds: string[];
  backendDatasourceId?: string;
  config: SavedS3Config | SavedSnowflakeConfig;
};

export type DataSourceProfileDraft = Pick<
  SavedDataSourceProfile,
  "name" | "organizationId" | "type" | "config"
>;
