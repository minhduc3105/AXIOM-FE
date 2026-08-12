type WorkspaceRecord = { workspace_id: string };

export function filterWorkspaceRecords<
  FileRecord extends WorkspaceRecord,
  DataSourceRecord extends WorkspaceRecord,
  JobRecord extends WorkspaceRecord,
>(
  files: FileRecord[],
  datasources: DataSourceRecord[],
  jobs: JobRecord[],
  workspaceId: string,
) {
  return {
    files: files.filter((file) => file.workspace_id === workspaceId),
    datasources: datasources.filter(
      (datasource) => datasource.workspace_id === workspaceId,
    ),
    jobs: jobs.filter((job) => job.workspace_id === workspaceId),
  };
}
