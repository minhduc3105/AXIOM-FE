import { useEffect, useMemo, useState } from "react";
import {
  CloudIcon,
  DatabaseIcon,
  PlusIcon,
  ServerIcon,
  SnowflakeIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/shared/lib/utils";
import type { SavedDataSourceProfile } from "@/shared/types/data-source-profile";
import type {
  DataFile,
  DataSource,
  DataSourceFileSortField,
  DataSourceFileSortOrder,
  DataSourceFilesPage,
  IngestionJob,
} from "../model/types";
import { useDataSourceFiles } from "../model/useDataSourceFiles";
import { DataEmptyState } from "./DataEmptyState";
import { DataSourceFileInspector } from "./DataSourceFileInspector";
import { DataSourceFilesTable } from "./DataSourceFilesTable";
import { StatusBadge } from "./StatusBadge";

type DataSourcesWorkspaceProps = {
  datasources: DataSource[];
  files: DataFile[];
  jobs: IngestionJob[];
  profiles: SavedDataSourceProfile[];
  loading: boolean;
  profileError: string | null;
  onCreateIngestion: (context?: {
    connector?: "s3" | "snowflake";
    profileId?: string;
  }) => void;
  onDeleteProfile: (profileId: string) => void;
  onViewJobs: (jobId?: string) => void;
};

const ORGANIZATION_FILES_SOURCE_ID = "__organization_files__";

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
  if (datasource.id === ORGANIZATION_FILES_SOURCE_ID) return "Stored objects";
  if (datasource.type === "UPLOAD") return "Uploaded files";
  if (datasource.name?.trim()) return datasource.name;
  if (datasource.type === "s3") return "Amazon S3";
  if (datasource.type === "snowflake") return "Snowflake source";
  return datasource.type;
}

function sourceDescription(datasource: DataSource) {
  if (datasource.id === ORGANIZATION_FILES_SOURCE_ID)
    return "Organization file inventory";
  if (datasource.type === "UPLOAD") return "Built-in source";
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
  if (direct) return direct;
  const sourceJobIds = new Set(
    jobs
      .filter((job) => job.datasource_id === datasource.id)
      .map((job) => job.job_id),
  );
  return (
    profiles.find((profile) =>
      profile.linkedJobIds.some((jobId) => sourceJobIds.has(jobId)),
    ) ?? null
  );
}

function sortFiles(
  files: DataFile[],
  sortBy: DataSourceFileSortField,
  sortOrder: DataSourceFileSortOrder,
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

function OrganizationFilesDetail({
  datasource,
  files,
  onCreateIngestion,
}: {
  datasource: DataSource;
  files: DataFile[];
  onCreateIngestion: DataSourcesWorkspaceProps["onCreateIngestion"];
}) {
  const [inspectedFile, setInspectedFile] = useState<DataFile | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] =
    useState<DataSourceFileSortField>("last_modified");
  const [sortOrder, setSortOrder] = useState<DataSourceFileSortOrder>("desc");
  const result = useMemo<DataSourceFilesPage>(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filteredFiles = normalizedSearch
      ? files.filter((file) =>
          [file.name, file.key, file.type, file.statusDetail].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          ),
        )
      : files;
    const sortedFiles = sortFiles(filteredFiles, sortBy, sortOrder);
    const totalPages = Math.ceil(sortedFiles.length / pageSize);
    const safePage = Math.min(page, Math.max(1, totalPages || 1));
    const startIndex = (safePage - 1) * pageSize;
    return {
      organizationId: files[0]?.organizationId ?? datasource.organizationId,
      datasourceId: datasource.id,
      bucket: files[0]?.bucket ?? "",
      files: sortedFiles.slice(startIndex, startIndex + pageSize),
      page: safePage,
      pageSize,
      totalCount: sortedFiles.length,
      totalPages,
      totalUnfilteredCount: files.length,
      warning: null,
    };
  }, [
    datasource.id,
    datasource.organizationId,
    files,
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (page !== result.page) setPage(result.page);
  }, [page, result.page]);
  useEffect(() => {
    if (
      inspectedFile &&
      !files.some((file) => file.key === inspectedFile.key)
    ) {
      setInspectedFile(null);
    }
  }, [files, inspectedFile]);

  const changeSort = (field: DataSourceFileSortField) => {
    setSortOrder((current) =>
      sortBy === field && current === "asc" ? "desc" : "asc",
    );
    setSortBy(field);
    setPage(1);
  };

  if (inspectedFile) {
    return (
      <DataSourceFileInspector
        datasource={datasource}
        file={inspectedFile}
        onBack={() => setInspectedFile(null)}
      />
    );
  }

  return (
    <div className="min-w-0">
      <header className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <SourceIcon datasource={datasource} className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {displayName(datasource)}
                </h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {sourceDescription(datasource)}
              </p>
            </div>
          </div>
          <Button onClick={() => onCreateIngestion()}>
            <PlusIcon data-icon="inline-start" />
            Upload files
          </Button>
        </div>
      </header>
      <Separator />
      <DataSourceFilesTable
        result={result}
        loading={false}
        search={search}
        page={result.page}
        pageSize={pageSize}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
        onSortChange={changeSort}
        onInspect={setInspectedFile}
        onCreateIngestion={() => onCreateIngestion()}
      />
    </div>
  );
}

