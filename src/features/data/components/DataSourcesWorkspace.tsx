import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CloudIcon,
  DatabaseIcon,
  EllipsisIcon,
  ImportIcon,
  PlusIcon,
  RefreshCwIcon,
  ServerIcon,
  SnowflakeIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { useGlobalIngestion } from "@/features/ingestion/model/GlobalIngestionProvider";
import type {
  DataSourceProfileType,
  SavedDataSourceProfile,
  SavedS3Config,
  SavedSnowflakeConfig,
} from "@/shared/types/data-source-profile";
import type {
  DataFile,
  DataSource,
  DataSourceFileSortField,
  DataSourceFilesPage,
  DataSourceFilesQuery,
  IngestionJob,
} from "../model/types";
import {
  cancelIndexingJob,
  getFilePurgeOperation,
  getLatestIndexingJob,
  purgeDataFiles,
  reprocessIndexingFile,
  retryIndexingFile,
  type FilePurgeOperationResponse,
  type IndexingJob,
} from "../api/dataApi";
import {
  type DataSourceFileCountState,
  useDataSourceFileCounts,
} from "../model/useDataSourceFileCounts";
import { useDataSourceFiles } from "../model/useDataSourceFiles";
import { DataSourceFilesTable } from "./DataSourceFilesTable";
import { StatusBadge } from "./StatusBadge";

type DataSourcesWorkspaceProps = {
  workspaceId: string;
  datasources: DataSource[];
  files: DataFile[];
  jobs: IngestionJob[];
  profiles: SavedDataSourceProfile[];
  loading: boolean;
  dataLoading: boolean;
  profileError: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onCreateIngestion: () => void;
  onImportSource: (datasource: DataSource) => void;
  onOpenDocument: (file: DataFile, sourceLabel: string) => void;
  onConfigureSource: (
    type: DataSourceProfileType,
    profile?: SavedDataSourceProfile | null,
  ) => void;
  onDeleteProfile: (profileId: string) => void;
};

const ORGANIZATION_FILES_SOURCE_ID = "__organization_files__";
const DEFAULT_QUERY: DataSourceFilesQuery = {
  page: 1,
  pageSize: 20,
  search: "",
  sortBy: "last_modified",
  sortOrder: "desc",
};

type FileAction = "cancel" | "retry" | "reprocess" | "delete";
type BulkAction = "retry" | "delete";
type BulkProgress = {
  action: BulkAction;
  completed: number;
  total: number;
  failed: number;
};

const ACTION_POLL_INTERVAL_MS = 1200;
const ACTION_POLL_ATTEMPTS = 20;

function waitForActionPoll() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ACTION_POLL_INTERVAL_MS);
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function displayName(datasource: DataSource) {
  if (datasource.id === ORGANIZATION_FILES_SOURCE_ID)
    return "All workspace files";
  if (datasource.type === "UPLOAD") return "Uploaded files";
  if (datasource.name?.trim()) return datasource.name;
  if (datasource.type === "s3") return "Amazon S3";
  if (datasource.type === "snowflake") return "Snowflake source";
  return datasource.type;
}

function sourceDescription(datasource: DataSource) {
  if (datasource.id === ORGANIZATION_FILES_SOURCE_ID)
    return "Workspace-wide inventory";
  if (datasource.type === "UPLOAD") return "Built-in upload source";
  if (datasource.type === "s3") return "Amazon S3";
  if (datasource.type === "snowflake") return "Snowflake";
  return "External source";
}

function SourceIcon({
  datasource,
  className,
}: {
  datasource: DataSource;
  className?: string;
}) {
  if (datasource.id === ORGANIZATION_FILES_SOURCE_ID)
    return <ServerIcon className={className} />;
  if (datasource.type === "UPLOAD")
    return <UploadCloudIcon className={className} />;
  if (datasource.type === "s3") return <CloudIcon className={className} />;
  if (datasource.type === "snowflake")
    return <SnowflakeIcon className={className} />;
  return <DatabaseIcon className={className} />;
}

