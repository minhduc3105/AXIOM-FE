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
  const requiredReady = Boolean(
    connection.accessKeyId.trim() &&
      connection.secretAccessKey.trim() &&
      connection.region.trim() &&
      connection.bucketName.trim(),
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requiredReady && !busy) onBrowse();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="rounded-3xl bg-card/90 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Amazon S3 connection</h2>
          <Badge variant="secondary" className="rounded-full">
            Live API
          </Badge>
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

      <Card className="rounded-3xl bg-card/90 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold">Selection gate</h2>
          <Badge variant="outline">S3</Badge>
        </div>
        <div className="mt-5 grid gap-3">
          {[
            "Credentials are used only for this browser session",
            "Bucket contents are listed before any import starts",
            "Only explicitly selected object keys are copied",
          ].map((note, index) => (
            <div
              className="flex gap-3 rounded-2xl bg-muted/60 p-4 text-sm"
              key={note}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <span>{note}</span>
            </div>
          ))}
        </div>
        {busy && (
          <div
            className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm text-primary"
            role="status"
          >
            <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            Listing objects from {connection.bucketName.trim() || "the bucket"}.
          </div>
        )}
      </Card>
    </div>
  );
}