function SourceDetail({
  datasource,
  jobs,
  profile,
  onCreateIngestion,
  onForgetProfile,
  onViewJobs,
}: {
  datasource: DataSource;
  jobs: IngestionJob[];
  profile: SavedDataSourceProfile | null;
  onCreateIngestion: DataSourcesWorkspaceProps["onCreateIngestion"];
  onForgetProfile: (profile: SavedDataSourceProfile) => void;
  onViewJobs: (jobId?: string) => void;
}) {
  const files = useDataSourceFiles(datasource.id);
  const [inspectedFile, setInspectedFile] = useState<DataFile | null>(null);
  const linkedJobs = useMemo(
    () =>
      jobs
        .filter((job) => job.datasource_id === datasource.id)
        .sort(
          (left, right) =>
            Date.parse(right.updated_at) - Date.parse(left.updated_at),
        ),
    [datasource.id, jobs],
  );
  const latestJob = linkedJobs[0] ?? null;
  const connector =
    datasource.type === "s3" || datasource.type === "snowflake"
      ? datasource.type
      : null;

  useEffect(() => {
    if (
      inspectedFile &&
      !files.result?.files.some((file) => file.key === inspectedFile.key)
    ) {
      setInspectedFile(null);
    }
  }, [files.result?.files, inspectedFile]);

  if (inspectedFile) {
    return (
      <DataSourceFileInspector
        datasource={datasource}
        file={inspectedFile}
        onBack={() => setInspectedFile(null)}
      />
    );
  }

  return (
    <div className="min-w-0">
      <header className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <SourceIcon datasource={datasource} className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {displayName(datasource)}
                </h3>
                {datasource.type === "UPLOAD" ? (
                  <Badge variant="secondary">System source</Badge>
                ) : profile ? (
                  <Badge variant="secondary">Reconnect saved</Badge>
                ) : (
                  <Badge variant="outline">Backend source</Badge>
                )}
                {latestJob && <StatusBadge status={latestJob.healthStatus} />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {sourceDescription(datasource)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Updated {formatDate(datasource.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestJob && (
              <Button
                variant="outline"
                onClick={() => onViewJobs(latestJob.job_id)}
              >
                View jobs
              </Button>
            )}
            {datasource.type === "UPLOAD" ? (
              <Button onClick={() => onCreateIngestion()}>
                <PlusIcon data-icon="inline-start" />
                Upload files
              </Button>
            ) : connector ? (
              <Button
                variant="outline"
                onClick={() =>
                  onCreateIngestion({
                    connector,
                    ...(profile ? { profileId: profile.id } : {}),
                  })
                }
              >
                Reconnect / import
              </Button>
            ) : null}
            {profile && datasource.type !== "UPLOAD" && (
              <Button
                variant="destructive"
                onClick={() => onForgetProfile(profile)}
              >
                <Trash2Icon data-icon="inline-start" />
                Forget settings
              </Button>
            )}
          </div>
        </div>
      </header>
      <Separator />
      {files.error && (
        <Alert variant="destructive" className="m-4">
          <AlertTitle>Unable to load source files</AlertTitle>
          <AlertDescription>{files.error}</AlertDescription>
          <Button
            className="mt-3"
            variant="outline"
            size="sm"
            onClick={files.refresh}
          >
            Retry
          </Button>
        </Alert>
      )}
      {files.result?.warning && (
        <Alert className="m-4">
          <AlertTitle>Processing status unavailable</AlertTitle>
          <AlertDescription>{files.result.warning}</AlertDescription>
        </Alert>
      )}
      {!files.error && (
        <DataSourceFilesTable
          result={files.result}
          loading={files.loading}
          search={files.search}
          page={files.page}
          pageSize={files.pageSize}
          sortBy={files.sortBy}
          sortOrder={files.sortOrder}
          onSearchChange={files.setSearch}
          onPageChange={files.setPage}
          onPageSizeChange={files.setPageSize}
          onSortChange={files.changeSort}
          onInspect={setInspectedFile}
          onCreateIngestion={
            datasource.type === "UPLOAD"
              ? () => onCreateIngestion()
              : connector
                ? () =>
                    onCreateIngestion({
                      connector,
                      ...(profile ? { profileId: profile.id } : {}),
                    })
                : undefined
          }
        />
      )}
    </div>
  );
}

export function DataSourcesWorkspace({
  datasources,
  files,
  jobs,
  profiles,
  loading,
  profileError,
  onCreateIngestion,
  onDeleteProfile,
  onViewJobs,
}: DataSourcesWorkspaceProps) {
  const inventorySource = useMemo<DataSource | null>(() => {
    if (datasources.length > 0 || files.length === 0) return null;
    const newestFile = [...files].sort((left, right) => {
      const leftTime = left.lastModified ? Date.parse(left.lastModified) : 0;
      const rightTime = right.lastModified ? Date.parse(right.lastModified) : 0;
      return rightTime - leftTime;
    })[0];
    return {
      id: ORGANIZATION_FILES_SOURCE_ID,
      organizationId: files[0]?.organizationId ?? "",
      name: "Stored objects",
      type: "organization_files",
      createdAt: newestFile?.lastModified ?? new Date(0).toISOString(),
      updatedAt: newestFile?.lastModified ?? new Date(0).toISOString(),
    };
  }, [datasources.length, files]);
  const visibleSources = inventorySource ? [inventorySource] : datasources;
  const preferredSource =
    visibleSources.find((datasource) => datasource.type === "UPLOAD") ??
    visibleSources[0] ??
    null;
  const [selectedId, setSelectedId] = useState(preferredSource?.id ?? "");
  const [forgetProfile, setForgetProfile] =
    useState<SavedDataSourceProfile | null>(null);
  const selectedSource =
    visibleSources.find((datasource) => datasource.id === selectedId) ??
    preferredSource;

  useEffect(() => {
    if (!selectedSource && preferredSource) setSelectedId(preferredSource.id);
    if (selectedSource && selectedId !== selectedSource.id)
      setSelectedId(selectedSource.id);
  }, [preferredSource, selectedId, selectedSource]);

  return (
    <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside
        className="border-b p-4 xl:border-b-0 xl:border-r"
        aria-label="Data sources"
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h3 className="font-semibold">Data sources</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {visibleSources.length} available
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="icon-sm" aria-label="Add external source" />
              }
            >
              <PlusIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => onCreateIngestion({ connector: "s3" })}
                >
                  <CloudIcon />
                  Amazon S3
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onCreateIngestion({ connector: "snowflake" })}
                >
                  <SnowflakeIcon />
                  Snowflake
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {profileError && (
          <Alert variant="destructive" className="mt-3">
            <AlertTitle>Reconnect settings unavailable</AlertTitle>
            <AlertDescription>{profileError}</AlertDescription>
          </Alert>
        )}
        <ScrollArea className="mt-4 max-h-[460px]">
          <div className="flex flex-col gap-2 pr-2">
            {visibleSources.map((datasource) => (
              <button
                type="button"
                key={datasource.id}
                onClick={() => setSelectedId(datasource.id)}
                aria-pressed={selectedSource?.id === datasource.id}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/25",
                  selectedSource?.id === datasource.id
                    ? "border-primary/35 bg-primary/10"
                    : "hover:bg-muted/50",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                  <SourceIcon datasource={datasource} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {displayName(datasource)}
                  </strong>
                  <span className="block truncate text-xs text-muted-foreground">
                    {sourceDescription(datasource)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>
      <section className="min-w-0">
        {selectedSource?.id === ORGANIZATION_FILES_SOURCE_ID ? (
          <OrganizationFilesDetail
            datasource={selectedSource}
            files={files}
            onCreateIngestion={onCreateIngestion}
          />
        ) : selectedSource ? (
          <SourceDetail
            key={selectedSource.id}
            datasource={selectedSource}
            jobs={jobs}
            profile={findReconnectProfile(selectedSource, profiles, jobs)}
            onCreateIngestion={onCreateIngestion}
            onForgetProfile={setForgetProfile}
            onViewJobs={onViewJobs}
          />
        ) : (
          <DataEmptyState
            title={loading ? "Loading data sources" : "No data sources yet"}
            description={
              loading
                ? "Reading organization data sources."
                : "Upload files or connect an external source to begin."
            }
            actionLabel={loading ? undefined : "Data Ingestion"}
            onAction={loading ? undefined : () => onCreateIngestion()}
          />
        )}
      </section>
      <Dialog
        open={Boolean(forgetProfile)}
        onOpenChange={(open) => {
          if (!open) setForgetProfile(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forget reconnect settings?</DialogTitle>
            <DialogDescription>
              This removes the saved non-secret settings for{" "}
              {forgetProfile?.name} from this browser. The backend data source,
              files and ingestion history remain available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => {
                if (forgetProfile) onDeleteProfile(forgetProfile.id);
                setForgetProfile(null);
              }}
            >
              Forget settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
