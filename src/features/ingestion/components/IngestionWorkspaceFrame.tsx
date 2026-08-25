import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import type { ProgressStage } from "../model/types";
import { IngestionProgress } from "./IngestionProgress";

type IngestionWorkspaceFrameProps = {
  title: string;
  repoMessage: string;
  workspaceName: string;
  ready: boolean;
  active: ProgressStage;
  furthest: number;
  error: string | null;
  onBack: () => void;
  backLabel?: string;
  fullBleed?: boolean;
  onNavigate: (stage: ProgressStage) => void;
  children: ReactNode;
};

export function IngestionWorkspaceFrame({
  title,
  repoMessage,
  workspaceName,
  ready,
  active,
  furthest,
  error,
  onBack,
  backLabel = "Back to chat",
  fullBleed = false,
  onNavigate,
  children,
}: IngestionWorkspaceFrameProps) {
  if (fullBleed) {
    return (
      <div className="min-h-[calc(100dvh-var(--app-top-bar-height))] bg-transparent">
        <main className="flex min-h-[calc(100dvh-var(--app-top-bar-height))] w-full flex-col px-3 pb-3 pt-3 sm:px-4 lg:px-5">
          <header className="mb-3 flex min-h-12 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                className="h-9 rounded-xl border border-border bg-card px-3 text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground"
                onClick={onBack}
                type="button"
              >
                <ArrowLeftIcon data-icon="inline-start" />
                {backLabel}
              </Button>
              <span className="inline-flex h-8 items-center rounded-lg border border-primary/25 bg-primary/10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                Data ingestion
              </span>
              <span className="inline-flex h-8 max-w-52 items-center truncate rounded-lg border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground">
                {workspaceName}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                  {title}
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  {repoMessage}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex h-8 items-center rounded-lg border px-3 text-xs font-semibold",
                ready
                  ? "border-status-success/25 bg-status-success/10 text-status-success"
                  : "border-border bg-secondary text-muted-foreground",
              )}
            >
              {ready ? "Ready" : "Processing"}
            </span>
          </header>
          <section
            className="min-h-0 min-w-0 flex-1"
            aria-label="Ingestion stage workspace"
          >
            {children}
          </section>
          {error && (
            <p
              className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-var(--app-top-bar-height))] bg-transparent">
      <main className="mx-auto w-[min(1440px,100%)] px-5 pb-14 pt-6 sm:px-8 lg:px-10">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                className="h-10 rounded-full border border-border bg-card px-4 text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground"
                onClick={onBack}
                type="button"
              >
                <ArrowLeftIcon data-icon="inline-start" />
                {backLabel}
              </Button>
              <span className="inline-flex h-8 items-center rounded-full border border-primary/25 bg-primary/10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                Data ingestion
              </span>
              <span className="inline-flex h-8 max-w-52 items-center truncate rounded-full border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground">
                {workspaceName}
              </span>
            </div>
            <h1 className="mt-4 max-w-5xl text-[clamp(3rem,5vw,5.5rem)] font-semibold leading-[0.92] tracking-normal text-foreground">
              {title}
            </h1>
          </div>
        </div>
        <IngestionProgress
          active={active}
          furthest={furthest}
          onNavigate={onNavigate}
        />
        <section className="min-w-0" aria-label="Ingestion stage workspace">
          {children}
        </section>
        {error && (
          <p
            className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
