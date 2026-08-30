import { useEffect, useMemo, useRef } from "react";
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
import type { ChatError } from "./model/chatError";
import type {
  ProcessInspectorItem,
  ProcessStepSelectionHandler,
} from "./components/process/processEvents";
import { cn } from "@/shared/lib/utils";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import type {
  ChatDataResource,
  ChatDataScope,
} from "./model/chatDataScope";

type ChatPageProps = {
  conversationId: string | null;
  stage: ChatStage;
  evidenceOpen: boolean;
  investigation: Investigation | null;
  draft: EditableSpecification | null;
  processEvents: ProcessEvent[];
  result: MockResult | null;
  history: ChatTurn[];
  error: ChatError | null;
  historyLoading: boolean;
  loading: boolean;
  canRetry: boolean;
  inspectorItems: ProcessInspectorItem[];
  activeProcessEventKey: string | null;
  onProcessEventSelect: ProcessStepSelectionHandler;
  processInspectorOpen: boolean;
  onProcessInspectorOpen: () => void;
  onProcessInspectorClose: () => void;
  engine: ChatEngine;
  focusComposerRequest?: number;
  onSubmit: (value: string, engine: ChatEngine, files: File[]) => void;
  onEngineChange: (engine: ChatEngine) => void;
  onSpecificationChange: (specification: EditableSpecification) => void;
  onSpecificationRevise: (feedback: string) => void;
  onResetSpecification: () => void;
  onApproveAndRun: () => void;
  onRetryProcess: () => void;
  onCloseEvidence: () => void;
  onStopGeneration?: () => void;
  dataScope?: ChatDataScope;
  dataResources?: ChatDataResource[];
  dataResourcesLoading?: boolean;
  dataResourcesError?: string | null;
  onDataScopeChange?: (scope: ChatDataScope) => void;
  onDataResourcesRefresh?: () => void;
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
  historyLoading,
  loading,
  canRetry,
  inspectorItems,
  activeProcessEventKey,
  onProcessEventSelect,
  processInspectorOpen,
  onProcessInspectorOpen,
  onProcessInspectorClose,
  engine,
  focusComposerRequest = 0,
  onSubmit,
  onEngineChange,
  onSpecificationChange,
  onSpecificationRevise,
  onResetSpecification,
  onApproveAndRun,
  onRetryProcess,
  onCloseEvidence,
  onStopGeneration,
  dataScope,
  dataResources = [],
  dataResourcesLoading = false,
  dataResourcesError = null,
  onDataScopeChange,
  onDataResourcesRefresh,
}: ChatPageProps) {
  const chatMainRef = useRef<HTMLDivElement>(null);
  const processSignature = useMemo(
    () => processEvents.map((event) => event.status).join("-"),
    [processEvents],
  );
  const resultScrollSignature = result?.markdown.length ?? 0;
  function handleProcessEventSelect(
    ...args: Parameters<ProcessStepSelectionHandler>
  ) {
    onProcessEventSelect(...args);
    onProcessInspectorOpen();
  }
  const desktopInspector = useMediaQuery("(min-width: 1280px)");

  useEffect(() => {
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (stage === "welcome") {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const chatMain = chatMainRef.current;
      if (chatMain && typeof chatMain.scrollTo === "function") {
        chatMain.scrollTo({
          top: chatMain.scrollHeight,
          behavior: loading || reducedMotion ? "auto" : "smooth",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [history.length, loading, processSignature, resultScrollSignature, stage]);

  if (historyLoading || (stage === "welcome" && error)) {
    return <ConversationHistoryStatus loading={historyLoading} error={error} />;
  }
  if (stage === "welcome") {
    return (
      <EmptyChatWorkspace
        engine={engine}
        loading={loading}
        focusComposerRequest={focusComposerRequest}
        onEngineChange={onEngineChange}
        onSubmit={onSubmit}
        onStop={onStopGeneration}
        dataScope={dataScope}
        dataResources={dataResources}
        dataResourcesLoading={dataResourcesLoading}
        dataResourcesError={dataResourcesError}
        onDataScopeChange={onDataScopeChange}
        onDataResourcesRefresh={onDataResourcesRefresh}
      />
    );
  }
  if (!investigation) return null;

  const inspector = (
    <ProcessInspectorAside
      items={inspectorItems}
      conversationId={conversationId}
      activeProcessEventKey={activeProcessEventKey}
      onProcessEventSelect={handleProcessEventSelect}
      onClose={onProcessInspectorClose}
    />
  );

  return (
    <section
      className="h-[calc(100dvh-var(--app-top-bar-height))] min-h-0 w-full overflow-hidden bg-background"
      aria-label="Investigation workspace"
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col">
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
                activeProcessEventKey={activeProcessEventKey}
                onProcessEventSelect={handleProcessEventSelect}
              />
            ))}

            <section className="flex min-w-0 flex-col gap-6">
              <UserMessage
                attachments={investigation.attachments}
                dataScope={investigation.dataScope}
                question={investigation.question}
              />

              <ReviewCard
                stage={stage}
                investigation={investigation}
                draft={draft}
                events={processEvents}
                activeProcessEventKey={activeProcessEventKey}
                processEventKeyPrefix="current"
                error={error}
                loading={loading}
                result={result}
                responseComplete={stage === "result" && !loading}
                canRetry={canRetry}
                onProcessEventSelect={handleProcessEventSelect}
                onSpecificationChange={onSpecificationChange}
                onSpecificationRevise={onSpecificationRevise}
                onReset={onResetSpecification}
                onRun={onApproveAndRun}
                onRetry={onRetryProcess}
              />
              {stage === "result" &&
                result &&
                evidenceOpen &&
                !processInspectorOpen && (
                  <EvidencePanel result={result} onClose={onCloseEvidence} />
                )}
            </section>
          </div>
        </div>

        <div
          className="shrink-0 bg-background/95 px-4 py-3 md:px-8"
          data-chat-composer-dock
        >
          <div className="mx-auto w-full max-w-5xl">
            <ChatComposer
              className="w-full"
              engine={engine}
              sendDisabled={loading}
              autoFocus={loading}
              onEngineChange={onEngineChange}
              onSubmit={onSubmit}
              onStop={onStopGeneration}
              dataScope={dataScope}
              dataResources={dataResources}
              dataResourcesLoading={dataResourcesLoading}
              dataResourcesError={dataResourcesError}
              onDataScopeChange={onDataScopeChange}
              onDataResourcesRefresh={onDataResourcesRefresh}
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
      {processInspectorOpen && !desktopInspector && (
        <Sheet open onOpenChange={(open) => !open && onProcessInspectorClose()}>
          <SheetContent
            id="process-inspector"
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

function ConversationHistoryStatus({
  loading,
  error,
}: {
  loading: boolean;
  error: ChatError | null;
}) {
  return (
    <section
      className="min-h-[calc(100dvh-var(--app-top-bar-height))] w-full overflow-hidden bg-background"
      aria-label="Conversation history"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <div
          aria-busy={loading}
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-180 motion-reduce:animate-none"
          data-chat-response
          data-response-state={loading ? "history-loading" : "error"}
        >
          {loading ? (
            <>
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <span
                    className="size-1.5 rounded-full bg-muted-foreground/70 motion-safe:animate-pulse motion-reduce:animate-none"
                    key={dot}
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </span>
              <span>Loading conversation…</span>
            </>
          ) : (
            <span role="alert">{error?.message}</span>
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyChatWorkspace({
  engine,
  onSubmit,
  onEngineChange,
  loading,
  focusComposerRequest,
  onStop,
  dataScope,
  dataResources,
  dataResourcesLoading,
  dataResourcesError,
  onDataScopeChange,
  onDataResourcesRefresh,
}: {
  engine: ChatEngine;
  onSubmit: (value: string, engine: ChatEngine, files: File[]) => void;
  onEngineChange: (engine: ChatEngine) => void;
  loading: boolean;
  focusComposerRequest: number;
  onStop?: () => void;
  dataScope?: ChatDataScope;
  dataResources: ChatDataResource[];
  dataResourcesLoading: boolean;
  dataResourcesError: string | null;
  onDataScopeChange?: (scope: ChatDataScope) => void;
  onDataResourcesRefresh?: () => void;
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
          focusRequest={focusComposerRequest}
          onSubmit={onSubmit}
          onEngineChange={onEngineChange}
          onStop={onStop}
          dataScope={dataScope}
          dataResources={dataResources}
          dataResourcesLoading={dataResourcesLoading}
          dataResourcesError={dataResourcesError}
          onDataScopeChange={onDataScopeChange}
          onDataResourcesRefresh={onDataResourcesRefresh}
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
        dataScope={turn.investigation.dataScope}
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
        error={turn.error}
        responseComplete
        loading={false}
      />
    </section>
  );
}
