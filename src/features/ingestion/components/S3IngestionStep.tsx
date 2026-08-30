import { useMemo, useState } from "react";
import { CloudIcon, FileIcon, SearchIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listS3Files, type S3File } from "../api/ingestionApi";
import { useGlobalIngestion } from "../model/GlobalIngestionProvider";
import type { S3Connection } from "../model/types";

type S3IngestionStepProps = {
  onBack: () => void;
};

const initialConnection: S3Connection = {
  accessKeyId: "",
  secretAccessKey: "",
  region: "us-east-1",
  bucketName: "",
};

function credentialsReady(connection: S3Connection) {
  return Boolean(
    connection.accessKeyId.trim() &&
    connection.secretAccessKey.trim() &&
    connection.region.trim() &&
    connection.bucketName.trim(),
  );
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function S3IngestionStep({ onBack }: S3IngestionStepProps) {
  const { startS3Import, workspaceId } = useGlobalIngestion();
  const [connection, setConnection] = useState(initialConnection);
  const [files, setFiles] = useState<S3File[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const connectionReady = credentialsReady(connection);
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const updateConnection = (field: keyof S3Connection, value: string) => {
    setConnection((current) => ({ ...current, [field]: value }));
  };

  const browseObjects = async () => {
    if (!connectionReady || browsing) return;
    setBrowsing(true);
    setBrowseError(null);
    try {
      const result = await listS3Files(workspaceId, {
        aws_access_key_id: connection.accessKeyId.trim(),
        aws_secret_access_key: connection.secretAccessKey,
        aws_region: connection.region.trim(),
        aws_bucket_name: connection.bucketName.trim(),
      });
      setFiles(result.files);
      setSelectedKeys([]);
    } catch (error) {
      setBrowseError(
        error instanceof Error
          ? error.message
          : "Unable to browse objects in this S3 bucket.",
      );
    } finally {
      setBrowsing(false);
    }
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((currentKey) => currentKey !== key)
        : [...current, key],
    );
  };

  const startImport = async () => {
    if (!selectedKeys.length || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      await startS3Import({ connection, files, selectedKeys });
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "Unable to start the S3 import.",
      );
      setStarting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-5">
      <section className="border-b pb-5">
        <div className="mb-4 flex items-center gap-2">
          <CloudIcon aria-hidden="true" />
          <p className="font-medium">S3 connection</p>
        </div>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="s3-access-key">AWS access key ID</FieldLabel>
            <Input
              id="s3-access-key"
              autoComplete="off"
              value={connection.accessKeyId}
              onChange={(event) =>
                updateConnection("accessKeyId", event.target.value)
              }
            />
            <FieldDescription>
              Used only to list and copy this selection.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="s3-secret-key">
              AWS secret access key
            </FieldLabel>
            <Input
              id="s3-secret-key"
              autoComplete="off"
              type="password"
              value={connection.secretAccessKey}
              onChange={(event) =>
                updateConnection("secretAccessKey", event.target.value)
              }
            />
            <FieldDescription>
              This value is not stored in AXIOM.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="s3-region">AWS region</FieldLabel>
            <Input
              id="s3-region"
              autoComplete="off"
              value={connection.region}
              onChange={(event) =>
                updateConnection("region", event.target.value)
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="s3-bucket">Source bucket</FieldLabel>
            <Input
              id="s3-bucket"
              autoComplete="off"
              value={connection.bucketName}
              onChange={(event) =>
                updateConnection("bucketName", event.target.value)
              }
            />
          </Field>
        </FieldGroup>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={!connectionReady || browsing}
            onClick={() => void browseObjects()}
          >
            <SearchIcon data-icon="inline-start" />
            {browsing ? "Browsing objects..." : "Browse S3 objects"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Credentials remain in this dialog and are cleared once the job
            starts.
          </p>
        </div>
      </section>

      {browseError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to list S3 objects</AlertTitle>
          <AlertDescription>{browseError}</AlertDescription>
        </Alert>
      ) : null}
      {startError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to start the S3 import</AlertTitle>
          <AlertDescription>{startError}</AlertDescription>
        </Alert>
      ) : null}

      {files.length ? (
        <section className="flex min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Choose objects to ingest</p>
              <p className="text-sm text-muted-foreground">
                {connection.bucketName} · {connection.region}
              </p>
            </div>
            <Badge variant={selectedKeys.length ? "default" : "secondary"}>
              {selectedKeys.length} selected
            </Badge>
          </div>
          <ScrollArea className="max-h-72 rounded-lg border">
            <div className="flex flex-col divide-y">
              {files.map((file) => {
                const selected = selectedSet.has(file.key);
                return (
                  <div
                    className="flex items-center gap-3 p-3 hover:bg-muted/50"
                    key={file.key}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleKey(file.key)}
                      aria-label={`Select ${file.key}`}
                    />
                    <FileIcon aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {file.name}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {file.key}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </section>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" type="button" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          disabled={!selectedKeys.length || starting}
          onClick={() => void startImport()}
        >
          {starting ? "Starting ingestion..." : "Start ingestion"}
        </Button>
      </div>
    </div>
  );
}
