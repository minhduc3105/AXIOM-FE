import { useEffect, useState, type FormEvent } from "react";
import { CloudIcon, SaveIcon, SnowflakeIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveDataSourceProfile } from "@/shared/lib/data-source-profile-storage";
import type {
  DataSourceProfileType,
  SavedDataSourceProfile,
  SavedS3Config,
  SavedSnowflakeConfig,
} from "@/shared/types/data-source-profile";

type SnowflakeFormState = Omit<
  SavedSnowflakeConfig,
  "tableLimit" | "stageLimit"
> & {
  tableLimit: string;
  stageLimit: string;
};

const defaultS3Config: SavedS3Config = {
  region: "ap-southeast-1",
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
  tableLimit: "",
  stageLimit: "",
};

function toSnowflakeFormState(config: SavedSnowflakeConfig): SnowflakeFormState {
  return {
    ...config,
    tableLimit: config.tableLimit?.toString() ?? "",
    stageLimit: config.stageLimit?.toString() ?? "",
  };
}

function parseLimit(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive whole number.`);
  }
  return parsed;
}

export function DataSourceConnectionDialog({
  organizationId,
  sourceType,
  profile,
  open,
  onOpenChange,
  onSaved,
}: {
  organizationId: string;
  sourceType: DataSourceProfileType;
  profile: SavedDataSourceProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [s3Config, setS3Config] = useState(defaultS3Config);
  const [snowflakeConfig, setSnowflakeConfig] =
    useState<SnowflakeFormState>(defaultSnowflakeConfig);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setName(
      profile?.name ?? (sourceType === "s3" ? "Amazon S3" : "Snowflake"),
    );
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

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      const saved =
        sourceType === "s3"
          ? saveDataSourceProfile(
              { organizationId, type: "s3", name, config: s3Config },
              profile?.id,
            )
          : saveDataSourceProfile(
              {
                organizationId,
                type: "snowflake",
                name,
                config: {
                  ...snowflakeConfig,
                  tableLimit: parseLimit(
                    snowflakeConfig.tableLimit,
                    "Table limit",
                  ),
                  stageLimit: parseLimit(
                    snowflakeConfig.stageLimit,
                    "Stage limit",
                  ),
                },
              },
              profile?.id,
            );
      toast.success(`${saved.name} connection settings saved.`);
      onSaved();
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save connection settings.",
      );
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
          <DialogDescription>
            Save the connection settings used when this source is imported.
            Credentials are requested at import time and are not retained here.
          </DialogDescription>
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
                    placeholder="ap-southeast-1"
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
                      required
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
                <AlertTitle>Unable to save source</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="submit">
                <SaveIcon data-icon="inline-start" />
                Save source
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
