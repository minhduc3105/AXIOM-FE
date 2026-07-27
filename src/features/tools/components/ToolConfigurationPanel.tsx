import { useEffect, useMemo, useState } from "react";
import { KeyRoundIcon, SaveIcon, ServerIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ToolDetail, ToolParameter } from "../model/types";
import { formatToolName } from "../model/toolPresentation";

function serializeDefault(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function ToolParameterField({
  parameter,
  value,
  onChange,
}: {
  parameter: ToolParameter;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `tool-param-${parameter.name}`;
  const enumValues = parameter.json_schema.enum;

  return (
    <div className="grid gap-1.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <Label htmlFor={id} className="min-w-0 font-medium">
          <span className="truncate">{parameter.name}</span>
          {parameter.required && <span className="text-rose-600">*</span>}
        </Label>
        <span className="shrink-0 text-[10px] font-medium uppercase text-[#8a8377] dark:text-[#918a7f]">
          {parameter.type}
        </span>
      </div>

      {enumValues && enumValues.length > 0 ? (
        <Select
          value={value}
          onValueChange={(nextValue) => onChange(String(nextValue))}
        >
          <SelectTrigger
            id={id}
            className="h-9 w-full bg-white dark:bg-[#20201c]"
          >
            <SelectValue placeholder="Select a value" />
          </SelectTrigger>
          <SelectContent>
            {enumValues.map((option) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : parameter.type === "bool" ? (
        <Select
          value={value || "false"}
          onValueChange={(nextValue) => onChange(String(nextValue))}
        >
          <SelectTrigger
            id={id}
            className="h-9 w-full bg-white dark:bg-[#20201c]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      ) : parameter.type === "list" || parameter.type === "dict" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={parameter.type === "list" ? "[]" : "{}"}
          className="min-h-20 resize-y bg-white font-mono text-xs dark:bg-[#20201c]"
        />
      ) : (
        <Input
          id={id}
          type={
            parameter.type === "int" || parameter.type === "float"
              ? "number"
              : "text"
          }
          value={value}
          onChange={(event) => onChange(event.target.value)}
          min={parameter.json_schema.minimum}
          max={parameter.json_schema.maximum}
          placeholder={parameter.required ? "Required" : "Optional"}
          className="h-9 bg-white dark:bg-[#20201c]"
        />
      )}

      {parameter.description && (
        <p className="text-[11px] leading-4 text-[#777064] dark:text-[#aaa397]">
          {parameter.description}
        </p>
      )}
    </div>
  );
}

export function ToolConfigurationPanel({ tool }: { tool: ToolDetail }) {
  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        tool.params.map((parameter) => [
          parameter.name,
          serializeDefault(parameter.default),
        ]),
      ),
    [tool],
  );
  const [environment, setEnvironment] = useState("production");
  const [apiKey, setApiKey] = useState("");
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  useEffect(() => setValues(initialValues), [initialValues]);

  const saveConfiguration = () => {
    toast.success("Configuration saved locally", {
      description: `${formatToolName(tool.name)} is ready for ${environment}.`,
    });
  };

  return (
    <aside className="overflow-hidden rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/90 shadow-[0_18px_52px_rgba(24,24,18,0.08)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/90 lg:sticky lg:top-6">
      <div className="border-b border-[#d8d0c2]/80 bg-[#fffdf8]/54 px-5 py-4 dark:border-[#38372f]/80 dark:bg-white/4">
        <div className="flex items-center gap-2">
          <ServerIcon className="size-4 text-[#2456e8] dark:text-[#9aafff]" />
          <h2 className="text-sm font-semibold">Configuration</h2>
          <Badge
            variant="outline"
            className="ml-auto h-5 rounded-full border-[#d8d0c2]/80 bg-[#f4efe5]/72 text-[9px] uppercase text-[#6d685e] dark:border-[#49483f] dark:bg-white/5 dark:text-[#aaa397]"
          >
            Local mock
          </Badge>
        </div>
      </div>

      <form
        className="grid max-h-[calc(100vh-150px)] gap-5 overflow-y-auto p-5"
        onSubmit={(event) => {
          event.preventDefault();
          saveConfiguration();
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="tool-environment">Environment</Label>
          <Select
            value={environment}
            onValueChange={(value) => setEnvironment(String(value))}
          >
            <SelectTrigger
              id="tool-environment"
              className="h-9 w-full bg-white dark:bg-[#20201c]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="tool-api-key">
            <KeyRoundIcon className="size-3.5 text-[#777064]" />
            API key
          </Label>
          <Input
            id="tool-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Optional secret"
            autoComplete="off"
            className="h-9 bg-white dark:bg-[#20201c]"
          />
        </div>

        {tool.params.length > 0 && (
          <div className="grid gap-4 border-t border-[#e1dacc] pt-4 dark:border-[#38372f]">
            <div>
              <h3 className="text-xs font-semibold">Default parameters</h3>
              <p className="mt-1 text-[11px] text-[#777064] dark:text-[#aaa397]">
                Values are generated from the tool input schema.
              </p>
            </div>
            {tool.params.map((parameter) => (
              <ToolParameterField
                key={parameter.name}
                parameter={parameter}
                value={values[parameter.name] ?? ""}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    [parameter.name]: value,
                  }))
                }
              />
            ))}
          </div>
        )}

        <Button
          type="submit"
          className="h-10 rounded-full bg-[#2456e8] text-white shadow-[0_14px_30px_rgba(36,86,232,0.18)] hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]"
        >
          <SaveIcon />
          Save configuration
        </Button>
      </form>
    </aside>
  );
}
