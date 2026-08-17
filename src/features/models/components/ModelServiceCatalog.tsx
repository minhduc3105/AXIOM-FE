import { CheckCircle2Icon, MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon, ServerIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/shared/lib/utils";
import { getModelReadiness } from "../model/readiness";
import type { ModelCapability, ResourceStatus } from "../model/registryTypes";
import type { ModelOption } from "./modelServiceTypes";
import { capabilityLabel, modelCapabilities, modelServiceInput, modelServiceMutedText, modelServiceSection, readinessBadgeClass, readinessLabel } from "./modelServiceUi";

function ReadinessBadge({ option }: { option: ModelOption }) {
  const readiness = getModelReadiness(option.provider, option.model);
  return <Badge variant="outline" className={cn("text-xs uppercase tracking-wide", readinessBadgeClass(readiness.level))}>{readiness.label ?? readinessLabel(readiness.level)}</Badge>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{detail}</p></div>;
}

export function ModelServiceCatalog({
  options, loading, busy, canManage, onReviewSwitch, onEditModel, onTestModel, onToggleModel, onDeleteModel, onAddModel,
}: {
  options: ModelOption[];
  loading: boolean;
  busy: boolean;
  canManage: boolean;
  onReviewSwitch: (option: ModelOption) => void;
  onEditModel: (option: ModelOption) => void;
  onTestModel: (option: ModelOption) => void;
  onToggleModel: (option: ModelOption) => void;
  onDeleteModel: (option: ModelOption) => void;
  onAddModel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [capability, setCapability] = useState<ModelCapability | "all">("all");
  const [status, setStatus] = useState<ResourceStatus | "all">("all");
  const filtered = options.filter((option) => {
    const text = `${option.model.name} ${option.model.model_id} ${option.provider.display_name}`.toLowerCase();
    return (!query.trim() || text.includes(query.trim().toLowerCase()))
      && (capability === "all" || option.model.capability === capability)
      && (status === "all" || option.model.status === status);
  });
  const defaults = options.filter((option) => option.model.is_default);
  const readyDefaults = defaults.filter((option) => getModelReadiness(option.provider, option.model).level === "ready");

  return <div>
    <div className="grid border-b sm:grid-cols-3"><Metric label="Registered models" value={String(options.length)} detail="Across configured connections" /><Metric label="Defaults" value={String(defaults.length)} detail="Scoped by connection + capability" /><Metric label="Ready defaults" value={String(readyDefaults.length)} detail="Active and validated" /></div>
    <div className={cn(modelServiceSection, "flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between")}>
      <div><h2 className="text-base font-semibold">Model catalog</h2><p className={cn("mt-1 text-xs", modelServiceMutedText)}>{canManage ? "A default applies to its connection and workload. Runtime usage is not inferred here." : "Only active, validated models available to your organization are shown."}</p></div>
      {canManage && <Button size="sm" variant="outline" onClick={onAddModel}><PlusIcon /> Add model</Button>}
    </div>
    <div className={cn("grid gap-2 border-b p-4", canManage ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      <label className="relative"><span className="sr-only">Search models</span><SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search model, ID or connection" className={cn(modelServiceInput, "pl-9")} /></label>
      <label><span className="sr-only">Filter by capability</span><select value={capability} onChange={(event) => setCapability(event.target.value as ModelCapability | "all")} className={cn("h-9 w-full rounded-md border px-3 text-sm", modelServiceInput)}><option value="all">All capabilities</option>{modelCapabilities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      {canManage && <label><span className="sr-only">Filter by model status</span><select value={status} onChange={(event) => setStatus(event.target.value as ResourceStatus | "all")} className={cn("h-9 w-full rounded-md border px-3 text-sm", modelServiceInput)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
    </div>
    {loading && !options.length ? <div className="grid gap-2 p-4">{[1, 2, 3].map((key) => <div key={key} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div> : filtered.length ? <div className="max-w-full" aria-label="Model catalog table"><Table className="min-w-[880px]"><TableHeader><TableRow><TableHead>Connection / model</TableHead><TableHead>Capability</TableHead><TableHead>Readiness</TableHead><TableHead>Limits</TableHead><TableHead className="text-right">Default & actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((option) => <CatalogRow key={option.model.resource_id} option={option} busy={busy} canManage={canManage} onReviewSwitch={onReviewSwitch} onEditModel={onEditModel} onTestModel={onTestModel} onToggleModel={onToggleModel} onDeleteModel={onDeleteModel} />)}</TableBody></Table></div> : <div className="grid min-h-48 place-items-center p-6 text-center"><div><p className="text-sm font-medium">{options.length ? "No models match these filters" : canManage ? "No models registered" : "No models available"}</p><p className={cn("mt-1 max-w-sm text-xs leading-5", modelServiceMutedText)}>{options.length ? "Change the search or filters to see more models." : canManage ? "Add the first model and its connection configuration." : "No active, validated model is currently available to your organization."}</p></div></div>}
  </div>;
}

function CatalogRow({ option, busy, canManage, onReviewSwitch, onEditModel, onTestModel, onToggleModel, onDeleteModel }: { option: ModelOption; busy: boolean; canManage: boolean; onReviewSwitch: (option: ModelOption) => void; onEditModel: (option: ModelOption) => void; onTestModel: (option: ModelOption) => void; onToggleModel: (option: ModelOption) => void; onDeleteModel: (option: ModelOption) => void }) {
  const editable = canManage && option.provider.scope === "organization";
  return <TableRow><TableCell className="min-w-56"><span className={cn("flex items-center gap-2 text-xs", modelServiceMutedText)}><ServerIcon className="size-3.5" />{option.provider.display_name}</span><strong className="mt-1 block text-sm">{option.model.name}</strong><code className="mt-0.5 block text-xs text-muted-foreground">{option.model.model_id}</code></TableCell><TableCell><div className="flex flex-wrap gap-1"><Badge variant="outline">{capabilityLabel(option.model.capability)}</Badge><Badge variant="outline">{option.provider.scope === "system" ? "Platform managed" : "Organization"}</Badge></div></TableCell><TableCell><ReadinessBadge option={option} /><p className="mt-1 text-xs text-muted-foreground">{option.model.status} · {option.model.connection_status}</p></TableCell><TableCell className={cn("text-xs", modelServiceMutedText)}>{option.model.max_context_length ? `${option.model.max_context_length.toLocaleString()} context` : "Context not set"}<br />{option.model.max_tokens ? `${option.model.max_tokens.toLocaleString()} output` : "Output not set"}</TableCell><TableCell><div className="flex justify-end gap-2">{option.model.is_default ? <Badge variant="secondary">Default · {option.provider.display_name}</Badge> : editable ? <Button size="sm" variant="outline" disabled={busy} onClick={() => onReviewSwitch(option)}>Set default</Button> : <span className="text-xs text-muted-foreground">Read-only</span>}{editable && <DropdownMenu><DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Manage ${option.model.name}`} disabled={busy}><MoreHorizontalIcon /></Button>} /><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEditModel(option)}><PencilIcon /> Edit model</DropdownMenuItem><DropdownMenuItem onClick={() => onTestModel(option)}><CheckCircle2Icon /> Test model</DropdownMenuItem><DropdownMenuItem onClick={() => onToggleModel(option)}>{option.model.status === "active" ? "Deactivate model" : "Activate model"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => onDeleteModel(option)}><Trash2Icon /> Delete model</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></TableCell></TableRow>;
}
