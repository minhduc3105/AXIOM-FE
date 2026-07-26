import { useCallback, useEffect, useState } from "react";
import { ChatPage } from "@/features/chat/ChatPage";
import { useChatWorkflow } from "@/features/chat/model/useChatWorkflow";
import { DataPage } from "@/features/data/DataPage";
import { IngestionPage } from "@/features/ingestion/IngestionPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ToolDetailPage } from "@/features/tools/ToolDetailPage";
import { ToolsPage } from "@/features/tools/ToolsPage";
import { AppShell } from "./AppShell";
import {
  createChatRoute,
  createDataIngestionRoute,
  createDataRoute,
  createReportsRoute,
  createToolDetailRoute,
  createToolsRoute,
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

  const openData = useCallback(() => {
    navigate(createDataRoute());
  }, [navigate]);

  const openDataIngestion = useCallback(() => {
    navigate(createDataIngestionRoute());
  }, [navigate]);

  const openReports = useCallback(() => {
    navigate(createReportsRoute());
  }, [navigate]);

  const openTools = useCallback(() => {
    navigate(createToolsRoute());
  }, [navigate]);

  const openToolDetail = useCallback(
    (toolName: string) => {
      navigate(createToolDetailRoute(toolName));
    },
    [navigate],
  );

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
      onData={openData}
      onReports={openReports}
      onTools={openTools}
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
          onData={openData}
        />
      ) : route.surface === "data" && route.page === "ingestion" ? (
        <IngestionPage onBack={openData} backLabel="Back to data" />
      ) : route.surface === "data" ? (
        <DataPage onCreateIngestion={openDataIngestion} />
      ) : route.surface === "reports" ? (
        <ReportsPage onData={openData} />
      ) : route.page === "detail" && route.toolName ? (
        <ToolDetailPage toolName={route.toolName} onBack={openTools} />
      ) : (
        <ToolsPage onOpenTool={openToolDetail} />
      )}
    </AppShell>
  );
}
