import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPage } from "@/features/chat/ChatPage";
import { useChatWorkflow } from "@/features/chat/model/useChatWorkflow";
import { DataPage } from "@/features/data/DataPage";
import { IngestionPage } from "@/features/ingestion/IngestionPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ToolDetailPage } from "@/features/tools/ToolDetailPage";
import { ToolsPage } from "@/features/tools/ToolsPage";
import { ModelsPage } from "@/features/models/ModelsPage";
import { useModelRegistry } from "@/features/models/model/useModelRegistry";
import { MemoryPage } from "@/features/memory/MemoryPage";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { useAuth } from "@/features/auth/model/AuthProvider";
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
import type { ChatEngine, ChatModelOption } from "@/features/chat/model/types";

export function AppExperience() {
  const auth = useAuth();
  const { route, navigate } = useAppRoute();
  const chat = useChatWorkflow();
  const llmRegistry = useModelRegistry("llm");
  const [chatEngine, setChatEngine] = useState<ChatEngine>("auto");
  const [selectedModelAlias, setSelectedModelAlias] = useState<string | null>(
    null,
  );
  const skipNextHydrationRef = useRef<string | null>(null);
  const llmModelOptions: ChatModelOption[] = useMemo(
    () =>
      llmRegistry.models.map((model) => ({
        id: model.id,
        alias: model.alias,
        label: model.display_name || model.alias,
        status: model.status,
      })),
    [llmRegistry.models],
  );

  useEffect(() => {
    if (
      selectedModelAlias &&
      llmModelOptions.some((model) => model.alias === selectedModelAlias)
    ) {
      return;
    }

    const activeModel =
      llmModelOptions.find(
        (model) => model.status?.toLowerCase() === "active",
      ) ?? llmModelOptions[0];
    setSelectedModelAlias(activeModel?.alias ?? null);
  }, [llmModelOptions, selectedModelAlias]);

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

  const openSettings = useCallback(() => {}, []);

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
    async (
      question: string,
      engine: ChatEngine,
      files: File[] = [],
      modelAlias?: string | null,
    ) => {
      let conversationId = route.surface === "chat" ? route.sessionId : null;

      if (!conversationId) {
        const conversation = await createConversation(question.slice(0, 80));
        conversationId = conversation.conversation_id;
        skipNextHydrationRef.current = conversationId;
        navigate(createChatRoute(conversationId));
      }

      chat.submitQuestion(
        question,
        conversationId,
        engine,
        files,
        auth.user?.organization_id,
        modelAlias,
      );
    },
    [auth.user?.organization_id, chat.submitQuestion, navigate, route],
  );

  if (auth.status === "restoring") {
    return <AuthRestoreScreen />;
  }

  if (auth.status === "unauthenticated") {
    return <LoginPage />;
  }

  if (!auth.user) {
    return <AuthRestoreScreen />;
  }

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
      user={auth.user}
      onLogout={auth.logout}
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
          models={llmModelOptions}
          selectedModelAlias={selectedModelAlias}
          onSubmit={submitQuestion}
          onEngineChange={setChatEngine}
          onModelChange={setSelectedModelAlias}
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
          organizationId={auth.user.organization_id}
          onBack={openData}
          backLabel="Back to data"
          launchContext={{
            connector: route.connector,
            profileId: route.profileId,
          }}
        />
      ) : route.surface === "data" ? (
        <DataPage
          organizationId={auth.user.organization_id}
          onCreateIngestion={openDataIngestion}
        />
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

function AuthRestoreScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4efe5] text-[#191915] dark:bg-[#11110f] dark:text-[#eee8dc]">
      <div className="rounded-lg border border-[#d8d0c2] bg-[#fffdf8]/88 px-5 py-4 text-sm text-[#6d685e] shadow-[0_18px_50px_rgba(60,48,25,0.08)] dark:border-[#38372f] dark:bg-[#171714]/90 dark:text-[#eee8dc]/70">
        Restoring AXIOM session...
      </div>
    </main>
  );
}
