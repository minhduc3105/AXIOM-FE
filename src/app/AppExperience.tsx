import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPage } from "@/features/chat/ChatPage";
import { useChatWorkflow } from "@/features/chat/model/useChatWorkflow";
import { IngestionPage } from "@/features/ingestion/IngestionPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { AppShell } from "./AppShell";
import {
  createChatRoute,
  createIngestionRoute,
  createReportsRoute,
  parseAppRoute,
} from "./routing/paths";
import { useAppRoute } from "./routing/useAppRoute";
import { createConversation } from "@/shared/lib/intelligence-api";

export function AppExperience() {
  const { route, navigate } = useAppRoute();
  const [lastChatSessionId, setLastChatSessionId] = useState<string | null>(
    () => {
      const initialRoute = parseAppRoute(window.location.pathname);
      return initialRoute.surface === "chat" ? initialRoute.sessionId : null;
    },
  );
  const chat = useChatWorkflow();
  const hydratedConversationIdRef = useRef<string | null>(null);
  const skipNextHydrationRef = useRef<string | null>(null);

  useEffect(() => {
    if (route.surface === "chat") {
      setLastChatSessionId(route.sessionId);
    }
  }, [route]);

  useEffect(() => {
    if (route.surface !== "chat" || !route.sessionId) {
      hydratedConversationIdRef.current = null;
      return;
    }

    if (skipNextHydrationRef.current === route.sessionId) {
      hydratedConversationIdRef.current = route.sessionId;
      skipNextHydrationRef.current = null;
      return;
    }

    if (hydratedConversationIdRef.current === route.sessionId) return;

    hydratedConversationIdRef.current = route.sessionId;
    chat.loadConversation(route.sessionId);
  }, [chat.loadConversation, route.sessionId, route.surface]);

  const newChat = useCallback(() => {
    chat.newChat();
    navigate(createChatRoute());
  }, [chat.newChat, navigate]);

  const openIngestion = useCallback(() => {
    navigate(createIngestionRoute());
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
        hydratedConversationIdRef.current = conversationId;
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
      onNewChat={newChat}
      onConversationOpen={openConversation}
      onIngestion={openIngestion}
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
          onSubmit={submitQuestion}
          onSpecificationChange={chat.updateSpecification}
          onSpecificationRevise={chat.reviseSpecification}
          onResetSpecification={chat.resetSpecification}
          onApproveAndRun={chat.approveAndRun}
          onRetryProcess={chat.retryProcess}
          onCloseEvidence={chat.closeEvidence}
          onIngestion={openIngestion}
        />
      ) : route.surface === "ingestion" ? (
        <IngestionPage
          onBack={() => navigate(createChatRoute(lastChatSessionId))}
        />
      ) : (
        <ReportsPage onIngestion={openIngestion} />
      )}
    </AppShell>
  );
}
