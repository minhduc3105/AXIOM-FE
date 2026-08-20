import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPage } from "@/features/chat/ChatPage";
import { useChatWorkflow } from "@/features/chat/model/useChatWorkflow";
import { DataPage } from "@/features/data/DataPage";
import { GlobalIngestionDock } from "@/features/ingestion/components/GlobalIngestionDock";
import { IngestionDialog } from "@/features/ingestion/components/IngestionDialog";
import {
  GlobalIngestionProvider,
  useGlobalIngestion,
} from "@/features/ingestion/model/GlobalIngestionProvider";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ToolDetailPage } from "@/features/tools/ToolDetailPage";
import { ToolsPage } from "@/features/tools/ToolsPage";
import {
  defaultToolCatalogViewState,
  type ToolCatalogViewState,
} from "@/features/tools/model/types";
import { useModelRegistry } from "@/features/models/model/useModelRegistry";
import { ModelsPage } from "@/features/models/ModelsPage";
import { MemoryPage } from "@/features/memory/MemoryPage";
import { OrganizationUsersPage } from "@/features/auth/components/OrganizationUsersPage";
import { SettingsPage } from "@/features/auth/components/SettingsPage";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { AppShell } from "./AppShell";
import {
  createChatHomeRoute,
  createChatRoute,
  createDataRoute,
  createModelsRoute,
  createReportsRoute,
  createMemoryRoute,
  createOrganizationRoute,
  createSettingsRoute,
  createToolDetailRoute,
  createToolsRoute,
} from "./routing/paths";
import type { AppRoute } from "./routing/types";
import { createConversation } from "@/shared/lib/intelligence-api";
import type {
  ChatEngine,
  ChatExecutionMode,
  ChatModelOption,
} from "@/features/chat/model/types";
import {
  DEFAULT_CHAT_ENGINE,
  DEFAULT_CHAT_EXECUTION_MODE,
  normalizeExecutionMode,
} from "@/features/chat/model/executionMode";
import { useAppScope } from "@/shared/hooks/use-app-scope";
import { useDataWorkspace } from "@/features/data/model/DataWorkspaceProvider";
import { getRouteWorkspaceScope } from "./scope";

type AppExperienceProps = {
  route: AppRoute;
  navigate: (nextRoute: AppRoute) => void;
};

export function AppExperience({ route, navigate }: AppExperienceProps) {
  const auth = useAuth();
  const dataWorkspace = useDataWorkspace();
  const user = auth.user;
  if (!user) return null;

  return (
    <GlobalIngestionProvider
      organizationId={user.organization_id}
      workspaceId={dataWorkspace.selectedWorkspace?.id ?? ""}
    >
      <AppExperienceContent route={route} navigate={navigate} />
    </GlobalIngestionProvider>
  );
}

