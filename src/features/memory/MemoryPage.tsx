import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuitIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  DatabaseIcon,
  FileJsonIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  SparklesIcon,
  Trash2Icon,
  WorkflowIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/shared/lib/utils";
import * as api from "./api/memoryApi";
import type {
  ExperienceRecord,
  ExtractionJob,
  FeedbackResult,
  MemoryRecord,
  ProcedureRecord,
  ServiceStatus,
} from "./model/types";

type View = "inventory" | "recall" | "experiences" | "procedures" | "reme";
type Inspector =
  | { kind: "memory"; data: MemoryRecord }
  | { kind: "experience"; data: ExperienceRecord }
  | { kind: "procedure"; data: ProcedureRecord }
  | { kind: "job"; data: ExtractionJob }
  | null;
type CreateMode = "experience" | "procedure" | null;

const panel = "border bg-card text-card-foreground";
const input = "h-9 border-border bg-background shadow-none";
const statusStyle: Record<ServiceStatus, string> = {
  online: "border-success/30 bg-success/10 text-success",
  offline: "border-destructive/30 bg-destructive/10 text-destructive",
  checking: "border-warning/30 bg-warning/10 text-warning",
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
function RecordSources({ sources }: { sources: { source_id: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.length ? (
        sources.map((source) => (
          <code
            className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            key={source.source_id}
          >
            {source.source_id}
          </code>
        ))
      ) : (
        <span className="text-xs text-muted-foreground">
          No source references
        </span>
      )}
    </div>
  );
}

function MemoryTypeDropdown({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const options = [
    { value: "all", label: "All types" },
    { value: "preference", label: "Preference" },
    { value: "constraint", label: "Constraint" },
    { value: "semantic", label: "Semantic" },
  ];
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label="Memory type"
            className="w-full justify-between rounded-full"
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
  );
}

export function MemoryPage() {
  const [view, setView] = useState<View>("inventory");
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [experiences, setExperiences] = useState<ExperienceRecord[]>([]);
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([]);
  const [inspector, setInspector] = useState<Inspector>(null);
  const [query, setQuery] = useState("");
  const [memoryType, setMemoryType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    intent: ServiceStatus;
    reme: ServiceStatus;
  }>({ intent: "checking", reme: "checking" });
  const [recallQuery, setRecallQuery] = useState("");
  const [boundedContext, setBoundedContext] = useState("");
  const [storedIntentId, setStoredIntentId] = useState("");
  const [jobId, setJobId] = useState("");
  const [remeInput, setRemeInput] = useState("");
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const [memoryResult, experienceResult, procedureResult, serviceResult] =
      await Promise.allSettled([
        api.listMemories(),
        api.listExperiences(),
        api.listProcedures(),
        api.getServiceStatus(),
      ]);
    if (memoryResult.status === "fulfilled") setMemories(memoryResult.value);
    else
      setError(
        memoryResult.reason instanceof Error
          ? memoryResult.reason.message
          : "Memory service is unavailable.",
      );
    if (experienceResult.status === "fulfilled")
      setExperiences(experienceResult.value);
    if (procedureResult.status === "fulfilled")
      setProcedures(procedureResult.value);
    if (serviceResult.status === "fulfilled") setStatus(serviceResult.value);
    setLoading(false);
  };
  useEffect(() => {
    void refresh();
  }, []);

  const visibleMemories = useMemo(
    () =>
      memories.filter(
        (memory) =>
          (memoryType === "all" || memory.memory_type === memoryType) &&
          (!query.trim() ||
            `${memory.content} ${memory.memory_type} ${memory.source_refs.map((source) => source.source_id).join(" ")}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      ),
    [memories, memoryType, query],
  );
  const remeBacked = memories.filter(
    (memory) => memory.backend === "reme",
  ).length;

  const selectMemory = async (memory: MemoryRecord) => {
    setInspector({ kind: "memory", data: memory });
    try {
      setInspector({
        kind: "memory",
        data: await api.getMemory(memory.memory_id),
      });
    } catch {
      /* List payload remains usable when detail is unavailable. */
    }
  };
  const selectExperience = async (experience: ExperienceRecord) => {
    setInspector({ kind: "experience", data: experience });
    try {
      setInspector({
        kind: "experience",
        data: await api.getExperience(experience.id),
      });
    } catch {
      /* List payload remains usable when detail is unavailable. */
    }
  };
  const selectProcedure = async (procedure: ProcedureRecord) => {
    setInspector({ kind: "procedure", data: procedure });
    try {
      setInspector({
        kind: "procedure",
        data: await api.getProcedure(procedure.id),
      });
    } catch {
      /* List payload remains usable when detail is unavailable. */
    }
  };
  const searchInventory = async () => {
    if (!query.trim()) return refresh();
    setBusy("search");
    try {
      const results = await api.searchMemories(query, {
        type: memoryType === "all" ? undefined : memoryType,
      });
      setMemories(results);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setBusy(null);
    }
  };
  const removeMemory = async (memory: MemoryRecord) => {
    if (!window.confirm(`Soft-delete this ${memory.memory_type} memory?`))
      return;
    setBusy("delete");
    try {
      await api.deleteMemory(memory.memory_id);
      setInspector(null);
      await refresh();
      toast.success("Memory deleted.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  };
  const forgetMemory = async (memory: MemoryRecord) => {
    if (
      !window.confirm(
        "Forget this ReMe memory? This permanently removes the source artifact and rebuilds its index.",
      )
    )
      return;
    setBusy("forget");
    try {
      await api.forgetReme(memory);
      setInspector(null);
      await refresh();
      toast.success("ReMe memory forgotten.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Forget failed.");
    } finally {
      setBusy(null);
    }
  };
  const feedback = async (result: FeedbackResult) => {
    if (!inspector) return;
    setBusy("feedback");
    try {
      if (inspector.kind === "memory")
        await api.feedbackMemory(inspector.data.memory_id, result);
      if (inspector.kind === "procedure" && result !== "irrelevant")
        await api.feedbackProcedure(inspector.data.id, result);
      toast.success("Feedback recorded.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Feedback failed.");
    } finally {
      setBusy(null);
    }
  };
  const runRecall = async () => {
    if (!recallQuery.trim()) return;
    setBusy("recall");
    try {
      const result = await api.recallMemory(recallQuery, "data_query", 600);
      setBoundedContext(result.bounded_context);
      setMemories((current) => (current.length ? current : result.memories));
      toast.success(`${result.memories.length} memories recalled.`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Recall failed.");
    } finally {
      setBusy(null);
    }
  };
  const capture = async (mode: "capture" | "queue" | "job") => {
    if (mode !== "job" && !storedIntentId.trim()) {
      toast.error("Enter a stored agent intent ID.");
      return;
    }
    if (mode === "job" && !jobId.trim()) {
      toast.error("Enter an extraction job ID.");
      return;
    }
    setBusy(mode);
    try {
      if (mode === "capture") {
        await api.captureFromIntent(storedIntentId);
        toast.success("Capture requested.");
      } else if (mode === "queue") {
        const next = await api.queueExtraction(storedIntentId);
        setJobId(next);
        toast.success("Extraction queued.");
      } else {
        setInspector({ kind: "job", data: await api.getExtractionJob(jobId) });
      }
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Capture action failed.",
      );
    } finally {
      setBusy(null);
    }
  };
  const invokeReme = async (
    operation: "capture" | "search" | "dream" | "reindex",
  ) => {
    setBusy(`reme-${operation}`);
    try {
      const result = await api.remeOperation(
        operation,
        remeInput || "Review recent user preferences",
      );
      setInspector({
        kind: "job",
        data: {
          id: `reme-${operation}`,
          status: "captured",
          message: "ReMe operation completed",
          raw: result as Record<string, unknown>,
        },
      });
      toast.success("ReMe operation completed.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "ReMe operation failed.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      className="min-h-screen px-5 pb-12 pt-20 sm:px-8 md:pt-10"
      aria-label="Memory management"
    >
      <div className="mx-auto grid w-full max-w-[1440px] gap-6">
        <header className="border-b pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Memory management
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review, retrieve and govern durable context for the signed-in
                workspace.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ServiceBadge label="Intent API" status={status.intent} />
              <ServiceBadge label="ReMe" status={status.reme} />
              <Button
                variant="outline"
                className="h-9 rounded-full"
                onClick={() => void refresh()}
                disabled={loading}
              >
                <RefreshCwIcon className={cn(loading && "animate-spin")} />{" "}
                Refresh
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Canonical memories"
              value={memories.length}
              icon={<DatabaseIcon />}
            />
            <Metric
              label="ReMe-backed"
              value={remeBacked}
              icon={<BrainCircuitIcon />}
            />
            <Metric
              label="Experiences"
              value={experiences.length}
              icon={<SparklesIcon />}
            />
            <Metric
              label="Jobs pending"
              value={
                inspector?.kind === "job" && inspector.data.status === "queued"
                  ? 1
                  : 0
              }
              icon={<WorkflowIcon />}
            />
          </div>
        </header>
        {error && (
          <Alert variant="destructive" className="rounded-[18px]">
            <CircleAlertIcon />
            <AlertTitle>Memory inventory is unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Tabs
          value={view}
          onValueChange={(value) => setView(value as View)}
          className="gap-0"
        >
          <section className={cn(panel, "overflow-hidden rounded-lg")}>
            <div className="border-b bg-muted/30 px-4 py-3">
              <TabsList className="h-auto max-w-full overflow-x-auto rounded-md border bg-background p-1">
                <TabsTrigger
                  value="inventory"
                  className="rounded-sm px-3 text-xs"
                >
                  Inventory
                </TabsTrigger>
                <TabsTrigger value="recall" className="rounded-sm px-3 text-xs">
                  Recall & capture
                </TabsTrigger>
                <TabsTrigger
                  value="experiences"
                  className="rounded-sm px-3 text-xs"
                >
                  Experiences
                </TabsTrigger>
                <TabsTrigger
                  value="procedures"
                  className="rounded-sm px-3 text-xs"
                >
                  Procedures
                </TabsTrigger>
                <TabsTrigger value="reme" className="rounded-sm px-3 text-xs">
                  ReMe operations
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="inventory">
              <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
                <section
                  className="min-w-0 border-b lg:border-b-0 lg:border-r"
                  aria-labelledby="memory-inventory-heading"
                >
                  <div className="border-b p-4 sm:p-5">
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <div>
                        <h2
                          id="memory-inventory-heading"
                          className="text-sm font-semibold"
                        >
                          Memory inventory
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {visibleMemories.length}{" "}
                          {visibleMemories.length === 1 ? "record" : "records"}{" "}
                          in this view
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Field className="min-w-0 flex-1">
                        <FieldLabel htmlFor="memory-search" className="sr-only">
                          Search memories
                        </FieldLabel>
                      </Field>
                      <MemoryTypeDropdown
                        value={memoryType}
                        onValueChange={setMemoryType}
                      />
                      <Button
                        size="sm"
                        className="h-9 rounded-full"
                        onClick={() => void searchInventory()}
                        disabled={busy === "search"}
                      >
                        {busy === "search" ? (
                          <LoaderCircleIcon className="animate-spin" />
                        ) : (
                          <SearchIcon />
                        )}{" "}
                        Search
                      </Button>
                    </div>
                    <InventoryList
                      memories={visibleMemories}
                      loading={loading}
                      selectedId={
                        inspector?.kind === "memory" ? inspector.data.id : null
                      }
                      onSelect={selectMemory}
                    />
                  </div>
                </section>
                <Inspector
                  inspector={inspector}
                  busy={busy}
                  onEdit={() => setEditOpen(true)}
                  onDelete={removeMemory}
                  onForget={forgetMemory}
                  onFeedback={feedback}
                />
              </div>
            </TabsContent>
            <TabsContent value="recall">
              <RecallPanel
                recallQuery={recallQuery}
                setRecallQuery={setRecallQuery}
                boundedContext={boundedContext}
                storedIntentId={storedIntentId}
                setStoredIntentId={setStoredIntentId}
                jobId={jobId}
                setJobId={setJobId}
                busy={busy}
                onRecall={runRecall}
                onCapture={capture}
              />
            </TabsContent>
            <TabsContent value="experiences">
              <RecordPanel
                title="Experience pool"
                description="Reusable outcomes and lessons from completed work."
                records={experiences}
                loading={loading}
                query={query}
                setQuery={setQuery}
                onSearch={async () => {
                  const items = query.trim()
                    ? await api.searchExperiences(query)
                    : await api.listExperiences();
                  setExperiences(items);
                }}
                onCreate={() => setCreateMode("experience")}
                onSelect={(data) => void selectExperience(data)}
                kind="experience"
              />
            </TabsContent>
            <TabsContent value="procedures">
              <RecordPanel
                title="Procedures"
                description="Reusable workflows grounded in observed work."
                records={procedures}
                loading={loading}
                query={query}
                setQuery={setQuery}
                onSearch={async () => {
                  const items = query.trim()
                    ? await api.searchProcedures(query)
                    : await api.listProcedures();
                  setProcedures(items);
                }}
                onCreate={() => setCreateMode("procedure")}
                onSelect={(data) => void selectProcedure(data)}
                kind="procedure"
              />
            </TabsContent>
            <TabsContent value="reme">
              <RemePanel
                input={remeInput}
                setInput={setRemeInput}
                busy={busy}
                onRun={invokeReme}
              />
            </TabsContent>
          </section>
        </Tabs>
      </div>
      <EditMemoryDialog
        memory={inspector?.kind === "memory" ? inspector.data : null}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={async (memory, content, confidence) => {
          setBusy("edit");
          try {
            const next = await api.updateMemory(memory, content, confidence);
            setMemories((items) =>
              items.map((item) => (item.id === next.id ? next : item)),
            );
            setInspector({ kind: "memory", data: next });
            toast.success("Memory updated.");
          } catch (cause) {
            toast.error(
              cause instanceof Error ? cause.message : "Update failed.",
            );
          } finally {
            setBusy(null);
          }
        }}
      />
      <CreateDialog
        mode={createMode}
        onOpenChange={(open) => !open && setCreateMode(null)}
        onCreate={async (values) => {
          try {
            if (createMode === "experience") {
              const item = await api.createExperience(
                values.title,
                values.detail,
                values.source,
              );
              setExperiences((items) => [item, ...items]);
              setInspector({ kind: "experience", data: item });
            } else {
              const item = await api.createProcedure(
                values.title,
                values.detail,
                values.source,
              );
              setProcedures((items) => [item, ...items]);
              setInspector({ kind: "procedure", data: item });
            }
            setCreateMode(null);
            toast.success("Record created.");
          } catch (cause) {
            toast.error(
              cause instanceof Error ? cause.message : "Create failed.",
            );
          }
        }}
      />
    </section>
  );
}

function ServiceBadge({
  label,
  status,
}: {
  label: string;
  status: ServiceStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("h-8 gap-2 rounded-full px-3 text-xs", statusStyle[status])}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "online"
            ? "bg-success"
            : status === "offline"
              ? "bg-destructive"
              : "bg-warning",
        )}
      />
      {label}: {status}
    </Badge>
  );
}
function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex min-h-18 items-center gap-3 bg-card px-4 py-3">
      <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
function InventoryList({
  memories,
  loading,
  selectedId,
  onSelect,
}: {
  memories: MemoryRecord[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (memory: MemoryRecord) => void;
}) {
  if (loading)
    return (
      <div className="grid min-h-60 place-items-center text-sm text-muted-foreground">
        <LoaderCircleIcon className="animate-spin" />
      </div>
    );
  if (!memories.length)
    return (
      <div className="grid min-h-60 place-items-center text-center">
        <div>
          <DatabaseIcon className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No memories found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try changing the filters or capture a completed intent.
          </p>
        </div>
      </div>
    );
  return (
    <div className="divide-y">
      {memories.map((memory) => (
        <Button
          type="button"
          variant="ghost"
          key={memory.id}
          onClick={() => onSelect(memory)}
          className={cn(
            "h-auto w-full flex-col items-stretch rounded-none border-l-2 border-transparent px-4 py-3 text-left hover:bg-muted sm:px-5",
            selectedId === memory.id &&
              "border-primary bg-accent hover:bg-accent",
          )}
          aria-pressed={selectedId === memory.id}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Badge
              variant="outline"
              className="h-5 shrink-0 px-1.5 text-[9px] uppercase"
            >
              {memory.memory_type}
            </Badge>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {memory.content || "Untitled memory"}
            </p>
            <span className="text-xs tabular-nums text-muted-foreground">
              {memory.confidence === null
                ? "—"
                : `${Math.round(memory.confidence * 100)}%`}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{memory.backend}</span>
            <span>·</span>
            <span>{formatDate(memory.updated_at ?? memory.created_at)}</span>
          </div>
        </Button>
      ))}
    </div>
  );
}

function Inspector({
  inspector,
  busy,
  onEdit,
  onDelete,
  onForget,
  onFeedback,
}: {
  inspector: Inspector;
  busy: string | null;
  onEdit: () => void;
  onDelete: (memory: MemoryRecord) => void;
  onForget: (memory: MemoryRecord) => void;
  onFeedback: (result: FeedbackResult) => void;
}) {
  if (!inspector)
    return (
      <aside
        aria-label="Record inspector"
        className="grid min-h-80 place-items-center bg-muted/20 p-6 text-center"
      >
        <div>
          <FileJsonIcon className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">Select a record</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Its content, provenance and actions stay in this inspector.
          </p>
        </div>
      </aside>
    );
  const raw = inspector.data.raw;
  const isMemory = inspector.kind === "memory";
  const sources =
    "source_refs" in inspector.data ? inspector.data.source_refs : [];
  return (
    <aside
      aria-label={isMemory ? "Selected memory inspector" : "Record inspector"}
      className="min-w-0 bg-muted/20 p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3 border-b pb-4">
        <div>
          <div className="text-xs text-muted-foreground capitalize">
            {inspector.kind}
          </div>
          <h2 className="mt-1 text-base font-semibold tracking-tight">
            {isMemory
              ? inspector.data.memory_type
              : inspector.kind === "experience"
                ? inspector.data.goal || "Experience"
                : inspector.kind === "procedure"
                  ? inspector.data.name || "Procedure"
                  : inspector.data.id}
          </h2>
        </div>
        <Badge variant="outline" className="capitalize">
          {isMemory
            ? inspector.data.backend
            : inspector.kind === "job"
              ? inspector.data.status
              : "record"}
        </Badge>
      </div>
      {isMemory && (
        <>
          <div className="mt-5 text-xs font-medium text-muted-foreground">
            Overview
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {inspector.data.content}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border text-xs">
            <div className="bg-card p-3">
              <dt className="text-muted-foreground">Confidence</dt>
              <dd className="mt-1 font-medium">
                {inspector.data.confidence ?? "—"}
              </dd>
            </div>
            <div className="bg-card p-3">
              <dt className="text-muted-foreground">Importance</dt>
              <dd className="mt-1 font-medium">
                {inspector.data.importance ?? "—"}
              </dd>
            </div>
          </dl>
        </>
      )}{" "}
      {inspector.kind === "experience" && (
        <p className="mt-4 text-sm leading-6">
          <strong>Lesson:</strong> {inspector.data.lesson || "—"}
        </p>
      )}{" "}
      {inspector.kind === "procedure" && (
        <p className="mt-4 text-sm leading-6">
          <strong>Trigger:</strong> {inspector.data.trigger || "—"}
        </p>
      )}{" "}
      {inspector.kind === "job" && (
        <p className="mt-4 text-sm text-muted-foreground">
          {inspector.data.message ?? "No status message."}
        </p>
      )}{" "}
      {inspector.kind !== "job" && (
        <>
          <div className="mt-5 border-t pt-4 text-xs font-medium text-muted-foreground">
            Provenance
          </div>
          <RecordSources sources={sources} />
        </>
      )}{" "}
      {isMemory && (
        <div className="mt-5 grid gap-2 border-t pt-4">
          <div className="text-xs font-medium text-muted-foreground">
            Actions
          </div>
          <Button size="sm" className="h-8" onClick={onEdit}>
            <PencilIcon /> Edit memory
          </Button>
          <div className="grid grid-cols-3 gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px]"
              disabled={busy === "feedback"}
              onClick={() => void onFeedback("success")}
            >
              Helpful
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px]"
              disabled={busy === "feedback"}
              onClick={() => void onFeedback("failure")}
            >
              Failed
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[10px]"
              disabled={busy === "feedback"}
              onClick={() => void onFeedback("irrelevant")}
            >
              Irrelevant
            </Button>
          </div>
          {inspector.data.backend === "reme" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-warning/40 text-warning"
              disabled={busy === "forget"}
              onClick={() => void onForget(inspector.data)}
            >
              <ShieldAlertIcon /> Forget ReMe
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              className="h-8"
              disabled={busy === "delete"}
              onClick={() => void onDelete(inspector.data)}
            >
              <Trash2Icon /> Delete
            </Button>
          )}
        </div>
      )}{" "}
      {inspector.kind === "procedure" && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onFeedback("success")}
          >
            Helpful
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onFeedback("failure")}
          >
            Failed
          </Button>
        </div>
      )}
      <details className="mt-5 border-t pt-3">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          Raw API response
        </summary>
        <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-foreground p-3 text-[10px] leading-5 text-background">
          {JSON.stringify(raw, null, 2)}
        </pre>
      </details>
    </aside>
  );
}
function RecallPanel({
  recallQuery,
  setRecallQuery,
  boundedContext,
  storedIntentId,
  setStoredIntentId,
  jobId,
  setJobId,
  busy,
  onRecall,
  onCapture,
}: {
  recallQuery: string;
  setRecallQuery: (value: string) => void;
  boundedContext: string;
  storedIntentId: string;
  setStoredIntentId: (value: string) => void;
  jobId: string;
  setJobId: (value: string) => void;
  busy: string | null;
  onRecall: () => void;
  onCapture: (mode: "capture" | "queue" | "job") => void;
}) {
  return (
    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section>
        <Field>
          <FieldLabel htmlFor="memory-recall-query">Recall query</FieldLabel>
          <Textarea
            id="memory-recall-query"
            value={recallQuery}
            onChange={(event) => setRecallQuery(event.target.value)}
            className="min-h-28 border-border bg-background"
            placeholder="What context should AXIOM retrieve?"
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void onRecall()} disabled={busy === "recall"}>
            {busy === "recall" && <LoaderCircleIcon className="animate-spin" />}
            <SearchIcon /> Recall memory
          </Button>
        </div>
        <div className="mt-5 rounded-xl border bg-muted p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Bounded context
          </div>
          <pre className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
            {boundedContext ||
              "Run recall to inspect the context passed to the agent."}
          </pre>
        </div>
      </section>
      <section className="rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Capture and extraction</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Use a governed stored agent intent as the capture source.
        </p>
        <Field className="mt-4">
          <FieldLabel htmlFor="stored-intent-id">
            Stored agent intent ID
          </FieldLabel>
          <Input
            id="stored-intent-id"
            value={storedIntentId}
            onChange={(event) => setStoredIntentId(event.target.value)}
            className={cn(input, "w-full")}
            placeholder="UUID from agent-intents"
          />
        </Field>
        <div className="mt-3 grid gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onCapture("capture")}
            disabled={busy === "capture"}
          >
            Capture via Middleware
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onCapture("queue")}
            disabled={busy === "queue"}
          >
            Queue canonical extraction
          </Button>
        </div>
        <Field className="mt-4">
          <FieldLabel htmlFor="extraction-job-id">Extraction job ID</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="extraction-job-id"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className={cn(input, "min-w-0 flex-1")}
              placeholder="Job UUID"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onCapture("job")}
              disabled={busy === "job"}
            >
              Check
            </Button>
          </div>
        </Field>
      </section>
    </div>
  );
}
function RecordPanel<T extends ExperienceRecord | ProcedureRecord>({
  title,
  description,
  records,
  loading,
  query,
  setQuery,
  onSearch,
  onCreate,
  onSelect,
  kind,
}: {
  title: string;
  description: string;
  records: T[];
  loading: boolean;
  query: string;
  setQuery: (value: string) => void;
  onSearch: () => Promise<void>;
  onCreate: () => void;
  onSelect: (item: T) => void;
  kind: "experience" | "procedure";
}) {
  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" onClick={onCreate}>
          <PlusIcon /> Create {kind}
        </Button>
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={cn(input, "min-w-0 flex-1 rounded-full")}
          placeholder={`Search ${kind}s`}
        />
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => void onSearch()}
        >
          <SearchIcon /> Search
        </Button>
      </div>
      <div className="mt-4 grid gap-2">
        {loading ? (
          <LoaderCircleIcon className="m-8 animate-spin" />
        ) : records.length ? (
          records.map((record) => {
            const experience = "goal" in record;
            return (
              <Button
                key={record.id}
                type="button"
                variant="outline"
                onClick={() => onSelect(record)}
                className="h-auto flex-col items-stretch rounded-xl p-3 text-left hover:border-primary/35 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="truncate text-sm">
                    {experience ? record.goal : record.name}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {record.confidence ?? "—"}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {experience ? record.lesson : record.trigger}
                </p>
                <RecordSources sources={record.source_refs} />
              </Button>
            );
          })
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No {kind}s found.
          </div>
        )}
      </div>
    </div>
  );
}
function RemePanel({
  input: remeInput,
  setInput,
  busy,
  onRun,
}: {
  input: string;
  setInput: (value: string) => void;
  busy: string | null;
  onRun: (operation: "capture" | "search" | "dream" | "reindex") => void;
}) {
  return (
    <div className="p-4">
      <Alert className="border-warning/30 bg-warning/10 text-warning">
        <ShieldAlertIcon />
        <AlertTitle>Advanced ReMe operations</AlertTitle>
        <AlertDescription>
          auto_memory and auto_dream may send content to the configured LLM
          provider. Use only approved data.
        </AlertDescription>
      </Alert>
      <Field className="mt-5">
        <FieldLabel htmlFor="reme-operation-input">
          Conversation or search query
        </FieldLabel>
        <Textarea
          id="reme-operation-input"
          value={remeInput}
          onChange={(event) => setInput(event.target.value)}
          className="min-h-20 border-border bg-background"
          placeholder="Content for auto_memory or query for ReMe search"
        />
      </Field>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <RemeAction
          title="Capture memory"
          description="Extract memory from a new conversation."
          icon={<SparklesIcon />}
          busy={busy === "reme-capture"}
          onClick={() => onRun("capture")}
        />
        <RemeAction
          title="Search ReMe"
          description="Run a direct semantic lookup."
          icon={<SearchIcon />}
          busy={busy === "reme-search"}
          onClick={() => onRun("search")}
        />
        <RemeAction
          title="Dream"
          description="Consolidate recent memory units."
          icon={<BrainCircuitIcon />}
          busy={busy === "reme-dream"}
          onClick={() => onRun("dream")}
        />
        <RemeAction
          title="Reindex"
          description="Rebuild the ReMe retrieval index."
          icon={<RefreshCwIcon />}
          busy={busy === "reme-reindex"}
          onClick={() => onRun("reindex")}
        />
      </div>
    </div>
  );
}
function RemeAction({
  title,
  description,
  icon,
  busy,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <article className="rounded-xl border p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      <Button
        size="sm"
        variant="outline"
        className="mt-4"
        disabled={busy}
        onClick={onClick}
      >
        {busy && <LoaderCircleIcon className="animate-spin" />} Run
      </Button>
    </article>
  );
}
function EditMemoryDialog({
  memory,
  open,
  onOpenChange,
  onSaved,
}: {
  memory: MemoryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (
    memory: MemoryRecord,
    content: string,
    confidence: number,
  ) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [confidence, setConfidence] = useState("0.8");
  useEffect(() => {
    setContent(memory?.content ?? "");
    setConfidence(String(memory?.confidence ?? 0.8));
  }, [memory, open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit memory</DialogTitle>
          <DialogDescription>
            Update canonical content and confidence.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="memory-content">Content</FieldLabel>
            <Textarea
              id="memory-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="memory-confidence">Confidence</FieldLabel>
            <Input
              id="memory-confidence"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
              className={cn(input, "w-full")}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!memory || !content.trim()}
            onClick={() =>
              memory &&
              void onSaved(memory, content.trim(), Number(confidence)).then(
                () => onOpenChange(false),
              )
            }
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function CreateDialog({
  mode,
  onOpenChange,
  onCreate,
}: {
  mode: CreateMode;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: {
    title: string;
    detail: string;
    source: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [source, setSource] = useState("");
  const open = mode !== null;
  useEffect(() => {
    if (open) {
      setTitle("");
      setDetail("");
      setSource("");
    }
  }, [open, mode]);
  const label = mode === "experience" ? "Experience" : "Procedure";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create {label}</DialogTitle>
          <DialogDescription>
            Source reference is required for provenance.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="record-title">
              {mode === "experience" ? "Goal" : "Name"}
            </FieldLabel>
            <Input
              id="record-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={cn(input, "w-full")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="record-detail">
              {mode === "experience" ? "Lesson" : "Trigger"}
            </FieldLabel>
            <Textarea
              id="record-detail"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="record-source">Source reference</FieldLabel>
            <Input
              id="record-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className={cn(input, "w-full")}
              placeholder="e.g. conversation:abc"
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || !detail.trim() || !source.trim()}
            onClick={() =>
              void onCreate({
                title: title.trim(),
                detail: detail.trim(),
                source: source.trim(),
              })
            }
          >
            Create {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
