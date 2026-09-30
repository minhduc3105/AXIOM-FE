import type { FormEvent } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { S3BrowserStatus, S3Connection } from "../model/types";
import { SavedProfileControls } from "./SavedProfileControls";

type S3FormProps = {
  connection: S3Connection;
  browserStatus: S3BrowserStatus;
  error: string | null;
  onChange: (field: keyof S3Connection, value: string) => void;
  onBrowse: () => void;
  onBack: () => void;
  profileName: string;
  profileSaved: boolean;
  profileDirty: boolean;
  profileError: string | null;
  onProfileNameChange: (name: string) => void;
  onSaveProfile: () => void;
};

export function S3Form({
  connection,
  browserStatus,
  error,
  onChange,
  onBrowse,
  onBack,
  profileName,
  profileSaved,
  profileDirty,
  profileError,
  onProfileNameChange,
  onSaveProfile,
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
      <Card>
        <CardHeader>
          <CardTitle>Amazon S3 connection</CardTitle>
          <CardDescription>
            Verify bucket access, then review the exact objects AXIOM should
            import.
          </CardDescription>
        </CardHeader>

        <form onSubmit={submit}>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="s3-access-key-id">
                  AWS access key ID
                </FieldLabel>
                <Input
                  id="s3-access-key-id"
                  autoComplete="off"
                  value={connection.accessKeyId}
                  onChange={(event) =>
                    onChange("accessKeyId", event.target.value)
                  }
                  disabled={busy}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="s3-secret-access-key">
                  AWS secret access key
                </FieldLabel>
                <Input
                  id="s3-secret-access-key"
                  autoComplete="new-password"
                  type="password"
                  value={connection.secretAccessKey}
                  onChange={(event) =>
                    onChange("secretAccessKey", event.target.value)
                  }
                  disabled={busy}
                  required
                />
              </Field>
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="s3-region">AWS region</FieldLabel>
                  <Input
                    id="s3-region"
                    placeholder="us-east-1"
                    value={connection.region}
                    onChange={(event) => onChange("region", event.target.value)}
                    disabled={busy}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="s3-bucket">Source bucket</FieldLabel>
                  <Input
                    id="s3-bucket"
                    placeholder="company-documents"
                    value={connection.bucketName}
                    onChange={(event) =>
                      onChange("bucketName", event.target.value)
                    }
                    disabled={busy}
                    required
                  />
                </Field>
              </FieldGroup>

              <SavedProfileControls
                name={profileName}
                saved={profileSaved}
                dirty={profileDirty}
                error={profileError}
                disabled={busy}
                onNameChange={onProfileNameChange}
                onSave={onSaveProfile}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Unable to browse this bucket</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={busy}
              type="button"
            >
              Back
            </Button>
            <Button disabled={!requiredReady || busy} type="submit">
              {busy && (
                <LoaderCircleIcon
                  className="animate-spin motion-reduce:animate-none"
                  data-icon="inline-start"
                />
              )}
              {busy ? "Loading bucket files..." : "Browse bucket files"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="self-start">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle>Connection overview</CardTitle>
          <Badge variant="outline">S3</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            className="flex items-center justify-between gap-3 rounded-lg border bg-muted/35 p-4"
            role="status"
            aria-live="polite"
          >
            <span className="text-sm font-medium">Connection status</span>
            <Badge variant={overviewStatus.variant}>
              {busy && (
                <LoaderCircleIcon
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {overviewStatus.label}
            </Badge>
          </div>

          <dl className="grid gap-1 rounded-lg border p-2">
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

          <CardDescription className="rounded-lg bg-muted/55 p-4 leading-relaxed">
            Browsing lists bucket objects without starting an import.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
