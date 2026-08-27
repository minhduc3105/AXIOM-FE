import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SaveIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import * as api from "./api/memoryApi";
import { MemoryFileEditor } from "./components/MemoryFileEditor";
import type { MemorySnapshot } from "./model/types";

const emptySnapshot: MemorySnapshot = {
  user_markdown: "",
  memory_markdown: "",
};

function getErrorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function EditorSkeleton() {
  return (
    <div className="min-h-[460px] overflow-hidden rounded-[24px] border border-border/80 bg-card">
      <div className="flex items-start gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <Skeleton className="size-9 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function MemoryPage() {
  const [baseline, setBaseline] = useState<MemorySnapshot>(emptySnapshot);
  const [draft, setDraft] = useState<MemorySnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    draft.user_markdown !== baseline.user_markdown ||
    draft.memory_markdown !== baseline.memory_markdown;

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await api.getMemorySnapshot();
      setBaseline(next);
      setDraft(next);
      setLoaded(true);
    } catch (cause) {
      setError(getErrorMessage(cause, "Memory files could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const saveSnapshot = async () => {
    if (!isDirty || !loaded || saving) return;
    setSaving(true);
    setError(null);
    try {
      const next = await api.saveMemorySnapshot(draft);
      setBaseline(next);
      setDraft(next);
      toast.success("Memory files saved.");
    } catch (cause) {
      setError(
        getErrorMessage(cause, "Changes were not saved. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    if (!isDirty || saving) return;
    if (!window.confirm("Discard unsaved changes?")) return;
    setDraft(baseline);
    setError(null);
  };

  const retry = () => {
    if (isDirty) {
      void saveSnapshot();
      return;
    }
    void loadSnapshot();
  };

  const statusLabel = loading
    ? "Loading"
    : saving
      ? "Saving"
      : error && !loaded
        ? "Unable to load"
        : isDirty
          ? "Unsaved changes"
          : "Saved";

  return (
    <section
      className="min-h-full px-5 pb-10 pt-4 sm:px-8 md:pt-6"
      aria-label="Memory files"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col gap-6">
        <header className="flex flex-col gap-6 border-b border-border/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="mr-1 flex items-center gap-2 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {loading || saving ? (
                <LoaderCircleIcon
                  className="size-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : error && !loaded ? (
                <CircleAlertIcon
                  className="size-3.5 text-destructive"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2Icon
                  className={cn(
                    "size-3.5",
                    isDirty ? "text-warning" : "text-success",
                  )}
                  aria-hidden="true"
                />
              )}
              <span>{statusLabel}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={discardChanges}
              disabled={!isDirty || saving || loading}
            >
              <RotateCcwIcon data-icon="inline-start" />
              Discard
            </Button>
            <Button
              type="button"
              onClick={() => void saveSnapshot()}
              disabled={!isDirty || !loaded || saving || loading}
            >
              {saving ? (
                <LoaderCircleIcon
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {saving ? "Saving" : "Save all"}
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="rounded-[18px]">
            <CircleAlertIcon />
            <AlertTitle>
              {loaded
                ? "Changes were not saved"
                : "Memory files are unavailable"}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={retry}
                disabled={saving}
              >
                <RefreshCwIcon data-icon="inline-start" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <EditorSkeleton />
            <EditorSkeleton />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <MemoryFileEditor
              id="memory-markdown"
              fileName="MEMORY.md"
              description="Durable context AXIOM can carry between sessions."
              value={draft.memory_markdown}
              onChange={(value) =>
                setDraft((current) => ({ ...current, memory_markdown: value }))
              }
              disabled={saving}
            />
            <MemoryFileEditor
              id="user-markdown"
              fileName="USER.md"
              description="Personal details and preferences for your workspace."
              value={draft.user_markdown}
              onChange={(value) =>
                setDraft((current) => ({ ...current, user_markdown: value }))
              }
              disabled={saving}
            />
          </div>
        )}
      </div>
    </section>
  );
}
