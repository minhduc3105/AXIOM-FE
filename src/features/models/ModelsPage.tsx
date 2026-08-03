import { useMemo, useState } from "react";
import {
  BotIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  CloudIcon,
  DatabaseZapIcon,
  EllipsisIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerCogIcon,
  SparklesIcon,
  Trash2Icon,
  WifiIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/shared/lib/utils";
import {
  availableProviders,
  initialModels,
  initialProviders,
  type ManagedModel,
  type ModelProvider,
  type ProviderSource,
} from "./model/types";

type DialogMode = "provider" | "model" | "settings" | "delete" | null;

const panelClass =
  "rounded-[22px] border border-[#d8d0c2]/80 bg-[#fffdf8]/88 shadow-[0_16px_46px_rgba(24,24,18,0.055)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/88";
const quietInputClass =
  "h-9 border-[#d8d0c2]/80 bg-[#f7f3eb] text-[#25241f] shadow-none dark:border-[#49483f] dark:bg-[#20201c] dark:text-[#eee8dc]";

function ProviderMark({ name }: { name: string }) {
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#d8d0c2] bg-[#f4efe5] text-[#2456e8] dark:border-[#49483f] dark:bg-white/5 dark:text-[#9aafff]">
      <BotIcon className="size-5" aria-hidden="true" />
      <span className="sr-only">{name}</span>
    </div>
  );
}

