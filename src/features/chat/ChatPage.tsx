import { useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "./components/ChatComposer";
import { EvidencePanel } from "./components/EvidencePanel";
import { ProcessInspectorAside } from "./components/ProcessStepPanel";
import { ReviewCard } from "./components/ReviewCard";
import { UserMessage } from "./components/UserMessage";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useMediaQuery } from "@/shared/hooks/use-media-query";

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
  processInspectorOpen: boolean;
  onProcessInspectorOpen: () => void;
  onProcessInspectorClose: () => void;
  engine: ChatEngine;
  onSubmit: (value: string, engine: ChatEngine, files: File[]) => void;
  onEngineChange: (engine: ChatEngine) => void;
  onSpecificationChange: (specification: EditableSpecification) => void;
  onSpecificationRevise: (feedback: string) => void;
  onResetSpecification: () => void;
  onApproveAndRun: () => void;
  onRetryProcess: () => void;
  onCloseEvidence: () => void;
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
  processInspectorOpen,
  onProcessInspectorOpen,
  onProcessInspectorClose,
  engine,
  onSubmit,
  onEngineChange,
  onSpecificationChange,
  onSpecificationRevise,
  onResetSpecification,
  onApproveAndRun,
  onRetryProcess,
  onCloseEvidence,
}: ChatPageProps) {
  const chatMainRef = useRef<HTMLDivElement>(null);
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
  function handleProcessEventSelect(event: ProcessEvent, key: string) {
    setInspectedProcessStep({ event, key });
    onProcessInspectorOpen();
  }
  const desktopInspector = useMediaQuery("(min-width: 1280px)");

  useEffect(() => {
    if (processInspectorOpen || inspectableProcessEvents.length === 0) return;
    setInspectedProcessStep(null);
  }, [inspectableProcessEvents.length, processInspectorOpen]);

  useEffect(() => {
    if (!processInspectorOpen || inspectedProcessStep) return;
    const latestStep = inspectableProcessEvents[inspectableProcessEvents.length - 1];
    if (latestStep) setInspectedProcessStep(latestStep);
  }, [inspectableProcessEvents, inspectedProcessStep, processInspectorOpen]);

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

  if (stage === "welcome") {
    return (
      <EmptyChatWorkspace
        engine={engine}
        loading={loading}
        onEngineChange={onEngineChange}
        onSubmit={onSubmit}
      />
    );
  }
  if (!investigation) return null;

  const inspector = (
    <ProcessInspectorAside
      items={inspectableProcessEvents}
      conversationId={conversationId}
      activeProcessEventKey={inspectedProcessStep?.key}
      onProcessEventSelect={handleProcessEventSelect}
      onClose={onProcessInspectorClose}
    />
  );

  return (
    <section
      className="h-[calc(100dvh-var(--app-top-bar-height))] min-h-0 w-full overflow-hidden bg-background"
      aria-label="Investigation workspace"
    >
      <div
        className={cn(
          "grid h-full min-h-0 min-w-0 transition-[grid-template-columns] duration-200 ease-out",
          processInspectorOpen && desktopInspector
            ? "xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]"
            : "grid-cols-1",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col">
          <div
            ref={chatMainRef}
            className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
          >
            <div
              className={cn(
                "mx-auto flex w-full min-w-0 flex-col gap-10 px-4 py-6 md:px-8 md:py-8",
                evidenceOpen && stage === "result" && !processInspectorOpen
                  ? "max-w-[1480px]"
                  : "max-w-5xl",
              )}
            >
              {history.map((turn, index) => (
                <HistoryTurn
                  key={`${turn.investigation.question}-${index}`}
                  turn={turn}
                  processEventKeyPrefix={`history-${index}`}
                  activeProcessEventKey={inspectedProcessStep?.key}
                  onProcessEventSelect={handleProcessEventSelect}
                />
              ))}

              <section className="flex min-w-0 flex-col gap-6">
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

          <div className="shrink-0 border-t border-border bg-background/95 px-4 py-3 md:px-8">
            <div className="mx-auto w-full max-w-5xl">
              <ChatComposer
                className="w-full"
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
          </div>
        </div>

        {processInspectorOpen && desktopInspector && (
          <aside
            data-process-inspector
            className="min-h-0 min-w-0 overflow-hidden border-l border-border bg-card"
            aria-label="Process details"
          >
            {inspector}
          </aside>
        )}
      </div>
      {processInspectorOpen && !desktopInspector && (
        <Sheet open onOpenChange={(open) => !open && onProcessInspectorClose()}>
          <SheetContent
            className="!w-[min(480px,100vw)] border-border bg-card p-0"
            side="right"
            showCloseButton={false}
            aria-label="Logs & Files"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Logs &amp; Files</SheetTitle>
              <SheetDescription>
                Review analysis details and generated files for this chat.
              </SheetDescription>
            </SheetHeader>
            {inspector}
          </SheetContent>
        </Sheet>
      )}
    </section>
  );
}

function EmptyChatWorkspace({
  engine,
  onSubmit,
  onEngineChange,
  loading,
}: {
  engine: ChatEngine;
  onSubmit: (value: string, engine: ChatEngine, files: File[]) => void;
  onEngineChange: (engine: ChatEngine) => void;
  loading: boolean;
}) {
  return (
    <section
      className="grid min-h-[calc(100dvh-var(--app-top-bar-height))] w-full items-start justify-items-center overflow-hidden px-5 pb-10 pt-[clamp(12rem,30vh,32rem)]"
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
