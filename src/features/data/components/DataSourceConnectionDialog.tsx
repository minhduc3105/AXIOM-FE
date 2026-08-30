import { useEffect, useState, type FormEvent } from "react";
import {
  CloudIcon,
  PlugZapIcon,
  RefreshCwIcon,
  SaveIcon,
  SnowflakeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createDatasourceProfile,
  testDatasourceConnection,
  updateDatasourceProfile,
} from "@/features/ingestion/api/datasourceProfileApi";
import type {
  DataSourceProfileType,
  SavedDataSourceProfile,
  SavedS3Config,
  SavedSnowflakeConfig,
} from "@/shared/types/data-source-profile";

type SnowflakeFormState = SavedSnowflakeConfig;

const defaultS3Config: SavedS3Config = {
  region: "us-east-1",
  bucketName: "",
};

const defaultSnowflakeConfig: SnowflakeFormState = {
  account: "",
  user: "",
  warehouse: "",
  database: "",
  schema: "",
  role: "",
  discoverTables: true,
  discoverStages: true,
  stagePattern: "",
  tableLimit: null,
  stageLimit: null,
};

function toSnowflakeFormState(
  config: SavedSnowflakeConfig,
): SnowflakeFormState {
  return { ...config };
}

export function DataSourceConnectionDialog({
  organizationId,
  sourceType,
  profile,
  open,
  workspaceId,
  onOpenChange,
  onSaved,
}: {
  organizationId: string;
  workspaceId: string;
  sourceType: DataSourceProfileType;
  profile: SavedDataSourceProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [s3Config, setS3Config] = useState(defaultS3Config);
  const [snowflakeConfig, setSnowflakeConfig] = useState<SnowflakeFormState>(
    defaultSnowflakeConfig,
  );
  const [s3AccessKeyId, setS3AccessKeyId] = useState("");
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState("");
  const [snowflakePrivateKey, setSnowflakePrivateKey] = useState("");
  const [snowflakePrivateKeyPassphrase, setSnowflakePrivateKeyPassphrase] =
    useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const busy = saving || testing;

  useEffect(() => {
    if (!open) return;

    setError(null);
    setSaving(false);
    setTesting(false);
    setS3AccessKeyId("");
    setS3SecretAccessKey("");
    setSnowflakePrivateKey("");
    setSnowflakePrivateKeyPassphrase("");
    setName(profile?.name ?? (sourceType === "s3" ? "Amazon S3" : "Snowflake"));
    setS3Config(
      profile?.type === "s3"
        ? (profile.config as SavedS3Config)
        : defaultS3Config,
    );
    setSnowflakeConfig(
      profile?.type === "snowflake"
        ? toSnowflakeFormState(profile.config as SavedSnowflakeConfig)
        : defaultSnowflakeConfig,
    );
  }, [open, profile, sourceType]);

  const testConnection = async () => {
    setError(null);
    setTesting(true);

    try {
      if (sourceType !== "s3") return;
      if (!workspaceId.trim()) throw new Error("Choose a workspace first.");
      if (!s3AccessKeyId.trim() || !s3SecretAccessKey.trim()) {
        throw new Error(
          "AWS access key ID and secret access key are required.",
        );
      }
      await testDatasourceConnection({
        workspaceId,
        datasourceType: "s3",
        connectorConfig: {
          region: s3Config.region.trim(),
          bucket_name: s3Config.bucketName.trim(),
        },
        credentials: {
          aws_access_key_id: s3AccessKeyId.trim(),
          aws_secret_access_key: s3SecretAccessKey,
        },
      });
      toast.success("Amazon S3 connection test succeeded.");
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "Unable to test the datasource connection.",
      );
    } finally {
      setTesting(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (!workspaceId.trim()) throw new Error("Choose a workspace first.");
      if (sourceType === "s3") {
        if (!s3AccessKeyId.trim() || !s3SecretAccessKey.trim()) {
          throw new Error(
            "AWS access key ID and secret access key are required.",
          );
        }
        const input = {
          name,
          connectorConfig: {
            region: s3Config.region.trim(),
            bucket_name: s3Config.bucketName.trim(),
          },
          credentials: {
            aws_access_key_id: s3AccessKeyId.trim(),
            aws_secret_access_key: s3SecretAccessKey,
          },
        } as const;
        if (profile?.backendDatasourceId) {
          await updateDatasourceProfile({
            datasourceId: profile.backendDatasourceId,
            ...input,
          });
        } else {
          await createDatasourceProfile({
            workspaceId,
            datasourceType: "s3",
            ...input,
          });
        }
      } else {
        if (!snowflakePrivateKey.trim()) {
          throw new Error("Snowflake private key is required.");
        }
        const input = {
          name,
          connectorConfig: {
            account: snowflakeConfig.account.trim(),
            user: snowflakeConfig.user.trim(),
            warehouse: snowflakeConfig.warehouse.trim() || null,
            database: snowflakeConfig.database.trim() || null,
            schema: snowflakeConfig.schema.trim() || null,
            role: snowflakeConfig.role.trim() || null,
          },
          credentials: {
            private_key: snowflakePrivateKey,
            private_key_passphrase:
              snowflakePrivateKeyPassphrase.trim() || null,
          },
        } as const;
        if (profile?.backendDatasourceId) {
          await updateDatasourceProfile({
            datasourceId: profile.backendDatasourceId,
            ...input,
          });
        } else {
          await createDatasourceProfile({
            workspaceId,
            datasourceType: "snowflake",
            ...input,
          });
        }
      }
      toast.success(`${name.trim()} connection saved securely.`);
      onSaved();
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save connection settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const isS3 = sourceType === "s3";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isS3 ? <CloudIcon /> : <SnowflakeIcon />}
            {isS3 ? "Connect Amazon S3" : "Connect Snowflake"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={save}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="data-source-name">Source name</FieldLabel>
              <Input
                id="data-source-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>

            {isS3 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="s3-access-key-id">
                    AWS access key ID
                  </FieldLabel>
                  <Input
                    id="s3-access-key-id"
                    value={s3AccessKeyId}
                    onChange={(event) => setS3AccessKeyId(event.target.value)}
                    autoComplete="off"
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
                    type="password"
                    value={s3SecretAccessKey}
                    onChange={(event) =>
                      setS3SecretAccessKey(event.target.value)
                    }
                    autoComplete="new-password"
                    disabled={busy}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="s3-region">AWS region</FieldLabel>
                  <Input
                    id="s3-region"
                    value={s3Config.region}
                    onChange={(event) =>
                      setS3Config((current) => ({
                        ...current,
                        region: event.target.value,
                      }))
                    }
                    placeholder="us-east-1"
                    disabled={busy}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="s3-bucket">Bucket name</FieldLabel>
                  <Input
                    id="s3-bucket"
                    value={s3Config.bucketName}
                    onChange={(event) =>
                      setS3Config((current) => ({
                        ...current,
                        bucketName: event.target.value,
                      }))
                    }
                    placeholder="company-evidence"
                    disabled={busy}
                    required
                  />
                </Field>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="snowflake-account">Account</FieldLabel>
                    <Input
                      id="snowflake-account"
                      value={snowflakeConfig.account}
                      onChange={(event) =>
                        setSnowflakeConfig((current) => ({
                          ...current,
                          account: event.target.value,
                        }))
                      }
                      disabled={busy}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="snowflake-user">User</FieldLabel>
                    <Input
                      id="snowflake-user"
                      value={snowflakeConfig.user}
                      onChange={(event) =>
                        setSnowflakeConfig((current) => ({
                          ...current,
                          user: event.target.value,
                        }))
                      }
                      disabled={busy}
                      required
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="snowflake-private-key">
                      Private key
                    </FieldLabel>
                    <Textarea
                      id="snowflake-private-key"
                      className="min-h-32 font-mono"
                      value={snowflakePrivateKey}
                      onChange={(event) =>
                        setSnowflakePrivateKey(event.target.value)
                      }
                      placeholder="-----BEGIN PRIVATE KEY-----"
                      autoComplete="off"
                      disabled={busy}
                      required
                    />
                  </Field>
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="snowflake-private-key-passphrase">
                      Private key passphrase
                    </FieldLabel>
                    <Input
                      id="snowflake-private-key-passphrase"
                      type="password"
                      value={snowflakePrivateKeyPassphrase}
                      onChange={(event) =>
                        setSnowflakePrivateKeyPassphrase(event.target.value)
                      }
                      autoComplete="new-password"
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="snowflake-warehouse">
                      Warehouse
                    </FieldLabel>
                    <Input
                      id="snowflake-warehouse"
                      value={snowflakeConfig.warehouse}
                      onChange={(event) =>
                        setSnowflakeConfig((current) => ({
                          ...current,
                          warehouse: event.target.value,
                        }))
                      }
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="snowflake-database">
                      Database
                    </FieldLabel>
                    <Input
                      id="snowflake-database"
                      value={snowflakeConfig.database}
                      onChange={(event) =>
                        setSnowflakeConfig((current) => ({
                          ...current,
                          database: event.target.value,
                        }))
                      }
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="snowflake-schema">Schema</FieldLabel>
                    <Input
                      id="snowflake-schema"
                      value={snowflakeConfig.schema}
                      onChange={(event) =>
                        setSnowflakeConfig((current) => ({
                          ...current,
                          schema: event.target.value,
                        }))
                      }
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="snowflake-role">Role</FieldLabel>
                    <Input
                      id="snowflake-role"
                      value={snowflakeConfig.role}
                      onChange={(event) =>
                        setSnowflakeConfig((current) => ({
                          ...current,
                          role: event.target.value,
                        }))
                      }
                      disabled={busy}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    orientation="horizontal"
                    className="rounded-lg border p-3"
                  >
                    <Checkbox
                      id="snowflake-discover-tables"
                      checked={snowflakeConfig.discoverTables}
                      onCheckedChange={(checked) =>
                        setSnowflakeConfig((current) => ({
                          ...current,
                          discoverTables: Boolean(checked),
                        }))
                      }
                      disabled={busy}
                    />
                    <FieldLabel htmlFor="snowflake-discover-tables">
                      Discover tables
                    </FieldLabel>
                  </Field>
                  <Field
                    orientation="horizontal"
                    className="rounded-lg border p-3"
                  >
                    <Checkbox
                      id="snowflake-discover-stages"
                      checked={snowflakeConfig.discoverStages}
                      onCheckedChange={(checked) =>
                        setSnowflakeConfig((current) => ({
                          ...current,
                          discoverStages: Boolean(checked),
                        }))
                      }
                      disabled={busy}
                    />
                    <FieldLabel htmlFor="snowflake-discover-stages">
                      Discover stages
                    </FieldLabel>
                  </Field>
                </div>
              </>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>
                  {isS3 ? "Unable to connect source" : "Unable to save source"}
                </AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="outline" type="button" disabled={busy} />
                }
              >
                Cancel
              </DialogClose>
              {isS3 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={busy}
                >
                  <RefreshCwIcon
                    data-icon="inline-start"
                    className={testing ? "animate-spin" : undefined}
                  />
                  {testing ? "Testing…" : "Test connection"}
                </Button>
              )}
              <Button type="submit" disabled={busy}>
                {isS3 ? (
                  <PlugZapIcon data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                {saving
                  ? "Connecting securely…"
                  : isS3
                    ? "Connect"
                    : "Save source"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
