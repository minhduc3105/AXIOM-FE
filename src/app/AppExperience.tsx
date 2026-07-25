import { useCallback, useEffect, useRef } from "react";
import { ChatPage } from "@/features/chat/ChatPage";
import { useChatWorkflow } from "@/features/chat/model/useChatWorkflow";
import { DataPage } from "@/features/data/DataPage";
import { IngestionPage } from "@/features/ingestion/IngestionPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { AppShell } from "./AppShell";
import {
  createChatHomeRoute,
  createChatRoute,
  createDataIngestionRoute,
  createDataRoute,
  createReportsRoute,
} from "./routing/paths";
import { useAppRoute } from "./routing/useAppRoute";
import { createConversation } from "@/shared/lib/intelligence-api";

export function AppExperience() {
  const { route, navigate } = useAppRoute();
  const chat = useChatWorkflow();
  const skipNextHydrationRef = useRef<string | null>(null);

  useEffect(() => {
    if (route.surface !== "chat" || !route.sessionId) {
      return;
    }

    if (skipNextHydrationRef.current === route.sessionId) {
      skipNextHydrationRef.current = null;
      return;
    }

    chat.loadConversation(route.sessionId);
  }, [chat.loadConversation, route.sessionId, route.surface]);

  const newChat = useCallback(() => {
    chat.newChat();
    navigate(createChatRoute());
  }, [chat.newChat, navigate]);

  const openHome = useCallback(() => {
    chat.newChat();
    navigate(createChatHomeRoute());
  }, [chat.newChat, navigate]);

  const openData = useCallback(() => {
    navigate(createDataRoute());
  }, [navigate]);

  const openDataIngestion = useCallback(() => {
    navigate(createDataIngestionRoute());
  }, [navigate]);

  const openReports = useCallback(() => {
    navigate(createReportsRoute());
  }, [navigate]);

  const openConversation = useCallback(
    (conversationId: string) => {
      navigate(createChatRoute(conversationId));
    },
    [navigate],
  );

  const submitQuestion = useCallback(
    async (question: string) => {
      let conversationId = route.surface === "chat" ? route.sessionId : null;

      if (!conversationId) {
        const conversation = await createConversation(question.slice(0, 80));
        conversationId = conversation.conversation_id;
        skipNextHydrationRef.current = conversationId;
        navigate(createChatRoute(conversationId));
      }

      chat.submitQuestion(question, conversationId);
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
          onSubmit={submitQuestion}
          onSpecificationChange={chat.updateSpecification}
          onSpecificationRevise={chat.reviseSpecification}
          onResetSpecification={chat.resetSpecification}
          onApproveAndRun={chat.approveAndRun}
          onRetryProcess={chat.retryProcess}
          onCloseEvidence={chat.closeEvidence}
          onData={openData}
        />
      ) : route.surface === "data" && route.page === "ingestion" ? (
        <IngestionPage onBack={openData} backLabel="Back to data" />
      ) : route.surface === "data" ? (
        <DataPage onCreateIngestion={openDataIngestion} />
      ) : (
        <ReportsPage onData={openData} />
      )}
    </AppShell>
  );
}
