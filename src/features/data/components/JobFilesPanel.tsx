import { AlertCircleIcon, FilesIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { IngestionJob } from "../model/types";
import { useJobDataFiles } from "../model/useJobDataFiles";
import { DataTable } from "./DataTable";

type JobFilesPanelProps = {
  job: IngestionJob | null;
};

export function JobFilesPanel({ job }: JobFilesPanelProps) {
  const { files, loading, error } = useJobDataFiles(job?.job_id ?? null);
  if (!job) return null;
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border" aria-label="Ingestion job files">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><FilesIcon className="size-4" /></span>
          <div><h3 className="font-semibold">Files from selected job</h3><p className="mt-1 max-w-xl truncate font-mono text-xs text-muted-foreground" title={job.job_id}>{job.job_id}</p></div>
        </div>
        <Badge variant="outline">{job.objects_written} objects written</Badge>
      </header>
      {error && <Alert variant="destructive" className="m-4"><AlertCircleIcon /><AlertTitle>Unable to load job files</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {!error && <DataTable files={files} loading={loading} emptyTitle="No files for this job" emptyDescription="This job did not persist any objects that are currently available." searchLabel="Search job files" />}
    </section>
  );
}
