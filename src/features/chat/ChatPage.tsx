import { useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "./components/ChatComposer";
import { EvidencePanel } from "./components/EvidencePanel";
import { ProcessInspectorAside } from "./components/ProcessStepPanel";
import { ReviewCard } from "./components/ReviewCard";
import { UserMessage } from "./components/UserMessage";
import { WelcomeWorkspace } from "./components/WelcomeWorkspace";
import { Button } from "@/components/ui/button";
import { PanelRightOpenIcon } from "lucide-react";
import type {
  ChatStage,
  ChatEngine,
  ChatExecutionMode,
  ChatModelOption,
  ChatTurn,
  EditableSpecification,
  Investigation,
  MockResult,
  ProcessEvent,
} from "./model/types";
import { cn } from "@/shared/lib/utils";

type ChatPageProps = {
  conversationId: string | null;
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
  executionMode: ChatExecutionMode;
  models: ChatModelOption[];
  selectedModelAlias: string | null;
  onSubmit: (
    value: string,
    engine: ChatEngine,
    files: File[],
    modelAlias?: string | null,
    executionMode?: ChatExecutionMode,
  ) => void;
  onEngineChange: (engine: ChatEngine) => void;
  onExecutionModeChange: (mode: ChatExecutionMode) => void;
  onModelChange: (modelAlias: string | null) => void;
  onSpecificationChange: (specification: EditableSpecification) => void;
  onSpecificationRevise: (feedback: string) => void;
  onResetSpecification: () => void;
  onApproveAndRun: () => void;
  onRetryProcess: () => void;
  onCloseEvidence: () => void;
  onData: () => void;
};

export function ChatPage({
  conversationId,
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
  executionMode,
  models,
  selectedModelAlias,
  onSubmit,
  onEngineChange,
  onExecutionModeChange,
  onModelChange,
  onSpecificationChange,
  onSpecificationRevise,
  onResetSpecification,
  onApproveAndRun,
  onRetryProcess,
  onCloseEvidence,
  onData,
}: ChatPageProps) {
  const chatMainRef = useRef<HTMLElement>(null);
  const [inspectedProcessStep, setInspectedProcessStep] = useState<{
    key: string;
    event: ProcessEvent;
  } | null>(null);
  const processSignature = useMemo(
    () => processEvents.map((event) => event.status).join("-"),
    [processEvents],
  );
  const resultScrollSignature = result?.markdown.length ?? 0;
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
  const canOpenProcessInspector = inspectableProcessEvents.length > 0;

  function handleProcessEventSelect(event: ProcessEvent, key: string) {
    setInspectedProcessStep({ event, key });
  }

  function handleOpenProcessInspector() {
    const latestStep = inspectableProcessEvents[inspectableProcessEvents.length - 1];
    if (!latestStep) return;
    setInspectedProcessStep(latestStep);
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
        chatMain.scrollTo({
          top: chatMain.scrollHeight,
          behavior: loading ? "auto" : "smooth",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [history.length, loading, processSignature, resultScrollSignature, stage]);

  if (mode === "home") {
    return (
      <section
        className="min-h-[calc(100dvh-var(--app-top-bar-height))] w-full overflow-x-hidden"
        aria-label="Investigation welcome"
      >
        <WelcomeWorkspace
          engine={engine}
          executionMode={executionMode}
          models={models}
          selectedModelAlias={selectedModelAlias}
          onEngineChange={onEngineChange}
          onExecutionModeChange={onExecutionModeChange}
          onModelChange={onModelChange}
          onSubmit={onSubmit}
          onData={onData}
        />
      </section>
    );
  }

  if (stage === "welcome") {
    return (
      <EmptyChatWorkspace
        engine={engine}
        executionMode={executionMode}
        models={models}
        selectedModelAlias={selectedModelAlias}
        loading={loading}
        onEngineChange={onEngineChange}
        onExecutionModeChange={onExecutionModeChange}
        onModelChange={onModelChange}
        onSubmit={onSubmit}
      />
    );
  }
  if (!investigation) return null;

  return (
    <section
      ref={chatMainRef}
      className="h-[calc(100dvh-var(--app-top-bar-height))] min-h-0 w-full overflow-y-auto overflow-x-hidden bg-transparent"
      aria-label="Investigation workspace"
    >
      <div
        className={cn(
          "mx-auto grid min-h-full gap-5 transition-[width] duration-300 ease-out max-sm:w-[calc(100%_-_24px)]",
          processInspectorOpen
            ? "w-[calc(100%_-_40px)] xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] 2xl:w-[calc(100%_-_64px)]"
            : evidenceOpen && stage === "result"
              ? "w-[min(1480px,calc(100%_-_56px))]"
              : "w-[min(980px,calc(100%_-_56px))]",
        )}
      >
        <div className="flex min-h-full flex-col gap-4 pb-4 pt-8 md:pt-10">
          <div
            className="min-h-0 flex-1 overflow-visible pr-2"
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
                <UserMessage
                  attachments={investigation.attachments}
                  question={investigation.question}
                />

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
                      responseComplete={!loading}
                    />
                    {evidenceOpen && !processInspectorOpen && (
                      <EvidencePanel
                        result={result}
                        onClose={onCloseEvidence}
                      />
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
            className="sticky bottom-4 z-20 shrink-0"
            engine={engine}
            executionMode={executionMode}
            models={models}
            selectedModelAlias={selectedModelAlias}
            sendDisabled={loading}
            onEngineChange={onEngineChange}
            onExecutionModeChange={onExecutionModeChange}
            onModelChange={onModelChange}
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
            data-process-inspector
            className="min-h-0 min-w-0 max-w-full pb-4 pt-8 max-xl:pt-0 md:pt-10"
            aria-label="Process details"
          >
            <div className="sticky top-8 h-[calc(100dvh-var(--app-top-bar-height)-4rem)] min-h-0 min-w-0 max-w-full md:top-10">
              <ProcessInspectorAside
                items={inspectableProcessEvents}
                conversationId={conversationId}
                activeProcessEventKey={inspectedProcessStep.key}
                onProcessEventSelect={handleProcessEventSelect}
                onClose={() => setInspectedProcessStep(null)}
              />
            </div>
          </aside>
        )}
      </div>
      {!processInspectorOpen && canOpenProcessInspector && (
        <Button
          type="button"
          variant="outline"
          className="fixed right-5 top-24 z-30 rounded-2xl border-[#d8d0c2] bg-white/92 px-4 shadow-[0_10px_30px_rgba(24,24,18,0.12)] backdrop-blur-xl hover:bg-[#f7f3eb] dark:border-[#38372f] dark:bg-[#20201c]/92 dark:hover:bg-[#292923]"
          onClick={handleOpenProcessInspector}
        >
          <PanelRightOpenIcon data-icon="inline-start" />
          Logs & Files
        </Button>
      )}
    </section>
  );
}

function EmptyChatWorkspace({
  engine,
  executionMode,
  onSubmit,
  onEngineChange,
  onExecutionModeChange,
  models,
  selectedModelAlias,
  onModelChange,
  loading,
}: {
  engine: ChatEngine;
  executionMode: ChatExecutionMode;
  models: ChatModelOption[];
  selectedModelAlias: string | null;
  onSubmit: (
    value: string,
    engine: ChatEngine,
    files: File[],
    modelAlias?: string | null,
    executionMode?: ChatExecutionMode,
  ) => void;
  onEngineChange: (engine: ChatEngine) => void;
  onExecutionModeChange: (mode: ChatExecutionMode) => void;
  onModelChange: (modelAlias: string | null) => void;
  loading: boolean;
}) {
  return (
    <section
      className="grid min-h-[calc(100dvh-var(--app-top-bar-height))] w-full place-items-center overflow-hidden px-5 py-10"
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
          executionMode={executionMode}
          models={models}
          selectedModelAlias={selectedModelAlias}
          onSubmit={onSubmit}
          onEngineChange={onEngineChange}
          onExecutionModeChange={onExecutionModeChange}
          onModelChange={onModelChange}
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
      <UserMessage
        attachments={turn.investigation.attachments}
        question={turn.investigation.question}
      />
      <ReviewCard
        stage="result"
        investigation={turn.investigation}
        events={turn.processEvents ?? []}
        activeProcessEventKey={activeProcessEventKey}
        processEventKeyPrefix={processEventKeyPrefix}
        onProcessEventSelect={onProcessEventSelect}
        result={turn.result}
        responseComplete
      />
    </section>
  );
}