function findReconnectProfile(
  datasource: DataSource,
  profiles: SavedDataSourceProfile[],
  jobs: IngestionJob[],
) {
  const direct = profiles.find(
    (profile) => profile.backendDatasourceId === datasource.id,
  );
  const sourceJobIds = new Set(
    jobs
      .filter((job) => job.datasource_id === datasource.id)
      .map((job) => job.job_id),
  );
  const linked = profiles.find((profile) =>
    profile.linkedJobIds.some((jobId) => sourceJobIds.has(jobId)),
  );
  const localProfile = direct ?? linked;

  const config = datasource.connectorConfig ?? {};
  if (datasource.type === "s3") {
    const region = config.region;
    const bucketName = config.bucket_name;
    if (typeof region !== "string" || typeof bucketName !== "string") {
      return localProfile ?? null;
    }
    if (localProfile?.type === "s3") {
      return {
        ...localProfile,
        name: datasource.name ?? localProfile.name,
        updatedAt: datasource.updatedAt,
        backendDatasourceId: datasource.id,
        config: { region, bucketName },
      };
    }
    const saved: SavedDataSourceProfile = {
      id: datasource.id,
      organizationId: datasource.organizationId,
      type: "s3",
      name: datasource.name ?? "Amazon S3",
      createdAt: datasource.createdAt,
      updatedAt: datasource.updatedAt,
      linkedJobIds: [],
      backendDatasourceId: datasource.id,
      config: { region, bucketName } satisfies SavedS3Config,
    };
    return saved;
  }
  if (datasource.type === "snowflake") {
    const account = config.account;
    const user = config.user;
    if (typeof account !== "string" || typeof user !== "string") {
      return localProfile ?? null;
    }
    const localSnowflakeProfile =
      localProfile?.type === "snowflake" ? localProfile : null;
    if (localSnowflakeProfile) {
      const localConfig = localSnowflakeProfile.config as SavedSnowflakeConfig;
      return {
        ...localSnowflakeProfile,
        name: datasource.name ?? localSnowflakeProfile.name,
        updatedAt: datasource.updatedAt,
        backendDatasourceId: datasource.id,
        config: {
          ...localConfig,
          account,
          user,
          warehouse:
            typeof config.warehouse === "string"
              ? config.warehouse
              : localConfig.warehouse,
          database:
            typeof config.database === "string"
              ? config.database
              : localConfig.database,
          schema:
            typeof config.schema === "string"
              ? config.schema
              : localConfig.schema,
          role:
            typeof config.role === "string" ? config.role : localConfig.role,
        } satisfies SavedSnowflakeConfig,
      };
    }
    const saved: SavedDataSourceProfile = {
      id: datasource.id,
      organizationId: datasource.organizationId,
      type: "snowflake",
      name: datasource.name ?? "Snowflake",
      createdAt: datasource.createdAt,
      updatedAt: datasource.updatedAt,
      linkedJobIds: [],
      backendDatasourceId: datasource.id,
      config: {
        account,
        user,
        warehouse: typeof config.warehouse === "string" ? config.warehouse : "",
        database: typeof config.database === "string" ? config.database : "",
        schema: typeof config.schema === "string" ? config.schema : "",
        role: typeof config.role === "string" ? config.role : "",
        discoverTables: true,
        discoverStages: true,
        stagePattern: "",
        tableLimit: null,
        stageLimit: null,
      } satisfies SavedSnowflakeConfig,
    };
    return saved;
  }
  return null;
}

function sortFiles(
  files: DataFile[],
  sortBy: DataSourceFileSortField,
  sortOrder: DataSourceFilesQuery["sortOrder"],
) {
  const direction = sortOrder === "asc" ? 1 : -1;
  return [...files].sort((left, right) => {
    if (sortBy === "size") return (left.size - right.size) * direction;
    if (sortBy === "last_modified") {
      const leftTime = left.lastModified ? Date.parse(left.lastModified) : 0;
      const rightTime = right.lastModified ? Date.parse(right.lastModified) : 0;
      return (leftTime - rightTime) * direction;
    }
    return left.name.localeCompare(right.name) * direction;
  });
}

