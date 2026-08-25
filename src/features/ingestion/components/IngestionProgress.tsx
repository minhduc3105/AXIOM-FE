import type { ProgressStage } from "../model/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

const steps: Array<{ id: ProgressStage; label: string }> = [
  { id: "source", label: "1. Source" },
  { id: "transfer", label: "2. Upload / Connect" },
  { id: "pipeline", label: "3. Pipeline" },
];

type IngestionProgressProps = {
  active: ProgressStage;
  furthest: number;
  onNavigate: (stage: ProgressStage) => void;
};

export function IngestionProgress({
  active,
  furthest,
  onNavigate,
}: IngestionProgressProps) {
  const activeIndex = steps.findIndex((step) => step.id === active);

  return (
    <nav
      className="my-5 grid grid-cols-1 gap-2 rounded-3xl border border-border bg-card p-2 shadow-sm sm:grid-cols-3"
      aria-label="Ingestion progress"
    >
      {steps.map((step, index) => {
        const state =
          index === activeIndex
            ? "active"
            : index <= furthest
              ? "complete"
              : index === activeIndex + 1
                ? "next"
                : "queued";
        return (
          <Button
            type="button"
            key={step.id}
            className={cn(
              "h-16 min-w-0 flex-col items-start rounded-2xl border border-border bg-secondary px-4 py-3 text-left text-secondary-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-55",
              state === "active" &&
                "border-primary bg-primary text-primary-foreground hover:bg-brand-strong",
              state === "complete" &&
                "border-primary/25 bg-primary/10 text-primary",
            )}
            disabled={index > furthest}
            onClick={() => onNavigate(step.id)}
            aria-current={state === "active" ? "step" : undefined}
          >
            <strong className="truncate text-sm">{step.label}</strong>
            <span className="text-xs opacity-75">
              {state === "active"
                ? "Active"
                : state === "complete"
                  ? "Complete"
                  : state === "next"
                    ? "Next"
                    : "Queued"}
            </span>
          </Button>
        );
      })}
    </nav>
  );
}
