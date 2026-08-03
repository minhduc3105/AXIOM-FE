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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/shared/lib/utils";
import type { SavedDataSourceProfile, SavedS3Config, SavedSnowflakeConfig } from "@/shared/types/data-source-profile";
import type { DataFile, IngestionJob } from "../model/types";
import { useJobDataFiles, useUploadedDataFiles } from "../model/useJobDataFiles";
import { DataTable } from "./DataTable";
import { StatusBadge } from "./StatusBadge";

type DataSourcesWorkspaceProps = {
  files: DataFile[];
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

function sourceTarget(profile: SavedDataSourceProfile) {
  if (profile.type === "s3") {
    const config = profile.config as SavedS3Config;
    return `${config.bucketName} · ${config.region}`;
  }
  const config = profile.config as SavedSnowflakeConfig;
  return [config.account, config.database, config.schema].filter(Boolean).join(" / ");
}

function ExternalSourceDetail({
  profile,
  jobs,
  onManage,
  onDelete,
  onViewJobs,
}: {
  profile: SavedDataSourceProfile;
  jobs: IngestionJob[];
  onManage: () => void;
  onDelete: () => void;
  onViewJobs: (jobId?: string) => void;
}) {
  const linkedJobs = useMemo(() => {
    const linkedIds = new Set(profile.linkedJobIds);
    return jobs
      .filter((job) => linkedIds.has(job.job_id) && job.datasource_type === profile.type)
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
  }, [jobs, profile.linkedJobIds, profile.type]);
  const [selectedJobId, setSelectedJobId] = useState(linkedJobs[0]?.job_id ?? "");
  useEffect(() => {
    if (!linkedJobs.some((job) => job.job_id === selectedJobId)) {
      setSelectedJobId(linkedJobs[0]?.job_id ?? "");
    }
  }, [linkedJobs, selectedJobId]);
  const selectedJob = linkedJobs.find((job) => job.job_id === selectedJobId) ?? null;
  const { files, loading, error } = useJobDataFiles(selectedJob?.job_id ?? null);
  const latestJob = linkedJobs[0] ?? null;

  return (
    <div className="min-w-0">
      <header className="border-b p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{profile.name}</h3><Badge variant="secondary">Saved profile</Badge>{latestJob && <StatusBadge status={latestJob.healthStatus} />}</div>
            <p className="mt-1 truncate text-sm text-muted-foreground" title={sourceTarget(profile)}>{sourceTarget(profile)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Updated {formatDate(profile.updatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onViewJobs(latestJob?.job_id)}>View jobs</Button><Button variant="outline" onClick={onManage}>Reconnect / manage</Button><Button variant="outline" className="text-destructive" onClick={onDelete}><Trash2Icon />Delete</Button></div>
        </div>
      </header>
      <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h4 className="text-sm font-semibold">Imported files</h4><p className="text-xs text-muted-foreground">Choose a linked ingestion job. Existing unlinked jobs remain in Ingestion jobs.</p></div>
        {linkedJobs.length > 0 && <Select value={selectedJobId} onValueChange={(value) => setSelectedJobId(value ?? "")}><SelectTrigger className="w-full sm:w-[280px]" aria-label="Choose source ingestion job"><SelectValue /></SelectTrigger><SelectContent>{linkedJobs.map((job) => <SelectItem key={job.job_id} value={job.job_id}>{formatDate(job.updated_at)} · {job.status}</SelectItem>)}</SelectContent></Select>}
      </div>
      {error && <Alert variant="destructive" className="m-4"><AlertTitle>Unable to load source files</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {!error && <DataTable files={files} loading={loading} emptyTitle={linkedJobs.length ? "No files for this import" : "No linked imports yet"} emptyDescription={linkedJobs.length ? "The selected job has no available objects." : "Reconnect this saved source and start an import to link its files here."} searchLabel={`Search ${profile.name} files`} />}
    </div>
  );
}

export function DataSourcesWorkspace({ files, jobs, profiles, loading, profileError, onCreateIngestion, onDeleteProfile, onViewJobs }: DataSourcesWorkspaceProps) {
  const [selectedId, setSelectedId] = useState("uploaded");
  const [deleteProfile, setDeleteProfile] = useState<SavedDataSourceProfile | null>(null);
  const uploaded = useUploadedDataFiles(files, jobs);
  const selectedProfile = profiles.find((profile) => profile.id === selectedId) ?? null;
  useEffect(() => {
    if (selectedId !== "uploaded" && !selectedProfile) setSelectedId("uploaded");
  }, [selectedId, selectedProfile]);

  return (
    <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-b p-4 xl:border-b-0 xl:border-r" aria-label="Data sources">
        <div className="flex items-center justify-between gap-3 px-1"><div><h3 className="font-semibold">Data sources</h3><p className="mt-1 text-xs text-muted-foreground">{profiles.length + 1} available</p></div><DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" aria-label="Add external source" />}><PlusIcon /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onCreateIngestion({ connector: "s3" })}><CloudIcon />Amazon S3</DropdownMenuItem><DropdownMenuItem onClick={() => onCreateIngestion({ connector: "snowflake" })}><SnowflakeIcon />Snowflake</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
        {profileError && <Alert variant="destructive" className="mt-3"><AlertTitle>Saved sources unavailable</AlertTitle><AlertDescription>{profileError}</AlertDescription></Alert>}
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={() => setSelectedId("uploaded")} aria-pressed={selectedId === "uploaded"} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/25", selectedId === "uploaded" ? "border-primary/35 bg-primary/10" : "hover:bg-muted/50")}><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UploadCloudIcon className="size-4" /></span><span className="min-w-0"><strong className="block text-sm">Uploaded files</strong><span className="block text-xs text-muted-foreground">Built-in source</span></span></button>
          {profiles.map((profile) => <button type="button" key={profile.id} onClick={() => setSelectedId(profile.id)} aria-pressed={selectedId === profile.id} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/25", selectedId === profile.id ? "border-primary/35 bg-primary/10" : "hover:bg-muted/50")}><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">{profile.type === "s3" ? <CloudIcon className="size-4" /> : <SnowflakeIcon className="size-4" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{profile.name}</strong><span className="block truncate text-xs text-muted-foreground">{sourceTarget(profile)}</span></span></button>)}
        </div>
      </aside>
      <section className="min-w-0">
        {selectedProfile ? <ExternalSourceDetail profile={selectedProfile} jobs={jobs} onManage={() => onCreateIngestion({ connector: selectedProfile.type, profileId: selectedProfile.id })} onDelete={() => setDeleteProfile(selectedProfile)} onViewJobs={onViewJobs} /> : <div><header className="flex flex-wrap items-start justify-between gap-3 border-b p-5"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><DatabaseIcon className="size-5" /></span><div><h3 className="text-lg font-semibold">Uploaded files</h3><p className="mt-1 text-sm text-muted-foreground">Files added directly to this organization</p></div></div><Button onClick={() => onCreateIngestion()}><PlusIcon />Upload files</Button></header>{uploaded.warning && <Alert className="m-4"><AlertTitle>Partial file classification</AlertTitle><AlertDescription>{uploaded.warning}</AlertDescription></Alert>}<DataTable files={uploaded.files} loading={loading || uploaded.loading} onCreateIngestion={() => onCreateIngestion()} emptyTitle="No uploaded files" emptyDescription="Upload files directly to create the first built-in source batch." searchLabel="Search uploaded files" /></div>}
      </section>
      <Dialog open={Boolean(deleteProfile)} onOpenChange={(open) => { if (!open) setDeleteProfile(null); }}><DialogContent><DialogHeader><DialogTitle>Delete saved source?</DialogTitle><DialogDescription>This removes {deleteProfile?.name} from this browser only. Files and ingestion history will not be deleted.</DialogDescription></DialogHeader><DialogFooter showCloseButton><Button variant="destructive" onClick={() => { if (deleteProfile) onDeleteProfile(deleteProfile.id); setDeleteProfile(null); }}>Delete profile</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
