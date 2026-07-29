import type { FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { S3BrowserStatus, S3Connection } from "../model/types";

type S3FormProps = {
  connection: S3Connection;
  browserStatus: S3BrowserStatus;
  error: string | null;
  onChange: (field: keyof S3Connection, value: string) => void;
  onBrowse: () => void;
  onBack: () => void;
};

export function S3Form({
  connection,
  browserStatus,
  error,
  onChange,
  onBrowse,
  onBack,
}: S3FormProps) {
  const busy = browserStatus === "loading";
  const credentialsReady = Boolean(
    connection.accessKeyId.trim() && connection.secretAccessKey.trim(),
  );
  const requiredReady = Boolean(
    credentialsReady &&
      connection.region.trim() &&
      connection.bucketName.trim(),
  );
  const overviewStatus = error
    ? { label: "Access failed", variant: "destructive" as const }
    : busy
      ? { label: "Listing objects", variant: "default" as const }
      : requiredReady
        ? { label: "Ready to browse", variant: "default" as const }
        : { label: "Details required", variant: "secondary" as const };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requiredReady && !busy) onBrowse();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="rounded-3xl bg-card/90 p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Amazon S3 connection</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Verify bucket access, then review the exact objects AXIOM should
          import.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <label className="grid gap-2">
            AWS access key ID
            <Input
              autoComplete="off"
              value={connection.accessKeyId}
              onChange={(event) =>
                onChange("accessKeyId", event.target.value)
              }
              disabled={busy}
              required
            />
          </label>
          <label className="grid gap-2">
            AWS secret access key
            <Input
              autoComplete="new-password"
              type="password"
              value={connection.secretAccessKey}
              onChange={(event) =>
                onChange("secretAccessKey", event.target.value)
              }
              disabled={busy}
              required
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              AWS region
              <Input
                placeholder="ap-southeast-1"
                value={connection.region}
                onChange={(event) => onChange("region", event.target.value)}
                disabled={busy}
                required
              />
            </label>
            <label className="grid gap-2">
              Source bucket
              <Input
                placeholder="company-documents"
                value={connection.bucketName}
                onChange={(event) =>
                  onChange("bucketName", event.target.value)
                }
                disabled={busy}
                required
              />
            </label>
          </div>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Unable to browse this bucket</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={busy}
              type="button"
            >
              Back
            </Button>
            <Button disabled={!requiredReady || busy} type="submit">
              {busy ? "Loading bucket files..." : "Browse bucket files"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="self-start rounded-3xl bg-card/90 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold">Connection overview</h2>
          <Badge variant="outline">S3</Badge>
        </div>

        <div
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl border bg-muted/35 p-4"
          role="status"
          aria-live="polite"
        >
          <span className="text-sm font-medium">Connection status</span>
          <Badge variant={overviewStatus.variant}>
            {busy && (
              <span
                className="size-3 animate-spin rounded-full border-2 border-current/25 border-t-current"
                aria-hidden="true"
              />
            )}
            {overviewStatus.label}
          </Badge>
        </div>

        <dl className="mt-4 grid gap-1 rounded-2xl border p-2">
          <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5">
            <dt className="text-sm text-muted-foreground">Source bucket</dt>
            <dd
              className="max-w-48 truncate text-right text-sm font-medium"
              title={connection.bucketName.trim() || "Not provided"}
            >
              {connection.bucketName.trim() || "Not provided"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/45 px-3 py-2.5">
            <dt className="text-sm text-muted-foreground">AWS region</dt>
            <dd
              className="max-w-48 truncate text-right text-sm font-medium"
              title={connection.region.trim() || "Not provided"}
            >
              {connection.region.trim() || "Not provided"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5">
            <dt className="text-sm text-muted-foreground">Credentials</dt>
            <dd className="text-right text-sm font-medium">
              {credentialsReady ? "Added" : "Incomplete"}
            </dd>
          </div>
        </dl>

        <p className="mt-4 rounded-2xl bg-muted/55 p-4 text-sm leading-relaxed text-muted-foreground">
          Browsing lists bucket objects without starting an import.
        </p>
      </Card>
    </div>
  );
}
