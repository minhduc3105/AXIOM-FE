import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProgressStage } from "../model/types";
import { IngestionProgress } from "./IngestionProgress";

type IngestionWorkspaceFrameProps = {
  title: string;
  repoMessage: string;
  ready: boolean;
  active: ProgressStage;
  furthest: number;
  error: string | null;
  onBack: () => void;
  backLabel?: string;
  onNavigate: (stage: ProgressStage) => void;
  children: ReactNode;
};

export function IngestionWorkspaceFrame({
  title,
  repoMessage,
  ready,
  active,
  furthest,
  error,
  onBack,
  backLabel = "Back to chat",
  onNavigate,
  children,
}: IngestionWorkspaceFrameProps) {
  return (
    <div className="min-h-screen bg-transparent">
      <main className="mx-auto w-[min(1440px,100%)] px-5 pb-14 pt-28 sm:px-8 lg:px-10">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                className="h-10 rounded-full border border-[#d8d0c2] bg-[#fffdf8]/86 px-4 text-[#6d685e] shadow-[0_10px_30px_rgba(24,24,18,0.06)] hover:bg-[#f4efe5] hover:text-[#191915] dark:border-[#38372f] dark:bg-[#1a1a17]/82 dark:text-[#aaa397] dark:hover:bg-white/10 dark:hover:text-white"
                onClick={onBack}
                type="button"
              >
                <ArrowLeftIcon data-icon="inline-start" />
                {backLabel}
              </Button>
              <span className="inline-flex h-8 items-center rounded-full border border-[#d8d0c2]/75 bg-[#fffdf8]/58 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2456e8] shadow-[0_8px_24px_rgba(24,24,18,0.04)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-white/6 dark:text-[#7895ff]">
                Data ingestion
              </span>
            </div>
            <h1 className="mt-4 max-w-5xl text-[clamp(3rem,5vw,5.5rem)] font-semibold leading-[0.92] tracking-normal text-[#191915] dark:text-[#eee8dc]">
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
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
