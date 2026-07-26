import { useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "./components/ChatComposer";
import { EvidencePanel } from "./components/EvidencePanel";
import { ProcessStepDetail } from "./components/ProcessStepPanel";
import { ReviewCard } from "./components/ReviewCard";
import { UserMessage } from "./components/UserMessage";
import { WelcomeWorkspace } from "./components/WelcomeWorkspace";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, XIcon } from "lucide-react";
import type {
  ChatStage,
  ChatEngine,
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
  loading: boolean;
  mode: "home" | "chat";
  engine: ChatEngine;
  onSubmit: (value: string, engine: ChatEngine) => void;
  onEngineChange: (engine: ChatEngine) => void;
  onSpecificationChange: (specification: EditableSpecification) => void;
  onSpecificationRevise: (feedback: string) => void;
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
  loading,
  mode,
  engine,
  onSubmit,
  onEngineChange,
  onSpecificationChange,
  onSpecificationRevise,
  onResetSpecification,
  onApproveAndRun,
  onRetryProcess,
  onCloseEvidence,
  onData,
}: ChatPageProps) {
  const chatMainRef = useRef<HTMLDivElement>(null);
  const [inspectedProcessStep, setInspectedProcessStep] = useState<{
    key: string;
    event: ProcessEvent;
  } | null>(null);
  const [processInspectorCollapsed, setProcessInspectorCollapsed] =
    useState(false);
  const processSignature = useMemo(
    () => processEvents.map((event) => event.status).join("-"),
    [processEvents],
  );
  const inspectableProcessEvents = useMemo(
    () => [
      ...history.flatMap((turn, index) =>
        (turn.processEvents ?? []).map((event) => ({
          key: `history-${index}:${event.id}`,
          event,
        })),
      ),
      ...processEvents.map((event) => ({ key: `current:${event.id}`, event })),
    ],
    [history, processEvents],
  );
  const processInspectorOpen = Boolean(inspectedProcessStep);

  function handleProcessEventSelect(event: ProcessEvent, key: string) {
    setInspectedProcessStep({ event, key });
    setProcessInspectorCollapsed(false);
  }

  useEffect(() => {
    if (!inspectedProcessStep) return;
    const latestStep = inspectableProcessEvents.find(
      (step) => step.key === inspectedProcessStep.key,
    );
    if (!latestStep) {
      setInspectedProcessStep(null);
      return;
    }
    if (latestStep.event !== inspectedProcessStep.event) {
      setInspectedProcessStep(latestStep);
    }
  }, [inspectableProcessEvents, inspectedProcessStep]);

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
    if (mode === "chat") {
      return (
        <EmptyChatWorkspace
          engine={engine}
          loading={loading}
          onEngineChange={onEngineChange}
          onSubmit={onSubmit}
        />
      );
    }

    return (
      <section
        className="min-h-screen w-full overflow-x-hidden"
        aria-label="Investigation welcome"
      >
        <WelcomeWorkspace
          engine={engine}
          onEngineChange={onEngineChange}
          onSubmit={onSubmit}
          onData={onData}
        />
      </section>
    );
  }
  if (!investigation) return null;

  return (
    <section
      className="h-dvh min-h-screen w-full overflow-hidden bg-transparent"
      aria-label="Investigation workspace"
    >
      <div
        className={cn(
          "mx-auto grid h-full min-h-0 gap-5 transition-[width] duration-300 ease-out max-sm:w-[calc(100%_-_24px)]",
          processInspectorOpen
            ? processInspectorCollapsed
              ? "w-[calc(100%_-_40px)] xl:grid-cols-[minmax(0,1fr)_64px] 2xl:w-[calc(100%_-_64px)]"
              : "w-[calc(100%_-_40px)] xl:grid-cols-[minmax(560px,760px)_minmax(620px,1fr)] 2xl:w-[calc(100%_-_64px)] 2xl:grid-cols-[minmax(620px,820px)_minmax(720px,1fr)]"
            : evidenceOpen && stage === "result"
              ? "w-[min(1480px,calc(100%_-_56px))]"
              : "w-[min(980px,calc(100%_-_56px))]",
        )}
      >
        <div className="flex min-h-0 flex-col gap-4 pb-4 pt-10 max-sm:pt-8 md:pt-14">
          <div
            ref={chatMainRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex flex-col gap-10 pb-6">
              {history.map((turn, index) => (
                <HistoryTurn
                  key={`${turn.investigation.question}-${index}`}
                  turn={turn}
                  processEventKeyPrefix={`history-${index}`}
                  activeProcessEventKey={inspectedProcessStep?.key}
                  onProcessEventSelect={handleProcessEventSelect}
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
                    loading={loading}
                    onSpecificationChange={onSpecificationChange}
                    onSpecificationRevise={onSpecificationRevise}
                    onReset={onResetSpecification}
                    onRun={onApproveAndRun}
                  />
                )}
                {stage === "process" && (
                  <ReviewCard
                    stage="process"
                    investigation={investigation}
                    events={processEvents}
                    activeProcessEventKey={inspectedProcessStep?.key}
                    processEventKeyPrefix="current"
                    error={error}
                    onProcessEventSelect={handleProcessEventSelect}
                    onRetry={onRetryProcess}
                  />
                )}
                {stage === "result" && result && (
                  <div
                    className={cn(
                      "grid items-start gap-6",
                      evidenceOpen &&
                        !processInspectorOpen &&
                        "xl:grid-cols-[minmax(0,1fr)_392px]",
                    )}
                  >
                    <ReviewCard
                      stage="result"
                      investigation={investigation}
                      events={processEvents}
                      activeProcessEventKey={inspectedProcessStep?.key}
                      processEventKeyPrefix="current"
                      onProcessEventSelect={handleProcessEventSelect}
                      result={result}
                    />
                    {evidenceOpen && !processInspectorOpen && (
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

          <ChatComposer
            className="shrink-0"
            engine={engine}
            sendDisabled={loading}
            onEngineChange={onEngineChange}
            onSubmit={onSubmit}
            placeholder={
              loading
                ? "AXIOM is working..."
                : stage === "result"
                  ? "Ask a follow-up or start another investigation..."
                  : "Message AXIOM..."
            }
          />
        </div>

        {inspectedProcessStep && (
          <aside
            className="min-h-0 pb-4 pt-10 max-xl:pt-0 md:pt-14"
            aria-label="Process details"
          >
            <div className="sticky top-10 h-[calc(100dvh-4.5rem)] min-h-0 md:top-14">
              {processInspectorCollapsed ? (
                <CollapsedProcessInspector
                  label={inspectedProcessStep.event.label}
                  onExpand={() => setProcessInspectorCollapsed(false)}
                  onClose={() => setInspectedProcessStep(null)}
                />
              ) : (
                <ProcessStepDetail
                  event={inspectedProcessStep.event}
                  onCollapse={() => setProcessInspectorCollapsed(true)}
                  onClose={() => setInspectedProcessStep(null)}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

function CollapsedProcessInspector({
  label,
  onExpand,
  onClose,
}: {
  label: string;
  onExpand: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full min-h-[420px] w-full flex-col items-center gap-3 rounded-2xl border border-[#d8d0c2]/80 bg-[#fffdf8]/75 px-2 py-3 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/65">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Expand process details"
        onClick={onExpand}
      >
        <ChevronLeftIcon />
      </Button>
      <div className="min-h-0 flex-1 overflow-hidden py-2">
        <div className="origin-center rotate-90 whitespace-nowrap text-xs font-medium text-[#6d685e] dark:text-[#aaa397]">
          {label}
        </div>
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Close process details"
        onClick={onClose}
      >
        <XIcon />
      </Button>
    </div>
  );
}

function EmptyChatWorkspace({
  engine,
  onSubmit,
  onEngineChange,
  loading,
}: {
  engine: ChatEngine;
  onSubmit: (value: string, engine: ChatEngine) => void;
  onEngineChange: (engine: ChatEngine) => void;
  loading: boolean;
}) {
  return (
    <section
      className="grid min-h-screen w-full place-items-center overflow-hidden px-5 py-10"
      aria-label="New chat"
    >
      <div className="flex w-full max-w-3xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            What can I help with?
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Start a new AXIOM investigation, ask for analysis, or request a
            report draft.
          </p>
        </div>
        <ChatComposer
          engine={engine}
          onSubmit={onSubmit}
          onEngineChange={onEngineChange}
          disabled={loading}
          placeholder="Message AXIOM..."
        />
      </div>
    </section>
  );
}

function HistoryTurn({
  turn,
  processEventKeyPrefix,
  activeProcessEventKey,
  onProcessEventSelect,
}: {
  turn: ChatTurn;
  processEventKeyPrefix: string;
  activeProcessEventKey?: string | null;
  onProcessEventSelect: (event: ProcessEvent, key: string) => void;
}) {
  return (
    <section className="flex flex-col gap-5">
      <UserMessage question={turn.investigation.question} />
      <ReviewCard
        stage="result"
        investigation={turn.investigation}
        events={turn.processEvents ?? []}
        activeProcessEventKey={activeProcessEventKey}
        processEventKeyPrefix={processEventKeyPrefix}
        onProcessEventSelect={onProcessEventSelect}
        result={turn.result}
      />
    </section>
  );
}
