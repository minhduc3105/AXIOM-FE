import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPage } from "@/features/chat/ChatPage";
import { useChatWorkflow } from "@/features/chat/model/useChatWorkflow";
import { DataPage } from "@/features/data/DataPage";
import { IngestionPage } from "@/features/ingestion/IngestionPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ToolDetailPage } from "@/features/tools/ToolDetailPage";
import { ToolsPage } from "@/features/tools/ToolsPage";
import { ModelsPage } from "@/features/models/ModelsPage";
import { MemoryPage } from "@/features/memory/MemoryPage";
import { AppShell } from "./AppShell";
import {
  createChatHomeRoute,
  createChatRoute,
  createDataIngestionRoute,
  createDataRoute,
  createReportsRoute,
  createModelsRoute,
  createMemoryRoute,
  createToolDetailRoute,
  createToolsRoute,
} from "./routing/paths";
import { useAppRoute } from "./routing/useAppRoute";
import { createConversation } from "@/shared/lib/intelligence-api";
import type { ChatEngine } from "@/features/chat/model/types";

export function AppExperience() {
  const { route, navigate } = useAppRoute();
  const chat = useChatWorkflow();
  const [chatEngine, setChatEngine] = useState<ChatEngine>("auto");
  const skipNextHydrationRef = useRef<string | null>(null);

  useEffect(() => {
    if (route.surface !== "chat" || !route.sessionId) {
      return;
    }

    if (skipNextHydrationRef.current === route.sessionId) {
      skipNextHydrationRef.current = null;
      return;
    }

    if (
      chat.activeConversationId === route.sessionId &&
      chat.stage !== "welcome"
    ) {
      return;
    }

    chat.loadConversation(route.sessionId);
  }, [
    chat.activeConversationId,
    chat.loadConversation,
    chat.stage,
    route.sessionId,
    route.surface,
  ]);

  const newChat = useCallback(() => {
    chat.newChat();
    navigate(createChatRoute());
  }, [chat.newChat, navigate]);

  const openHome = useCallback(() => {
    navigate(createChatHomeRoute());
  }, [navigate]);

  const openData = useCallback(() => {
    navigate(createDataRoute());
  }, [navigate]);

  const openDataIngestion = useCallback(
    (context?: { connector?: "s3" | "snowflake"; profileId?: string }) => {
      navigate(createDataIngestionRoute(context));
    },
    [navigate],
  );

  const openReports = useCallback(() => {
    navigate(createReportsRoute());
  }, [navigate]);

  const openTools = useCallback(() => {
    navigate(createToolsRoute());
  }, [navigate]);

  const openModels = useCallback(() => {
    navigate(createModelsRoute());
  }, [navigate]);

  const openMemory = useCallback(() => {
    navigate(createMemoryRoute());
  }, [navigate]);

  const openSettings = useCallback(() => {
    navigate(createMemoryRoute());
  }, [navigate]);

  const openToolDetail = useCallback(
    (toolName: string) => {
      navigate(createToolDetailRoute(toolName));
    },
    [navigate],
  );

  const openConversation = useCallback(
    (conversationId: string) => {
      navigate(createChatRoute(conversationId));
    },
    [navigate],
  );

  const submitQuestion = useCallback(
    async (question: string, engine: ChatEngine) => {
      let conversationId = route.surface === "chat" ? route.sessionId : null;

      if (!conversationId) {
        const conversation = await createConversation(question.slice(0, 80));
        conversationId = conversation.conversation_id;
        skipNextHydrationRef.current = conversationId;
        navigate(createChatRoute(conversationId));
      }

      chat.submitQuestion(question, conversationId, engine);
    },
    [chat.submitQuestion, navigate, route],
  );

  return (
    <AppShell
      activeStage={chat.stage}
      surface={route.surface}
      activeConversationId={route.surface === "chat" ? route.sessionId : null}
      showCommandBar={route.surface === "chat" && route.page === "home"}
      onHome={openHome}
      onNewChat={newChat}
      onConversationOpen={openConversation}
      onData={openData}
      onReports={openReports}
      onModels={openModels}
      onMemory={openMemory}
      onTools={openTools}
      onSettings={openSettings}
    >
      {route.surface === "chat" ? (
        <ChatPage
          stage={chat.stage}
          evidenceOpen={chat.evidenceOpen}
          investigation={chat.investigation}
          draft={chat.draft}
          processEvents={chat.processEvents}
          result={chat.result}
          history={chat.history}
          error={chat.error}
          loading={chat.loading}
          mode={route.page === "home" ? "home" : "chat"}
          engine={chatEngine}
          onSubmit={submitQuestion}
          onEngineChange={setChatEngine}
          onSpecificationChange={chat.updateSpecification}
          onSpecificationRevise={chat.reviseSpecification}
          onResetSpecification={chat.resetSpecification}
          onApproveAndRun={chat.approveAndRun}
          onRetryProcess={chat.retryProcess}
          onCloseEvidence={chat.closeEvidence}
          onData={openData}
        />
      ) : route.surface === "data" && route.page === "ingestion" ? (
        <IngestionPage
          onBack={openData}
          backLabel="Back to data"
          launchContext={{
            connector: route.connector,
            profileId: route.profileId,
          }}
        />
      ) : route.surface === "data" ? (
        <DataPage onCreateIngestion={openDataIngestion} />
      ) : route.surface === "reports" ? (
        <ReportsPage onData={openData} />
      ) : route.surface === "models" ? (
        <ModelsPage />
      ) : route.surface === "memory" ? (
        <MemoryPage />
      ) : route.page === "detail" && route.toolName ? (
        <ToolDetailPage toolName={route.toolName} onBack={openTools} />
      ) : (
        <ToolsPage onOpenTool={openToolDetail} />
      )}
    </AppShell>
  );
}
