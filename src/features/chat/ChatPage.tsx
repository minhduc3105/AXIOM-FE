import { useEffect, useMemo, useRef } from "react";
import { ChatComposer } from "./components/ChatComposer";
import { EvidencePanel } from "./components/EvidencePanel";
import { MarkdownContent } from "./components/MarkdownContent";
import { ReviewCard } from "./components/ReviewCard";
import { UserMessage } from "./components/UserMessage";
import { WelcomeWorkspace } from "./components/WelcomeWorkspace";
import type {
  ChatStage,
  ChatTurn,
  EditableSpecification,
  Investigation,
  MockResult,
  ProcessEvent,
} from "./model/types";
import { cn } from "@/shared/lib/utils";

type ChatPageProps = {
  stage: ChatStage;
  evidenceOpen: boolean;
  investigation: Investigation | null;
  draft: EditableSpecification | null;
  processEvents: ProcessEvent[];
  result: MockResult | null;
  history: ChatTurn[];
  error: string | null;
  onSubmit: (value: string) => void;
  onSpecificationChange: (specification: EditableSpecification) => void;
  onResetSpecification: () => void;
  onApproveAndRun: () => void;
  onRetryProcess: () => void;
  onCloseEvidence: () => void;
  onData: () => void;
};

export function ChatPage({
  stage,
  evidenceOpen,
  investigation,
  draft,
  processEvents,
  result,
  history,
  error,
  onSubmit,
  onSpecificationChange,
  onResetSpecification,
  onApproveAndRun,
  onRetryProcess,
  onCloseEvidence,
  onData,
}: ChatPageProps) {
  const chatMainRef = useRef<HTMLDivElement>(null);
  const processSignature = useMemo(
    () => processEvents.map((event) => event.status).join("-"),
    [processEvents],
  );

  useEffect(() => {
    if (stage === "welcome") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const chatMain = chatMainRef.current;
      if (chatMain && typeof chatMain.scrollTo === "function") {
        chatMain.scrollTo({ top: chatMain.scrollHeight, behavior: "smooth" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [history.length, processSignature, stage]);

  if (stage === "welcome") {
    return (
      <section
        className="min-h-screen w-full overflow-x-hidden"
        aria-label="Investigation welcome"
      >
        <WelcomeWorkspace onSubmit={onSubmit} onData={onData} />
      </section>
    );
  }
  if (!investigation) return null;

  return (
    <section
      className="h-[calc(100vh-72px)] w-full overflow-hidden bg-transparent"
      aria-label="Investigation workspace"
    >
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 flex-col gap-4 pb-4 pt-10 transition-[width] duration-300 ease-out max-sm:w-[calc(100%_-_24px)] max-sm:pt-8 md:pt-14",
          evidenceOpen && stage === "result"
            ? "w-[min(1480px,calc(100%_-_56px))]"
            : "w-[min(980px,calc(100%_-_56px))]",
        )}
      >
        <div
          ref={chatMainRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex flex-col gap-10 pb-6">
            {history.map((turn, index) => (
              <HistoryTurn
                key={`${turn.investigation.question}-${index}`}
                turn={turn}
              />
            ))}

            <section className="flex flex-col gap-6">
              <UserMessage question={investigation.question} />

              {stage === "pending" && (
                <ReviewCard stage="pending" investigation={investigation} />
              )}
              {stage === "intent" && draft && (
                <ReviewCard
                  stage="intent"
                  investigation={investigation}
                  draft={draft}
                  error={error}
                  onSpecificationChange={onSpecificationChange}
                  onReset={onResetSpecification}
                  onRun={onApproveAndRun}
                />
              )}
              {stage === "process" && (
                <ReviewCard
                  stage="process"
                  investigation={investigation}
                  events={processEvents}
                  error={error}
                  onRetry={onRetryProcess}
                />
              )}
              {stage === "result" && result && (
                <div
                  className={cn(
                    "grid items-start gap-6",
                    evidenceOpen && "xl:grid-cols-[minmax(0,1fr)_392px]",
                  )}
                >
                  <ReviewCard
                    stage="result"
                    investigation={investigation}
                    events={processEvents}
                    result={result}
                  />
                  {evidenceOpen && (
                    <EvidencePanel result={result} onClose={onCloseEvidence} />
                  )}
                </div>
              )}

              {stage === "pending" && error && (
                <p
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </section>
          </div>
        </div>

        {stage === "result" && (
          <ChatComposer
            className="shrink-0"
            onSubmit={onSubmit}
            placeholder="Ask a follow-up or start another investigation..."
          />
        )}
      </div>
    </section>
  );
}

function HistoryTurn({ turn }: { turn: ChatTurn }) {
  return (
    <section className="flex flex-col gap-5">
      <UserMessage question={turn.investigation.question} />
      <div className="rounded-3xl border border-[#d8d0c2] bg-[#fffdf8]/90 p-6 shadow-[0_16px_44px_rgba(24,24,18,0.08)] dark:border-[#38372f] dark:bg-[#1a1a17]/90">
        <MarkdownContent markdown={turn.result.markdown} compact />
      </div>
    </section>
  );
}
