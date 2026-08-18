import type { FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { IngestionJobResponse } from "../api/ingestionApi";
import type { ConnectorJobUiStatus, SnowflakeConnection } from "../model/types";
import { IngestionJobStatus } from "./IngestionJobStatus";
import { SavedProfileControls } from "./SavedProfileControls";

type SnowflakeFormProps = {
  connection: SnowflakeConnection;
  status: ConnectorJobUiStatus;
  job: IngestionJobResponse | null;
  error: string | null;
  onChange: (field: keyof SnowflakeConnection, value: string | boolean) => void;
  onSubmit: () => void;
  onRetryStatus: () => void;
  onRetryFiles: () => void;
  onNewImport: () => void;
  onBack: () => void;
  profileName: string;
  profileSaved: boolean;
  profileDirty: boolean;
  profileError: string | null;
  onProfileNameChange: (name: string) => void;
  onSaveProfile: () => void;
};

function isValidLimit(value: string) {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1;
}

export function SnowflakeForm({
  connection,
  status,
  job,
  error,
  onChange,
  onSubmit,
  onRetryStatus,
  onRetryFiles,
  onNewImport,
  onBack,
  profileName,
  profileSaved,
  profileDirty,
  profileError,
  onProfileNameChange,
  onSaveProfile,
}: SnowflakeFormProps) {
  const busy =
    status === "submitting" ||
    status === "polling" ||
    status === "discovering_files";
  const locked = Boolean(job) || busy;
  const discoveryReady = connection.discoverTables || connection.discoverStages;
  const limitsReady =
    isValidLimit(connection.tableLimit) && isValidLimit(connection.stageLimit);
  const requiredReady = Boolean(
    connection.account.trim() &&
    connection.user.trim() &&
    connection.privateKey.trim() &&
    discoveryReady &&
    limitsReady,
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requiredReady && !locked) onSubmit();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Snowflake import</h2>
          <Badge variant="secondary">Live API</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Discover tables or stages and copy their data into AXIOM storage.
        </p>
        <form className="mt-6" onSubmit={submit}>
          <FieldGroup className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="snowflake-account">Account</FieldLabel>
                <Input
                  id="snowflake-account"
                  autoComplete="off"
                  value={connection.account}
                  onChange={(event) => onChange("account", event.target.value)}
                  disabled={locked}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="snowflake-user">User</FieldLabel>
                <Input
                  id="snowflake-user"
                  autoComplete="off"
                  value={connection.user}
                  onChange={(event) => onChange("user", event.target.value)}
                  disabled={locked}
                  required
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="snowflake-private-key">
                Private key
              </FieldLabel>
              <Textarea
                id="snowflake-private-key"
                className="min-h-40 resize-y font-mono"
                autoComplete="off"
                placeholder="-----BEGIN PRIVATE KEY-----"
                value={connection.privateKey}
                onChange={(event) => onChange("privateKey", event.target.value)}
                disabled={locked}
                required
              />
            </Field>

            <details className="rounded-2xl border bg-muted/50 p-4">
              <summary className="cursor-pointer font-semibold">
                Advanced connection and discovery
              </summary>
              <FieldGroup className="mt-4 grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="snowflake-passphrase">
                    Private key passphrase
                  </FieldLabel>
                  <Input
                    id="snowflake-passphrase"
                    autoComplete="new-password"
                    type="password"
                    value={connection.privateKeyPassphrase}
                    onChange={(event) =>
                      onChange("privateKeyPassphrase", event.target.value)
                    }
                    disabled={locked}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="snowflake-warehouse">
                    Warehouse
                  </FieldLabel>
                  <Input
                    id="snowflake-warehouse"
                    value={connection.warehouse}
                    onChange={(event) =>
                      onChange("warehouse", event.target.value)
                    }
                    disabled={locked}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="snowflake-database">Database</FieldLabel>
                  <Input
                    id="snowflake-database"
                    value={connection.database}
                    onChange={(event) =>
                      onChange("database", event.target.value)
                    }
                    disabled={locked}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="snowflake-schema">Schema</FieldLabel>
                  <Input
                    id="snowflake-schema"
                    value={connection.schema}
                    onChange={(event) => onChange("schema", event.target.value)}
                    disabled={locked}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="snowflake-role">Role</FieldLabel>
                  <Input
                    id="snowflake-role"
                    value={connection.role}
                    onChange={(event) => onChange("role", event.target.value)}
                    disabled={locked}
                  />
                </Field>
                <Field
                  orientation="horizontal"
                  className="rounded-lg border bg-card p-3"
                >
                  <Checkbox
                    id="snowflake-discover-tables"
                    checked={connection.discoverTables}
                    onCheckedChange={(checked) =>
                      onChange("discoverTables", Boolean(checked))
                    }
                    disabled={locked}
                  />
                  <FieldLabel htmlFor="snowflake-discover-tables">
                    Discover tables
                  </FieldLabel>
                </Field>
                <Field
                  orientation="horizontal"
                  className="rounded-lg border bg-card p-3"
                >
                  <Checkbox
                    id="snowflake-discover-stages"
                    checked={connection.discoverStages}
                    onCheckedChange={(checked) =>
                      onChange("discoverStages", Boolean(checked))
                    }
                    disabled={locked}
                  />
                  <FieldLabel htmlFor="snowflake-discover-stages">
                    Discover stages
                  </FieldLabel>
                </Field>
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="snowflake-stage-pattern">
                    Stage pattern
                  </FieldLabel>
                  <Input
                    id="snowflake-stage-pattern"
                    value={connection.stagePattern}
                    onChange={(event) =>
                      onChange("stagePattern", event.target.value)
                    }
                    disabled={locked || !connection.discoverStages}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="snowflake-table-limit">
                    Table limit
                  </FieldLabel>
                  <Input
                    id="snowflake-table-limit"
                    inputMode="numeric"
                    min={1}
                    type="number"
                    value={connection.tableLimit}
                    onChange={(event) =>
                      onChange("tableLimit", event.target.value)
                    }
                    disabled={locked || !connection.discoverTables}
                    aria-invalid={!isValidLimit(connection.tableLimit)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="snowflake-stage-limit">
                    Stage limit
                  </FieldLabel>
                  <Input
                    id="snowflake-stage-limit"
                    inputMode="numeric"
                    min={1}
                    type="number"
                    value={connection.stageLimit}
                    onChange={(event) =>
                      onChange("stageLimit", event.target.value)
                    }
                    disabled={locked || !connection.discoverStages}
                    aria-invalid={!isValidLimit(connection.stageLimit)}
                  />
                </Field>
              </FieldGroup>
              {!discoveryReady && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  Enable table or stage discovery.
                </p>
              )}
              {!limitsReady && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  Discovery limits must be whole numbers greater than zero.
                </p>
              )}
            </details>

            <SavedProfileControls
              name={profileName}
              saved={profileSaved}
              dirty={profileDirty}
              error={profileError}
              disabled={locked}
              onNameChange={onProfileNameChange}
              onSave={onSaveProfile}
            />

            <div className="mt-2 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={busy}
                type="button"
              >
                Back
              </Button>
              <Button disabled={!requiredReady || locked} type="submit">
                {status === "submitting"
                  ? "Creating job…"
                  : status === "failed" && !job
                    ? "Retry import"
                    : "Start Snowflake import"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </Card>
      <IngestionJobStatus
        connectorName="Snowflake"
        mark="SF"
        description="Warehouse connector · table and stage discovery"
        status={status}
        job={job}
        error={error}
        idleNotes={[
          "Key-pair authentication is required",
          "Tables and stages are copied into AXIOM storage",
          "Private key material is cleared after job creation",
        ]}
        onRetryStatus={onRetryStatus}
        onRetryFiles={onRetryFiles}
        onNewImport={onNewImport}
      />
    </div>
  );
}