function AppExperienceContent({ route, navigate }: AppExperienceProps) {
  const auth = useAuth();
  const chat = useChatWorkflow();
  const dataWorkspace = useDataWorkspace();
  const ingestion = useGlobalIngestion();
  const modelRegistryContext = useMemo(
    () =>
      auth.user
        ? {
            userId: auth.user.id,
            organizationId: auth.user.organization_id,
            orgRole: auth.user.org_role,
          }
        : null,
    [auth.user],
  );
  const llmRegistry = useModelRegistry(modelRegistryContext);
  const [chatEngine, setChatEngine] = useState<ChatEngine>(DEFAULT_CHAT_ENGINE);
  const [chatExecutionMode, setChatExecutionMode] =
    useState<ChatExecutionMode>(DEFAULT_CHAT_EXECUTION_MODE);
  const [selectedModelAlias, setSelectedModelAlias] = useState<string | null>(
    null,
  );
  const [toolsViewState, setToolsViewState] = useState<ToolCatalogViewState>(
    defaultToolCatalogViewState,
  );
  const skipNextHydrationRef = useRef<string | null>(null);
  const llmModelOptions: ChatModelOption[] = useMemo(
    () =>
      Object.values(llmRegistry.modelsByProvider)
        .flat()
        .filter((model) => model.capability === "llm")
        .map((model) => ({
          id: model.resource_id,
          alias: model.resource_id,
          label: model.name || model.model_id,
          status: model.status,
        })),
    [llmRegistry.modelsByProvider],
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

  const routeScope = getRouteWorkspaceScope(route);
  const showWorkspace = routeScope.showWorkspace;
  const workspaceId = routeScope.workspaceId;
  const scope = useAppScope({
    user: auth.user,
    accessToken: auth.accessToken,
    showWorkspace,
    workspaceId,
  });

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
    () => ingestion.openDialog(),
    [ingestion.openDialog],
  );

  const openReports = useCallback(() => {
    navigate(createReportsRoute());
  }, [navigate]);

  const openTools = useCallback(() => {
    navigate(createToolsRoute());
  }, [navigate]);

  const openMemory = useCallback(() => {
    navigate(createMemoryRoute());
  }, [navigate]);

  const openModels = useCallback(() => {
    navigate(createModelsRoute());
  }, [navigate]);

  const openOrganizationAdministration = useCallback(() => {
    navigate(createOrganizationRoute());
  }, [navigate]);

  const openSettings = useCallback(() => {
    navigate(createSettingsRoute());
  }, [navigate]);

  const openToolDetail = useCallback(
    (toolName: string, returnViewState: ToolCatalogViewState) => {
      setToolsViewState(returnViewState);
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

  const handleConversationDeleted = useCallback(
    (conversationId: string) => {
      if (route.surface !== "chat" || route.sessionId !== conversationId) {
        return;
      }
      chat.newChat();
      navigate(createChatRoute());
    },
    [chat.newChat, navigate, route.sessionId, route.surface],
  );

  const changeChatEngine = useCallback((engine: ChatEngine) => {
    setChatEngine(engine);
    setChatExecutionMode((mode) => normalizeExecutionMode(engine, mode));
  }, []);

  const submitQuestion = useCallback(
    async (
      question: string,
      engine: ChatEngine,
      files: File[] = [],
      modelAlias?: string | null,
      executionMode?: ChatExecutionMode,
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
        dataWorkspace.selectedWorkspace?.id,
        modelAlias,
        executionMode ?? chatExecutionMode,
      );
    },
    [
      auth.user?.organization_id,
      chat.submitQuestion,
      chatExecutionMode,
      dataWorkspace.selectedWorkspace?.id,
      navigate,
      route,
    ],
  );

  const user = auth.user;
  if (!user) return null;

  return (
    <>
      <AppShell
      route={route}
      activeStage={chat.stage}
      surface={route.surface}
      activeConversationId={route.surface === "chat" ? route.sessionId : null}
      showPrimaryNavigation={route.surface === "chat" && route.page === "home"}
      onHome={openHome}
      onNewChat={newChat}
      onConversationOpen={openConversation}
      onConversationDeleted={handleConversationDeleted}
      onData={openData}
      onReports={openReports}
      onMemory={openMemory}
      onModels={openModels}
      onTools={openTools}
      onSettings={openSettings}
      onOrganizationAdministration={openOrganizationAdministration}
      user={user}
      scope={scope}
      workspaces={dataWorkspace.workspaces}
      selectedWorkspace={dataWorkspace.selectedWorkspace}
      workspacesLoading={dataWorkspace.loading}
      onWorkspaceSelect={dataWorkspace.selectWorkspace}
      onLogout={auth.logout}
    >
        {route.surface === "chat" ? (
        <ChatPage
          conversationId={route.sessionId}
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
          executionMode={chatExecutionMode}
          models={llmModelOptions}
          selectedModelAlias={selectedModelAlias}
          onSubmit={submitQuestion}
          onEngineChange={changeChatEngine}
          onExecutionModeChange={setChatExecutionMode}
          onModelChange={setSelectedModelAlias}
          onSpecificationChange={chat.updateSpecification}
          onSpecificationRevise={chat.reviseSpecification}
          onResetSpecification={chat.resetSpecification}
          onApproveAndRun={chat.approveAndRun}
          onRetryProcess={chat.retryProcess}
          onCloseEvidence={chat.closeEvidence}
          onData={openData}
        />
      ) : route.surface === "data" ? (
        <DataPage
          organizationId={user.organization_id}
          onCreateIngestion={openDataIngestion}
        />
      ) : route.surface === "reports" ? (
        <ReportsPage
          onData={openData}
          workspaceId={dataWorkspace.selectedWorkspace?.id ?? null}
          workspaceName={dataWorkspace.selectedWorkspace?.name ?? null}
        />
      ) : route.surface === "memory" ? (
        <MemoryPage />
      ) : route.surface === "models" ? (
        <ModelsPage />
      ) : route.surface === "settings" ? (
        <SettingsPage />
      ) : route.surface === "organization" ? (
        <OrganizationUsersPage
          initialTab={route.tab}
          onBack={openHome}
          organizationName={scope?.organization.name ?? user.organization_id}
        />
      ) : route.page === "detail" && route.toolName ? (
        <ToolDetailPage
          toolName={route.toolName}
          onBack={openTools}
          availabilityScope={{
            organizationName: scope?.organization.name ?? user.organization_id,
            workspaceName: scope?.workspace?.name ?? "All workspaces",
          }}
        />
      ) : (
        <ToolsPage
          onOpenTool={openToolDetail}
          viewState={toolsViewState}
          onViewStateChange={setToolsViewState}
          availabilityScope={{
            organizationName: scope?.organization.name ?? user.organization_id,
            workspaceName: scope?.workspace?.name ?? "All workspaces",
          }}
        />
        )}
      </AppShell>
      <IngestionDialog />
      <GlobalIngestionDock />
    </>
  );
}