function FormField({
  id,
  label,
  defaultValue,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-[#625d53] dark:text-[#c5bcaf]">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={quietInputClass}
      />
    </div>
  );
}

export function ModelsPage() {
  const [providers, setProviders] = useState(initialProviders);
  const [models, setModels] = useState(initialModels);
  const [source, setSource] = useState<ProviderSource>("cloud");
  const [query, setQuery] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("openai");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingModel, setEditingModel] = useState<ManagedModel | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const filteredProviders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return providers.filter(
      (provider) =>
        provider.source === source &&
        (!search ||
          `${provider.name} ${provider.description}`.toLowerCase().includes(search)),
    );
  }, [providers, query, source]);

  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ?? providers[0];
  const selectedModels = models.filter(
    (model) => model.providerId === selectedProvider?.id);
  const primaryModel = models.find((model) => model.primary);

  const closeDialog = () => {
    setDialogMode(null);
    setEditingModel(null);
  };

  const testModel = (model: ManagedModel) => {
    setTesting(model.id);
    toast.loading(`Testing ${model.label}…`, { id: `test-${model.id}` });
    window.setTimeout(() => {
      setTesting(null);
      toast.success(`${model.label} responded successfully in 842 ms.`, {
        id: `test-${model.id}`,
      });
    }, 950);
  };

  const addProvider = () => {
    const provider: ModelProvider = {
      id: `provider-${Date.now()}`,
      name: "Custom provider",
      description: "Custom OpenAI-compatible model provider.",
      endpoint: "https://api.example.com/v1",
      apiKeyHint: "Credential required",
      source,
      status: "offline",
      updatedAt: "Added just now",
    };
    setProviders((items) => [...items, provider]);
    setSelectedProviderId(provider.id);
    setDialogMode(null);
    toast.success("Provider added. Complete its connection settings to use it.");
  };

  const saveModel = () => {
    if (!selectedProvider) return;
    if (editingModel) {
      setModels((items) =>
        items.map((item) =>
          item.id === editingModel.id ? { ...item, label: `${item.label} · updated` } : item,
        ),
      );
      toast.success("Model configuration updated.");
    } else {
      const model: ManagedModel = {
        id: `model-${Date.now()}`,
        providerId: selectedProvider.id,
        name: "new-model",
        label: "New model",
        contextWindow: "Not verified",
        primary: false,
        enabled: true,
      };
      setModels((items) => [...items, model]);
      toast.success("Model added to provider.");
    }
    closeDialog();
  };

  const deleteModel = () => {
    if (!editingModel) return;
    setModels((items) => items.filter((item) => item.id !== editingModel.id));
    toast.success(`${editingModel.label} removed.`);
    closeDialog();
  };

  return (
    <section className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10" aria-label="Model management">
      <div className="mx-auto grid w-full max-w-[1440px] gap-6">
        <header className={cn(panelClass, "flex flex-col gap-5 p-5 sm:p-6")}> 
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#777064] dark:text-[#aaa397]">
                <span>Settings</span>
                <ChevronRightIcon className="size-3.5" />
                <span className="text-[#2456e8] dark:text-[#9aafff]">Models</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#191915] dark:text-[#f4efe5] sm:text-3xl">
                Model control
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#625d53] dark:text-[#c5bcaf]">
                Configure providers and verify the models AXIOM may use for investigation workflows.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Default model: <strong>{primaryModel?.label ?? "Not set"}</strong>
              </div>
              <Button className="h-9 rounded-full bg-[#2456e8] px-4 text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]" onClick={() => setDialogMode("provider")}>
                <PlusIcon /> Add provider
              </Button>
            </div>
          </div>
          <div className="grid gap-3 border-t border-[#e1dacc] pt-4 dark:border-[#38372f] lg:grid-cols-[auto_minmax(210px,1fr)_auto] lg:items-center">
            <div className="flex w-fit rounded-full border border-[#d8d0c2] bg-[#f4efe5]/75 p-1 dark:border-[#49483f] dark:bg-white/5" role="tablist" aria-label="Provider source">
              {(["cloud", "local"] as ProviderSource[]).map((item) => (
                <Button key={item} type="button" variant="ghost" size="sm" role="tab" aria-selected={source === item} onClick={() => setSource(item)} className={cn("h-8 rounded-full px-3 text-xs capitalize", source === item ? "bg-white text-[#191915] shadow-sm dark:bg-[#292923] dark:text-[#f4efe5]" : "text-[#6d685e] dark:text-[#aaa397]")}>
                  {item === "cloud" ? <CloudIcon /> : <ServerCogIcon />}
                  {item} providers
                </Button>
              ))}
            </div>
            <div className="relative min-w-0">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8377]" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className={cn(quietInputClass, "w-full rounded-full pl-9")} placeholder="Search configured providers" aria-label="Search configured providers" />
            </div>
            <Button variant="outline" size="sm" className="h-9 rounded-full border-[#d8d0c2] bg-[#fffdf8] dark:border-[#49483f] dark:bg-[#20201c]" onClick={() => toast.success("Provider status refreshed.")}>
              <RefreshCwIcon /> Refresh status
            </Button>
          </div>
        </header>

        <section className={cn(panelClass, "p-4 sm:p-5")} aria-labelledby="configured-providers-title">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <h2 id="configured-providers-title" className="text-sm font-semibold">Configured providers</h2>
                <Badge variant="outline" className="h-5 rounded-full border-[#d8d0c2] px-2 text-[10px] tabular-nums text-[#625d53] dark:border-[#49483f] dark:text-[#c5bcaf]">{filteredProviders.length}</Badge>
              </div>
              <p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">Connection status and available models at a glance.</p>
            </div>
            <span className="text-xs text-emerald-700 dark:text-emerald-300">{providers.filter((item) => item.status === "online").length} providers online</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredProviders.map((provider) => {
              const providerModels = models.filter((model) => model.providerId === provider.id);
              const selected = selectedProvider?.id === provider.id;
              return (
                <article key={provider.id} className={cn("rounded-[18px] border bg-[#fffdf8] p-4 transition-colors dark:bg-[#20201c]", selected ? "border-[#2456e8]/40 ring-2 ring-[#2456e8]/8 dark:border-[#7895ff]/45" : "border-[#e1dacc] dark:border-[#38372f]")}>
                  <div className="flex gap-3">
                    <ProviderMark name={provider.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{provider.name}</h3>
                        <Badge className="h-5 border-0 bg-[#e8f7ef] px-1.5 text-[9px] font-semibold text-emerald-700 shadow-none dark:bg-emerald-400/10 dark:text-emerald-300">ACTIVE</Badge>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300"><WifiIcon className="size-3" /> Online</span>
                      </div>
                      <p className="mt-1 text-xs text-[#6d685e] dark:text-[#aaa397]">{provider.description}</p>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                    <div><dt className="uppercase tracking-wide text-[10px] text-[#8a8377]">Endpoint</dt><dd className="mt-1 truncate rounded-md bg-[#f4efe5] px-2 py-1.5 font-mono text-[11px] text-[#625d53] dark:bg-white/5 dark:text-[#c5bcaf]">{provider.endpoint}</dd></div>
                    <div><dt className="uppercase tracking-wide text-[10px] text-[#8a8377]">API key</dt><dd className="mt-1 flex items-center gap-1.5 rounded-md bg-[#f4efe5] px-2 py-1.5 font-mono text-[11px] text-[#625d53] dark:bg-white/5 dark:text-[#c5bcaf]"><KeyRoundIcon className="size-3" />{provider.apiKeyHint}</dd></div>
                  </dl>
                  <div className="mt-4 flex items-center justify-between border-t border-[#e9e2d6] pt-3 dark:border-[#38372f]"><span className="text-xs text-[#625d53] dark:text-[#c5bcaf]"><strong>{providerModels.length}</strong> configured models</span><div className="flex gap-2"><Button size="sm" variant="outline" className="h-8 rounded-lg border-[#d8d0c2] text-xs dark:border-[#49483f]" onClick={() => setSelectedProviderId(provider.id)}>Models</Button><Button size="sm" variant="ghost" className="h-8 rounded-lg px-2 text-xs" onClick={() => { setSelectedProviderId(provider.id); setDialogMode("settings"); }} aria-label={`Edit ${provider.name} settings`}><PencilIcon /></Button></div></div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={cn(panelClass, "overflow-hidden")} aria-labelledby="provider-models-title">
          <div className="flex flex-col gap-3 border-b border-[#e1dacc] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-[#38372f]">
            <div className="flex min-w-0 items-center gap-3"><ProviderMark name={selectedProvider?.name ?? "Provider"} /><div className="min-w-0"><div className="flex items-center gap-2"><h2 id="provider-models-title" className="truncate text-base font-semibold">{selectedProvider?.name ?? "Select a provider"} models</h2><span className="text-xs text-[#777064] dark:text-[#aaa397]">{selectedProvider?.updatedAt}</span></div><p className="mt-0.5 text-xs text-[#6d685e] dark:text-[#aaa397]">Test a model before enabling it for AXIOM workflows.</p></div></div>
            <Button size="sm" className="h-9 rounded-full bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]" onClick={() => setDialogMode("model")} disabled={!selectedProvider}><PlusIcon /> Add model</Button>
          </div>
          {selectedModels.length ? <div className="divide-y divide-[#e9e2d6] dark:divide-[#38372f]">{selectedModels.map((model) => <div key={model.id} className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div className="flex min-w-0 items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf2ff] text-[#2456e8] dark:bg-[#7895ff]/12 dark:text-[#9aafff]"><SparklesIcon className="size-4" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm">{model.label}</strong>{model.primary && <Badge className="h-5 border-0 bg-[#eef3ff] px-1.5 text-[9px] text-[#1237b4] shadow-none dark:bg-[#7895ff]/15 dark:text-[#bcc9ff]">DEFAULT</Badge>}{!model.enabled && <Badge variant="outline" className="h-5 px-1.5 text-[9px]">DISABLED</Badge>}</div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6d685e] dark:text-[#aaa397]"><code>{model.name}</code><span>{model.contextWindow}</span></div></div></div><div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" className="h-8 rounded-lg border-[#d8d0c2] text-xs dark:border-[#49483f]" onClick={() => testModel(model)} disabled={testing === model.id}>{testing === model.id ? <LoaderCircleIcon className="animate-spin" /> : <DatabaseZapIcon />} {testing === model.id ? "Testing" : "Test"}</Button><Button size="icon-sm" variant="ghost" className="rounded-lg" onClick={() => { setEditingModel(model); setDialogMode("model"); }} aria-label={`Edit ${model.label}`}><PencilIcon /></Button><Button size="icon-sm" variant="ghost" className="rounded-lg text-[#a53838] hover:bg-rose-50 hover:text-[#8b2424] dark:text-rose-300 dark:hover:bg-rose-400/10" onClick={() => { setEditingModel(model); setDialogMode("delete"); }} aria-label={`Delete ${model.label}`}><Trash2Icon /></Button></div></div>)}</div> : <div className="grid min-h-44 place-items-center px-5 text-center"><div><CircleAlertIcon className="mx-auto size-5 text-[#8a8377]" /><p className="mt-2 text-sm font-medium">No models configured</p><p className="mt-1 text-xs text-[#777064] dark:text-[#aaa397]">Add a model after the provider connection is ready.</p></div></div>}
        </section>

        <section className={cn(panelClass, "p-4 sm:p-5")} aria-labelledby="available-providers-title">
          <div className="mb-3 flex items-center gap-2"><EllipsisIcon className="size-4 text-[#777064]" /><h2 id="available-providers-title" className="text-sm font-semibold">Available providers</h2><span className="text-xs text-[#777064] dark:text-[#aaa397]">Connect a supported provider when needed.</span></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{availableProviders.map((name) => <button key={name} type="button" className="flex min-h-12 items-center gap-2 rounded-xl border border-[#e7dfd2] bg-[#fffdfa] px-3 text-left text-xs font-medium transition-colors hover:border-[#2456e8]/35 hover:bg-[#edf2ff]/45 dark:border-[#38372f] dark:bg-[#20201c] dark:hover:border-[#7895ff]/35 dark:hover:bg-[#7895ff]/8" onClick={() => { setDialogMode("provider"); toast.info(`Configure ${name} to add it.`); }}><div className="grid size-6 place-items-center rounded-md bg-[#f4efe5] text-[#2456e8] dark:bg-white/5 dark:text-[#9aafff]"><BotIcon className="size-3.5" /></div><span className="min-w-0 flex-1 truncate">{name}</span><ChevronRightIcon className="size-3.5 text-[#8a8377]" /></button>)}</div>
        </section>
      </div>

      <Dialog open={dialogMode === "provider"} onOpenChange={(open) => !open && closeDialog()}><DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]"><DialogHeader><DialogTitle>Add provider</DialogTitle><DialogDescription>Add a connection first; model credentials remain masked after saving.</DialogDescription></DialogHeader><div className="grid gap-4"><FormField id="provider-name" label="Provider name" placeholder="e.g. Azure OpenAI" /><FormField id="provider-endpoint" label="Base endpoint" placeholder="https://api.example.com/v1" /><FormField id="provider-key" label="API key" type="password" placeholder="Paste a credential" /></div><DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button className="bg-[#2456e8] text-white hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c]" onClick={addProvider}>Add provider</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={dialogMode === "settings"} onOpenChange={(open) => !open && closeDialog()}><DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]"><DialogHeader><DialogTitle>{selectedProvider?.name} settings</DialogTitle><DialogDescription>Update the endpoint or replace its stored credential.</DialogDescription></DialogHeader><div className="grid gap-4"><FormField id="settings-endpoint" label="Base endpoint" defaultValue={selectedProvider?.endpoint} /><FormField id="settings-key" label="API key" defaultValue={selectedProvider?.apiKeyHint} type="password" /></div><DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button onClick={() => { closeDialog(); toast.success("Provider settings saved."); }}>Save changes</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={dialogMode === "model"} onOpenChange={(open) => !open && closeDialog()}><DialogContent className="max-w-lg border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]"><DialogHeader><DialogTitle>{editingModel ? "Edit model" : "Add model"}</DialogTitle><DialogDescription>{selectedProvider?.name} · configure a model available to the current workspace.</DialogDescription></DialogHeader><div className="grid gap-4"><FormField id="model-label" label="Display name" defaultValue={editingModel?.label} placeholder="e.g. GPT-5" /><FormField id="model-id" label="Model ID" defaultValue={editingModel?.name} placeholder="e.g. gpt-5" /><FormField id="model-context" label="Context window" defaultValue={editingModel?.contextWindow} placeholder="e.g. 128K context" /></div><DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button onClick={saveModel}>{editingModel ? "Save changes" : "Add model"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={dialogMode === "delete"} onOpenChange={(open) => !open && closeDialog()}><DialogContent className="max-w-md border-[#d8d0c2] bg-[#fffdf8] p-5 dark:border-[#38372f] dark:bg-[#1a1a17]"><DialogHeader><DialogTitle>Remove {editingModel?.label}?</DialogTitle><DialogDescription>This removes the model from AXIOM. Existing conversations are not changed.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={closeDialog}>Cancel</Button><Button variant="destructive" onClick={deleteModel}>Remove model</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}
