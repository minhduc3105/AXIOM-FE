import { useEffect, useMemo, useState } from "react";
import {
  CloudIcon,
  DatabaseIcon,
  PlusIcon,
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import type { SavedDataSourceProfile } from "@/shared/types/data-source-profile";
import type { DataFile, DataSource, IngestionJob } from "../model/types";
import { useDataSourceFiles } from "../model/useDataSourceFiles";
import { DataEmptyState } from "./DataEmptyState";
import { DataSourceFileInspector } from "./DataSourceFileInspector";
import { DataSourceFilesTable } from "./DataSourceFilesTable";
import { StatusBadge } from "./StatusBadge";

type DataSourcesWorkspaceProps = {
  datasources: DataSource[];
  jobs: IngestionJob[];
  profiles: SavedDataSourceProfile[];
  loading: boolean;
  profileError: string | null;
  onCreateIngestion: (context?: { connector?: "s3" | "snowflake"; profileId?: string }) => void;
  onDeleteProfile: (profileId: string) => void;
  onViewJobs: (jobId?: string) => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function displayName(datasource: DataSource) {
  if (datasource.type === "UPLOAD") return "Uploaded files";
  if (datasource.name?.trim()) return datasource.name;
  if (datasource.type === "s3") return "Amazon S3";
  if (datasource.type === "snowflake") return "Snowflake source";
  return datasource.type;
}

function sourceDescription(datasource: DataSource) {
  if (datasource.type === "UPLOAD") return "Built-in source";
  if (datasource.type === "s3") return "Amazon S3";
  if (datasource.type === "snowflake") return "Snowflake";
  return "External source";
}

function SourceIcon({ datasource, className }: { datasource: DataSource; className?: string }) {
  if (datasource.type === "UPLOAD") return <UploadCloudIcon className={className} />;
  if (datasource.type === "s3") return <CloudIcon className={className} />;
  if (datasource.type === "snowflake") return <SnowflakeIcon className={className} />;
  return <DatabaseIcon className={className} />;
}

function findReconnectProfile(
  datasource: DataSource,
  profiles: SavedDataSourceProfile[],
  jobs: IngestionJob[],
) {
  const direct = profiles.find((profile) => profile.backendDatasourceId === datasource.id);
  if (direct) return direct;
  const sourceJobIds = new Set(
    jobs.filter((job) => job.datasource_id === datasource.id).map((job) => job.job_id),
  );
  return profiles.find((profile) => profile.linkedJobIds.some((jobId) => sourceJobIds.has(jobId))) ?? null;
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
    () => jobs
      .filter((job) => job.datasource_id === datasource.id)
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at)),
    [datasource.id, jobs],
  );
  const latestJob = linkedJobs[0] ?? null;
  const connector = datasource.type === "s3" || datasource.type === "snowflake"
    ? datasource.type
    : null;

  useEffect(() => {
    if (inspectedFile && !files.result?.files.some((file) => file.key === inspectedFile.key)) {
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
      <header className="border-b p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><SourceIcon datasource={datasource} className="size-5" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{displayName(datasource)}</h3>
                {datasource.type === "UPLOAD" ? <Badge variant="secondary">System source</Badge> : profile ? <Badge variant="secondary">Reconnect saved</Badge> : <Badge variant="outline">Backend source</Badge>}
                {latestJob && <StatusBadge status={latestJob.healthStatus} />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{sourceDescription(datasource)}</p>
              <p className="mt-2 text-xs text-muted-foreground">Updated {formatDate(datasource.updatedAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestJob && <Button variant="outline" onClick={() => onViewJobs(latestJob.job_id)}>View jobs</Button>}
            {datasource.type === "UPLOAD" ? (
              <Button onClick={() => onCreateIngestion()}><PlusIcon />Upload files</Button>
            ) : connector ? (
              <Button variant="outline" onClick={() => onCreateIngestion({ connector, ...(profile ? { profileId: profile.id } : {}) })}>Reconnect / import</Button>
            ) : null}
            {profile && datasource.type !== "UPLOAD" && (
              <Button variant="outline" className="text-destructive" onClick={() => onForgetProfile(profile)}><Trash2Icon />Forget settings</Button>
            )}
          </div>
        </div>
      </header>
      {files.error && <Alert variant="destructive" className="m-4"><AlertTitle>Unable to load source files</AlertTitle><AlertDescription>{files.error}</AlertDescription><Button className="mt-3" variant="outline" size="sm" onClick={files.refresh}>Retry</Button></Alert>}
      {files.result?.warning && <Alert className="m-4"><AlertTitle>Processing status unavailable</AlertTitle><AlertDescription>{files.result.warning}</AlertDescription></Alert>}
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
          onCreateIngestion={datasource.type === "UPLOAD" ? () => onCreateIngestion() : connector ? () => onCreateIngestion({ connector, ...(profile ? { profileId: profile.id } : {}) }) : undefined}
        />
      )}
    </div>
  );
}

export function DataSourcesWorkspace({
  datasources,
  jobs,
  profiles,
  loading,
  profileError,
  onCreateIngestion,
  onDeleteProfile,
  onViewJobs,
}: DataSourcesWorkspaceProps) {
  const preferredSource = datasources.find((datasource) => datasource.type === "UPLOAD") ?? datasources[0] ?? null;
  const [selectedId, setSelectedId] = useState(preferredSource?.id ?? "");
  const [forgetProfile, setForgetProfile] = useState<SavedDataSourceProfile | null>(null);
  const selectedSource = datasources.find((datasource) => datasource.id === selectedId) ?? preferredSource;

  useEffect(() => {
    if (!selectedSource && preferredSource) setSelectedId(preferredSource.id);
    if (selectedSource && selectedId !== selectedSource.id) setSelectedId(selectedSource.id);
  }, [preferredSource, selectedId, selectedSource]);

  return (
    <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-b p-4 xl:border-b-0 xl:border-r" aria-label="Data sources">
        <div className="flex items-center justify-between gap-3 px-1">
          <div><h3 className="font-semibold">Data sources</h3><p className="mt-1 text-xs text-muted-foreground">{datasources.length} available</p></div>
          <DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" aria-label="Add external source" />}><PlusIcon /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onCreateIngestion({ connector: "s3" })}><CloudIcon />Amazon S3</DropdownMenuItem><DropdownMenuItem onClick={() => onCreateIngestion({ connector: "snowflake" })}><SnowflakeIcon />Snowflake</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
        {profileError && <Alert variant="destructive" className="mt-3"><AlertTitle>Reconnect settings unavailable</AlertTitle><AlertDescription>{profileError}</AlertDescription></Alert>}
        <div className="mt-4 grid gap-2">
          {datasources.map((datasource) => (
            <button type="button" key={datasource.id} onClick={() => setSelectedId(datasource.id)} aria-pressed={selectedSource?.id === datasource.id} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/25", selectedSource?.id === datasource.id ? "border-primary/35 bg-primary/10" : "hover:bg-muted/50")}>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-primary"><SourceIcon datasource={datasource} className="size-4" /></span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{displayName(datasource)}</strong><span className="block truncate text-xs text-muted-foreground">{sourceDescription(datasource)}</span></span>
            </button>
          ))}
        </div>
      </aside>
      <section className="min-w-0">
        {selectedSource ? (
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
            description={loading ? "Reading organization data sources." : "Upload files or connect an external source to begin."}
            actionLabel={loading ? undefined : "Data Ingestion"}
            onAction={loading ? undefined : () => onCreateIngestion()}
          />
        )}
      </section>
      <Dialog open={Boolean(forgetProfile)} onOpenChange={(open) => { if (!open) setForgetProfile(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Forget reconnect settings?</DialogTitle><DialogDescription>This removes the saved non-secret settings for {forgetProfile?.name} from this browser. The backend data source, files and ingestion history remain available.</DialogDescription></DialogHeader>
          <DialogFooter showCloseButton><Button variant="destructive" onClick={() => { if (forgetProfile) onDeleteProfile(forgetProfile.id); setForgetProfile(null); }}>Forget settings</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
