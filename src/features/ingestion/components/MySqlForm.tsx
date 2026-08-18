import { ChevronDownIcon } from "lucide-react";
import type { AsyncStatus, MySqlConnection } from "../model/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type MySqlFormProps = {
  connection: MySqlConnection;
  status: AsyncStatus | "verified" | "saving" | "saved";
  onChange: (field: keyof MySqlConnection, value: string | boolean) => void;
  onTest: () => void;
  onSave: () => void;
  onBack: () => void;
};

const sslModeOptions = [
  { value: "Require", label: "Require" },
  { value: "Prefer", label: "Prefer" },
  { value: "Disable", label: "Disable" },
] as const;

function DropdownField({
  id,
  label,
  value,
  options,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-between"
            >
              <span className="truncate">{selected?.label}</span>
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Field>
  );
}

export function MySqlForm({
  connection,
  status,
  onChange,
  onTest,
  onSave,
  onBack,
}: MySqlFormProps) {
  const tested =
    status === "verified" || status === "saving" || status === "saved";
  const testing = status === "loading";
  const saving = status === "saving";
  const requiredReady = Boolean(
    connection.host.trim() &&
    connection.port.trim() &&
    connection.database.trim() &&
    connection.username.trim() &&
    connection.password.trim(),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">MySQL connection</h2>
          <Badge variant="secondary">SQL database</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the credentials AXIOM needs to read your source.
        </p>
        <FieldGroup className="mt-6 grid gap-4 md:grid-cols-2">
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="mysql-host">Host</FieldLabel>
            <Input
              id="mysql-host"
              value={connection.host}
              onChange={(event) => onChange("host", event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="mysql-port">Port</FieldLabel>
            <Input
              id="mysql-port"
              value={connection.port}
              onChange={(event) => onChange("port", event.target.value)}
              inputMode="numeric"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="mysql-database">Database</FieldLabel>
            <Input
              id="mysql-database"
              value={connection.database}
              onChange={(event) => onChange("database", event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="mysql-schema">Schema</FieldLabel>
            <Input
              id="mysql-schema"
              value={connection.schema}
              onChange={(event) => onChange("schema", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="mysql-username">Username</FieldLabel>
            <Input
              id="mysql-username"
              value={connection.username}
              onChange={(event) => onChange("username", event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="mysql-password">Password</FieldLabel>
            <Input
              id="mysql-password"
              type="password"
              value={connection.password}
              onChange={(event) => onChange("password", event.target.value)}
              required
            />
          </Field>
          <div className="md:col-span-2">
            <DropdownField
              id="mysql-ssl-mode"
              label="SSL mode"
              value={connection.sslMode}
              options={sslModeOptions}
              onValueChange={(value) => onChange("sslMode", value)}
            />
          </div>
        </FieldGroup>
        <Field
          orientation="horizontal"
          className="mt-5 rounded-lg border bg-muted/50 p-4"
        >
          <Checkbox
            id="mysql-encrypted"
            checked={connection.encrypted}
            onCheckedChange={(checked) =>
              onChange("encrypted", Boolean(checked))
            }
          />
          <FieldLabel htmlFor="mysql-encrypted" className="grid">
            <span>Use encrypted connection</span>
            <small className="font-normal text-muted-foreground">
              Recommended for production sources
            </small>
          </FieldLabel>
        </Field>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onBack} type="button">
            Back
          </Button>
          <Button
            onClick={onTest}
            disabled={testing || saving || !requiredReady}
            type="button"
          >
            {testing ? "Testing…" : tested ? "Test again" : "Test connection"}
          </Button>
        </div>
      </Card>
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Connection preview</h2>
          <Badge variant={tested ? "default" : "outline"}>
            {tested ? "Verified" : "Ready to test"}
          </Badge>
        </div>
        <div className="flex gap-4 rounded-lg border bg-muted/50 p-4">
          <span className="grid size-12 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            MY
          </span>
          <div>
            <h3 className="text-xl font-semibold">MySQL</h3>
            <p className="text-sm text-muted-foreground">
              Relational database · live connection
            </p>
            <small className="text-muted-foreground">
              {tested
                ? "Connection verified"
                : "Selected from connector catalog"}
            </small>
          </div>
        </div>
        <h3 className="mt-6 text-lg font-semibold">What we need</h3>
        <ul className="mt-3 grid gap-2">
          {[
            "Host and port",
            "Database and schema",
            "Read-only credentials",
            "Encrypted connection",
          ].map((item) => (
            <li
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
              key={item}
            >
              <i
                className={
                  tested
                    ? "size-2 rounded-full bg-success"
                    : "size-2 rounded-full bg-muted-foreground/30"
                }
              />
              {item}
            </li>
          ))}
        </ul>
        <div className="my-5 rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          Fields adapt to each connector; MySQL uses host, port, database,
          schema, username, password and SSL mode.
        </div>
        <Button
          className="h-12 w-full"
          onClick={onSave}
          disabled={status !== "verified"}
          type="button"
        >
          {saving
            ? "Saving…"
            : status === "saved"
              ? "Saved"
              : "Save connection and continue to pipeline"}
        </Button>
      </Card>
    </div>
  );
}
