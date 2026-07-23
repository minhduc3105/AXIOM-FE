import { useCallback, useEffect, useState } from "react";
import { ChatPage } from "@/features/chat/ChatPage";
import { useChatWorkflow } from "@/features/chat/model/useChatWorkflow";
import { IngestionPage } from "@/features/ingestion/IngestionPage";
import { AppShell } from "./AppShell";
import {
  createChatRoute,
  createIngestionRoute,
  parseAppRoute,
} from "./routing/paths";
import { useAppRoute } from "./routing/useAppRoute";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppExperience() {
  const { route, navigate } = useAppRoute();
  const [lastChatSessionId, setLastChatSessionId] = useState<string | null>(
    () => {
      const initialRoute = parseAppRoute(window.location.pathname);
      return initialRoute.surface === "chat" ? initialRoute.sessionId : null;
    },
  );
  const chat = useChatWorkflow();

  useEffect(() => {
    if (route.surface === "chat") {
      setLastChatSessionId(route.sessionId);
    }
  }, [route]);

  const newChat = useCallback(() => {
    chat.newChat();
    navigate(createChatRoute());
  }, [chat.newChat, navigate]);

  const openIngestion = useCallback(() => {
    navigate(createIngestionRoute());
  }, [navigate]);

  const submitQuestion = useCallback(
    (question: string) => {
      if (route.surface === "chat" && !route.sessionId) {
        navigate(createChatRoute(createSessionId()));
      }
      chat.submitQuestion(question);
    },
    [chat.submitQuestion, navigate, route],
  );

  return (
    <AppShell
      activeStage={chat.stage}
      surface={route.surface}
      onNewChat={newChat}
      onIngestion={openIngestion}
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
          onSubmit={submitQuestion}
          onSpecificationChange={chat.updateSpecification}
          onResetSpecification={chat.resetSpecification}
          onApproveAndRun={chat.approveAndRun}
          onRetryProcess={chat.retryProcess}
          onCloseEvidence={chat.closeEvidence}
          onIngestion={openIngestion}
        />
      ) : (
        <IngestionPage
          onBack={() => navigate(createChatRoute(lastChatSessionId))}
        />
      )}
    </AppShell>
  );
}