function SourceCountBadge({
  state,
  selected = false,
}: {
  state: DataSourceFileCountState;
  selected?: boolean;
}) {
  if (state.loading) {
    return (
      <Badge variant="outline" aria-label="File count loading">
        <Skeleton className="h-2.5 w-7" />
      </Badge>
    );
  }
  if (state.error || state.count === null) {
    return (
      <Badge variant="outline" title="File count unavailable">
        Unavailable
      </Badge>
    );
  }
  return (
    <Badge variant={selected ? "secondary" : "outline"}>
      {state.count.toLocaleString()} {state.count === 1 ? "file" : "files"}
    </Badge>
  );
}

function SourceIdentity({
  datasource,
  count,
  selected = false,
}: {
  datasource: DataSource;
  count: DataSourceFileCountState;
  selected?: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-md border bg-card text-muted-foreground",
          selected && "border-primary/25 bg-primary/10 text-primary",
        )}
      >
        <SourceIcon datasource={datasource} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {displayName(datasource)}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {sourceDescription(datasource)}
          </span>
          <SourceCountBadge state={count} selected={selected} />
        </span>
      </span>
    </>
  );
}

function AddSourceMenu({
  onConfigureSource,
}: {
  onConfigureSource: DataSourcesWorkspaceProps["onConfigureSource"];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Connect a data source"
          />
        }
      >
        <PlusIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Connect a source</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onConfigureSource("s3")}>
            <CloudIcon />
            Amazon S3
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onConfigureSource("snowflake")}>
            <SnowflakeIcon />
            Snowflake
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SourceActions({
  datasource,
  profile,
  dataLoading,
  refreshing,
  onRefresh,
  onCreateIngestion,
  onImportSource,
  onConfigureSource,
  onForgetProfile,
}: {
  datasource: DataSource;
  profile: SavedDataSourceProfile | null;
  dataLoading: DataSourcesWorkspaceProps["dataLoading"];
  refreshing: DataSourcesWorkspaceProps["refreshing"];
  onRefresh: DataSourcesWorkspaceProps["onRefresh"];
  onCreateIngestion: DataSourcesWorkspaceProps["onCreateIngestion"];
  onImportSource: DataSourcesWorkspaceProps["onImportSource"];
  onConfigureSource: DataSourcesWorkspaceProps["onConfigureSource"];
  onForgetProfile: (profile: SavedDataSourceProfile) => void;
}) {
  const isAggregate = datasource.id === ORGANIZATION_FILES_SOURCE_ID;
  const isUpload = datasource.type === "UPLOAD";
  const connectorType: DataSourceProfileType | null =
    datasource.type === "s3"
      ? "s3"
      : datasource.type === "snowflake"
        ? "snowflake"
        : null;
  const canReconnect = connectorType !== null;
  const canImport =
    connectorType !== null && datasource.credentialsConfigured === true;
  const hasSecondaryActions = Boolean(canReconnect || (profile && !isUpload));
  const openConnectionSettings = () => {
    if (connectorType) onConfigureSource(connectorType, profile);
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {(isAggregate || isUpload) && (
        <>
          <Button onClick={() => onCreateIngestion()}>
            <UploadCloudIcon data-icon="inline-start" />
            Upload files
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={dataLoading}
            aria-busy={refreshing}
          >
            <RefreshCwIcon
              data-icon="inline-start"
              className={
                refreshing
                  ? "animate-spin motion-reduce:animate-none"
                  : undefined
              }
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </>
      )}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {canImport && (
          <Button onClick={() => onImportSource(datasource)}>
            <ImportIcon data-icon="inline-start" />
            Import from source
          </Button>
        )}
        {canReconnect && (
          <Button variant="outline" onClick={openConnectionSettings}>
            Connection settings
          </Button>
        )}
        {profile && !isUpload && (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              variant="destructive"
              onClick={() => onForgetProfile(profile)}
            >
              <Trash2Icon data-icon="inline-start" />
              Forget settings
            </Button>
          </>
        )}
      </div>
      {hasSecondaryActions && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="sm:hidden"
                variant="outline"
                size="icon"
                aria-label="More source actions"
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {canReconnect && (
              <DropdownMenuItem onClick={openConnectionSettings}>
                Connection settings
              </DropdownMenuItem>
            )}
            {canImport && (
              <DropdownMenuItem onClick={() => onImportSource(datasource)}>
                <ImportIcon />
                Import from source
              </DropdownMenuItem>
            )}
            {profile && !isUpload && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onForgetProfile(profile)}
                >
                  <Trash2Icon />
                  Forget settings
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function DataSourcesWorkspace({
  workspaceId,
  datasources,
  files,
  jobs,
  profiles,
  loading,
  dataLoading,
  profileError,
  refreshing,
  onRefresh,
  onCreateIngestion,
  onImportSource,
  onOpenDocument,
  onConfigureSource,
  onDeleteProfile,
}: DataSourcesWorkspaceProps) {
  const inventorySource = useMemo<DataSource>(() => {
    const newestFile = [...files].sort((left, right) => {
      const leftTime = left.lastModified ? Date.parse(left.lastModified) : 0;
      const rightTime = right.lastModified ? Date.parse(right.lastModified) : 0;
      return rightTime - leftTime;
    })[0];
    return {
      id: ORGANIZATION_FILES_SOURCE_ID,
      organizationId:
        files[0]?.organizationId ?? datasources[0]?.organizationId ?? "",
      workspaceId,
      name: "All workspace files",
      type: "organization_files",
      createdAt: newestFile?.lastModified ?? new Date(0).toISOString(),
      updatedAt: newestFile?.lastModified ?? new Date(0).toISOString(),
    };
  }, [datasources, files, workspaceId]);
  const visibleSources = useMemo(
    () => [inventorySource, ...datasources],
    [datasources, inventorySource],
  );
  const [selectedId, setSelectedId] = useState(ORGANIZATION_FILES_SOURCE_ID);
  const [query, setQuery] = useState<DataSourceFilesQuery>(DEFAULT_QUERY);
  const [forgetProfile, setForgetProfile] =
    useState<SavedDataSourceProfile | null>(null);
  const [forgetPending, setForgetPending] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<DataFile[]>([]);
  const [selectedFileKeys, setSelectedFileKeys] = useState<string[]>([]);
  const [pendingFileAction, setPendingFileAction] = useState<{
    key: string;
    action: FileAction;
  } | null>(null);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const { jobs: globalIngestionJobs } = useGlobalIngestion();
  const sourceCounts = useDataSourceFileCounts(datasources);
  const selectedSource =
    visibleSources.find((datasource) => datasource.id === selectedId) ??
    inventorySource;
  const isAggregate = selectedSource.id === ORGANIZATION_FILES_SOURCE_ID;
  const backendFiles = useDataSourceFiles(
    isAggregate ? null : selectedSource.id,
    selectedSource.workspaceId,
    query,
  );

  const aggregateResult = useMemo<DataSourceFilesPage>(() => {
    const normalizedSearch = query.search.trim().toLowerCase();
    const filteredFiles = normalizedSearch
      ? files.filter((file) =>
          [file.name, file.key].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          ),
        )
      : files;
    const sortedFiles = sortFiles(filteredFiles, query.sortBy, query.sortOrder);
    const totalPages = Math.ceil(sortedFiles.length / query.pageSize);
    const safePage = Math.min(query.page, Math.max(1, totalPages || 1));
    const startIndex = (safePage - 1) * query.pageSize;
    return {
      organizationId: inventorySource.organizationId,
      datasourceId: inventorySource.id,
      bucket: files[0]?.bucket ?? "",
      files: sortedFiles.slice(startIndex, startIndex + query.pageSize),
      page: safePage,
      pageSize: query.pageSize,
      totalCount: sortedFiles.length,
      totalPages,
      totalUnfilteredCount: files.length,
      warning: null,
    };
  }, [files, inventorySource, query]);
  const result = isAggregate ? aggregateResult : backendFiles.result;
  const tableLoading = isAggregate ? loading : backendFiles.loading;
  const linkedJobs = useMemo(
    () =>
      jobs
        .filter((job) => job.datasource_id === selectedSource.id)
        .sort(
          (left, right) =>
            Date.parse(right.updated_at) - Date.parse(left.updated_at),
        ),
    [jobs, selectedSource.id],
  );
  const latestJob = linkedJobs[0] ?? null;
  const profile = isAggregate
    ? null
    : findReconnectProfile(selectedSource, profiles, jobs);
  const countFor = (datasource: DataSource): DataSourceFileCountState => {
    if (datasource.id === ORGANIZATION_FILES_SOURCE_ID) {
      return { count: files.length, loading, error: false };
    }
    if (
      datasource.id === selectedSource.id &&
      backendFiles.result?.datasourceId === datasource.id
    ) {
      return {
        count: backendFiles.result.totalUnfilteredCount,
        loading: false,
        error: false,
      };
    }
    return (
      sourceCounts[datasource.id] ?? {
        count: null,
        loading: true,
        error: false,
      }
    );
  };

  const selectSource = (datasourceId: string) => {
    setSelectedId(datasourceId);
    setQuery((current) => ({ ...current, page: 1 }));
  };
  const changeSort = (field: DataSourceFileSortField) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      sortBy: field,
      sortOrder:
        current.sortBy === field && current.sortOrder === "asc"
          ? "desc"
          : "asc",
    }));
  };

  useEffect(() => {
    setSelectedId(ORGANIZATION_FILES_SOURCE_ID);
    setQuery(DEFAULT_QUERY);
  }, [workspaceId]);
  useEffect(() => {
    if (!visibleSources.some((datasource) => datasource.id === selectedId)) {
      setSelectedId(ORGANIZATION_FILES_SOURCE_ID);
      setQuery((current) => ({ ...current, page: 1 }));
    }
  }, [selectedId, visibleSources]);
  useEffect(() => {
    if (!result) return;
    const safePage = Math.min(query.page, Math.max(1, result.totalPages || 1));
    if (safePage !== query.page) {
      setQuery((current) => ({ ...current, page: safePage }));
    }
  }, [query.page, result]);
  useEffect(() => {
    setSelectedFileKeys([]);
  }, [query.page, query.pageSize, query.search, query.sortBy, query.sortOrder, selectedId]);

  const uploadActivityKey = useMemo(
    () =>
      globalIngestionJobs
        .filter((job) => job.source === "upload")
        .map((job) =>
          [
            job.id,
            job.status,
            job.errorMessage ?? "",
            job.retry ?? "",
            ...job.objects.map((object) =>
              [object.key, object.status, object.errorMessage ?? ""].join(":"),
            ),
          ].join("|"),
        )
        .join("||"),
    [globalIngestionJobs],
  );

  const confirmForget = () => {
    if (!forgetProfile || forgetPending) return;
    setForgetPending(true);
    try {
      onDeleteProfile(forgetProfile.id);
      toast.success(`Reconnect settings for ${forgetProfile.name} forgotten.`);
      setForgetProfile(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to forget reconnect settings.",
      );
    } finally {
      setForgetPending(false);
    }
  };
  const configureSelectedSource = () => {
    if (selectedSource.type === "s3") {
      onConfigureSource("s3", profile);
    } else if (selectedSource.type === "snowflake") {
      onConfigureSource("snowflake", profile);
    }
  };

  const refreshFileInventory = useCallback(() => {
    onRefresh();
    if (!isAggregate) backendFiles.refresh();
  }, [backendFiles.refresh, isAggregate, onRefresh]);

  useEffect(() => {
    if (!uploadActivityKey) return;
    refreshFileInventory();
  }, [refreshFileInventory, uploadActivityKey]);

  const pollIndexingJob = async (
    datasetId: string,
    expectedJobId: string,
    action: Exclude<FileAction, "delete">,
  ): Promise<IndexingJob | null> => {
    let latestJob: IndexingJob | null = null;
    for (let attempt = 0; attempt < ACTION_POLL_ATTEMPTS; attempt += 1) {
      await waitForActionPoll();
      try {
        latestJob = await getLatestIndexingJob(datasetId);
        refreshFileInventory();
      } catch {
        continue;
      }

      if (action === "cancel") {
        if (latestJob.status === "cancelled") return latestJob;
      } else if (
        latestJob.job_id === expectedJobId &&
        latestJob.status !== "queued"
      ) {
        return latestJob;
      }
    }
    return latestJob;
  };

  const pollPurgeOperation = async (
    operation: FilePurgeOperationResponse,
  ) => {
    let latestOperation = operation;
    const updateProgress = (current: FilePurgeOperationResponse) => {
      const completed = current.items.filter(
        (item) => item.status === "deleted",
      ).length;
      const failed = current.items.filter(
        (item) => item.status === "failed",
      ).length;
      setBulkProgress({
        action: "delete",
        completed,
        total: current.file_count,
        failed,
      });
    };

    updateProgress(latestOperation);
    for (let attempt = 0; attempt < ACTION_POLL_ATTEMPTS; attempt += 1) {
      if (
        latestOperation.status === "completed" ||
        latestOperation.status === "failed"
      ) {
        return latestOperation;
      }
      await waitForActionPoll();
      try {
        latestOperation = await getFilePurgeOperation(
          latestOperation.operation_id,
        );
        updateProgress(latestOperation);
        refreshFileInventory();
      } catch {
        // Keep the accepted operation visible while a status check is unavailable.
      }
    }
    return latestOperation;
  };

  const runFileAction = async (
    action: Exclude<FileAction, "delete">,
    file: DataFile,
  ) => {
    const datasetId = file.datasetId?.trim();
    if (!datasetId || pendingFileAction || bulkProgress) return;

    setPendingFileAction({ key: file.key, action });
    try {
      if (action === "reprocess") {
        const response = await reprocessIndexingFile(
          datasetId,
          crypto.randomUUID(),
        );
        const latestJob = await pollIndexingJob(
          datasetId,
          response.job_id,
          action,
        );
        toast.success(
          latestJob?.status === "failed"
            ? `${file.name} reprocessing failed.`
            : `${file.name} was queued for reprocessing.`,
        );
      } else {
        if (action === "cancel") {
          const latestJob = await getLatestIndexingJob(datasetId);
          if (latestJob.status === "cancel_requested") {
            toast.info(`Stopping ${file.name} is already in progress.`);
          } else if (latestJob.status !== "queued" && latestJob.status !== "running") {
            throw new Error("This file is no longer being processed.");
          } else {
            await cancelIndexingJob(latestJob.job_id);
            const polledJob = await pollIndexingJob(
              datasetId,
              latestJob.job_id,
              action,
            );
            toast.success(
              polledJob?.status === "cancelled"
                ? `${file.name} processing was stopped.`
                : `Stop requested for ${file.name}.`,
            );
          }
        } else {
          const response = await retryIndexingFile(datasetId);
          const polledJob = await pollIndexingJob(
            datasetId,
            response.job_id,
            action,
          );
          toast.success(
            polledJob?.status === "failed"
              ? `${file.name} retry failed.`
              : `${file.name} was queued for retry.`,
          );
        }
      }
      refreshFileInventory();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Unable to ${action} ${file.name}.`,
      );
    } finally {
      setPendingFileAction(null);
    }
  };

  const runBulkRetry = async (filesToRetry: DataFile[]) => {
    if (bulkProgress || pendingFileAction || !filesToRetry.length) return;
    const files = filesToRetry.filter((file) => file.datasetId?.trim());
    if (!files.length) return;

    setSelectedFileKeys([]);
    setBulkProgress({
      action: "retry",
      completed: 0,
      total: files.length,
      failed: 0,
    });
    let completed = 0;
    let failed = 0;
    for (const file of files) {
      try {
        const response = await retryIndexingFile(file.datasetId!.trim());
        await pollIndexingJob(
          file.datasetId!.trim(),
          response.job_id,
          "retry",
        );
      } catch (error) {
        failed += 1;
        if (error instanceof Error) toast.error(`${file.name}: ${error.message}`);
      } finally {
        completed += 1;
        setBulkProgress({
          action: "retry",
          completed,
          total: files.length,
          failed,
        });
      }
    }
    refreshFileInventory();
    setBulkProgress(null);
    if (failed) {
      toast.warning(`${completed - failed} retried, ${failed} failed.`);
    } else {
      toast.success(`${completed} file${completed === 1 ? "" : "s"} queued for retry.`);
    }
  };

  const confirmDelete = async () => {
    const files = deleteTargets;
    const datasetIds = files
      .map((file) => file.datasetId?.trim())
      .filter((datasetId): datasetId is string => Boolean(datasetId));
    if (!files.length || !datasetIds.length || bulkProgress || pendingFileAction) {
      return;
    }

    setBulkProgress({
      action: "delete",
      completed: 0,
      total: datasetIds.length,
      failed: 0,
    });
    setSelectedFileKeys([]);
    try {
      const operation = await purgeDataFiles(datasetIds);
      setDeleteTargets([]);
      const finalOperation = await pollPurgeOperation(operation);
      if (finalOperation.status === "completed") {
        toast.success(`${datasetIds.length} file${datasetIds.length === 1 ? "" : "s"} deleted.`);
      } else if (finalOperation.status === "failed") {
        toast.error("Some files could not be deleted.");
      } else {
        toast.info("Deletion is still running. The inventory will refresh automatically.");
      }
      refreshFileInventory();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete the selected files.",
      );
    } finally {
      setBulkProgress(null);
    }
  };

  return (
    <div className="min-w-0">
      <div className="border-b p-4 lg:hidden">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-auto min-h-11 min-w-0 flex-1 justify-start gap-3 px-3 py-2 text-left"
                  aria-label={`Select data source. Current source: ${displayName(selectedSource)}`}
                />
              }
            >
              <SourceIdentity
                datasource={selectedSource}
                count={countFor(selectedSource)}
                selected
              />
              <ChevronDownIcon className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[var(--anchor-width)] min-w-72 max-w-[calc(100vw-2rem)] p-1.5"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Data sources</DropdownMenuLabel>
                {visibleSources.map((datasource) => {
                  const selected = datasource.id === selectedSource.id;
                  return (
                    <DropdownMenuItem
                      key={datasource.id}
                      className="min-h-12 min-w-0 gap-3 px-2.5 py-2"
                      onClick={() => selectSource(datasource.id)}
                      aria-label={`Select ${displayName(datasource)}`}
                    >
                      <SourceIdentity
                        datasource={datasource}
                        count={countFor(datasource)}
                        selected={selected}
                      />
                      {selected && (
                        <CheckIcon
                          className="size-4 shrink-0 text-primary"
                          aria-label="Selected source"
                        />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <AddSourceMenu onConfigureSource={onConfigureSource} />
        </div>
        {profileError && (
          <Alert variant="destructive" className="mt-3">
            <AlertTitle>Reconnect settings unavailable</AlertTitle>
            <AlertDescription>{profileError}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid min-w-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className="hidden border-r p-4 lg:block"
          aria-label="Data sources"
        >
          <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h3 className="text-sm font-semibold">Data sources</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {datasources.length.toLocaleString()} connected
                </p>
              </div>
              <AddSourceMenu onConfigureSource={onConfigureSource} />
            </div>
            {profileError && (
              <Alert variant="destructive" className="mt-3">
                <AlertTitle>Reconnect settings unavailable</AlertTitle>
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}
            <ScrollArea className="mt-4 max-h-[min(62dvh,36rem)]">
              <div className="flex flex-col gap-2 pr-2">
                {visibleSources.map((datasource) => {
                  const selected = selectedSource.id === datasource.id;
                  return (
                    <Button
                      type="button"
                      variant="ghost"
                      key={datasource.id}
                      onClick={() => selectSource(datasource.id)}
                      aria-pressed={selected}
                      className={cn(
                        "relative h-auto min-h-16 w-full justify-start gap-3 overflow-hidden rounded-lg border px-3 py-2.5 text-left",
                        selected
                          ? "border-primary/30 bg-primary/10 text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                          : "border-transparent hover:border-border hover:bg-muted/50",
                      )}
                    >
                      <SourceIdentity
                        datasource={datasource}
                        count={countFor(datasource)}
                        selected={selected}
                      />
                    </Button>
                  );
                })}
              </div>
          </ScrollArea>
        </aside>

        <section className="min-w-0" aria-label="Selected data source files">
          <header className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-card text-primary">
                  <SourceIcon datasource={selectedSource} className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">
                      {displayName(selectedSource)}
                    </h3>
                  </div>
                </div>
              </div>
              <SourceActions
                datasource={selectedSource}
                profile={profile}
                dataLoading={dataLoading}
                refreshing={refreshing}
                onRefresh={onRefresh}
                onCreateIngestion={onCreateIngestion}
                onImportSource={onImportSource}
                onConfigureSource={onConfigureSource}
                onForgetProfile={setForgetProfile}
              />
            </div>
          </header>
          <Separator />
          {backendFiles.error && !isAggregate && (
            <Alert variant="destructive" className="m-4">
              <AlertTitle>Unable to load source files</AlertTitle>
              <AlertDescription>{backendFiles.error}</AlertDescription>
              <Button
                className="mt-3"
                variant="outline"
                size="sm"
                onClick={backendFiles.refresh}
              >
                Retry
              </Button>
            </Alert>
          )}
          {result?.warning && (
            <Alert className="m-4">
              <AlertTitle>Processing status unavailable</AlertTitle>
              <AlertDescription>{result.warning}</AlertDescription>
            </Alert>
          )}
          {(result || !backendFiles.error || isAggregate) && (
            <DataSourceFilesTable
              result={result}
              loading={tableLoading}
              search={query.search}
              page={result?.page ?? query.page}
              pageSize={query.pageSize}
              sortBy={query.sortBy}
              sortOrder={query.sortOrder}
              onSearchChange={(search) =>
                setQuery((current) => ({ ...current, search, page: 1 }))
              }
              onPageChange={(page) =>
                setQuery((current) => ({ ...current, page }))
              }
              onPageSizeChange={(pageSize) =>
                setQuery((current) => ({
                  ...current,
                  page: 1,
                  pageSize,
                }))
              }
              onSortChange={changeSort}
              onInspect={(file) =>
                onOpenDocument(file, displayName(selectedSource))
              }
              onCreateIngestion={
                isAggregate || selectedSource.type === "UPLOAD"
                  ? onCreateIngestion
                  : selectedSource.type === "s3" ||
                      selectedSource.type === "snowflake"
                    ? configureSelectedSource
                    : undefined
              }
              onCancelIndexing={(file) => void runFileAction("cancel", file)}
              onRetryIndexing={(file) => void runFileAction("retry", file)}
              onReprocessIndexing={(file) =>
                void runFileAction("reprocess", file)
              }
              onDeleteFile={(file) => setDeleteTargets([file])}
              onBulkRetry={(files) => void runBulkRetry(files)}
              onBulkDelete={setDeleteTargets}
              selectedFileKeys={selectedFileKeys}
              onSelectedFileKeysChange={setSelectedFileKeys}
              pendingFileKey={pendingFileAction?.key ?? null}
              pendingAction={pendingFileAction?.action}
              bulkProgress={bulkProgress}
            />
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(forgetProfile)}
        onOpenChange={(open) => {
          if (!open && !forgetPending) setForgetProfile(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forget reconnect settings?</DialogTitle>
            <DialogDescription>
              This removes the saved non-secret reconnect settings for{" "}
              <strong>{forgetProfile?.name}</strong> from this browser. The
              backend data source, files, and ingestion history remain
              available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={forgetPending} />}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={forgetPending}
              aria-busy={forgetPending}
              onClick={confirmForget}
            >
              <Trash2Icon data-icon="inline-start" />
              {forgetPending ? "Forgetting…" : "Forget settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !bulkProgress) setDeleteTargets([]);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTargets.length > 1 ? "files" : "file"} permanently?
            </DialogTitle>
            <DialogDescription>
              This removes {deleteTargets.length > 1 ? "the selected files" : <strong>{deleteTargets[0]?.name}</strong>},
              their indexed content, and stored objects. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="outline"
                  disabled={Boolean(bulkProgress)}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={Boolean(bulkProgress)}
              aria-busy={Boolean(bulkProgress)}
              onClick={() => void confirmDelete()}
            >
              <Trash2Icon data-icon="inline-start" />
              {bulkProgress?.action === "delete"
                ? "Deleting…"
                : `Delete ${deleteTargets.length > 1 ? "files" : "file"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
