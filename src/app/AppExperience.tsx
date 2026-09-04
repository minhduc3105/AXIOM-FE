import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPage } from "@/features/chat/ChatPage";
import { ChatModelReasoningSelector } from "@/features/chat/components/ChatModelReasoningSelector";
import { toChatModelOptions } from "@/features/chat/model/chatModelOptions";
import { useChatWorkflow } from "@/features/chat/model/useChatWorkflow";
import { useProcessInspector } from "@/features/chat/model/useProcessInspector";
import { useChatDataScope } from "@/features/chat/model/useChatDataScope";
import { DataPage } from "@/features/data/DataPage";
import { GlobalIngestionDock } from "@/features/ingestion/components/GlobalIngestionDock";
import { IngestionDocumentPage } from "@/features/ingestion/components/IngestionDocumentPage";
import { IngestionDialog } from "@/features/ingestion/components/IngestionDialog";
import {
  GlobalIngestionProvider,
  useGlobalIngestion,
} from "@/features/ingestion/model/GlobalIngestionProvider";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ToolDetailPage } from "@/features/tools/ToolDetailPage";
import { ToolsPage } from "@/features/tools/ToolsPage";
import { SkillDetailPage } from "@/features/skills/SkillDetailPage";
import { SkillsPage } from "@/features/skills/SkillsPage";
import {
  defaultToolCatalogViewState,
  type ToolCatalogViewState,
} from "@/features/tools/model/types";
import {
  defaultSkillCatalogViewState,
  type SkillCatalogViewState,
} from "@/features/skills/model/types";
import { useModelRegistry } from "@/features/models/model/useModelRegistry";
import { ModelsPage } from "@/features/models/ModelsPage";
import { MemoryPage } from "@/features/memory/MemoryPage";
import { OrganizationUsersPage } from "@/features/auth/components/OrganizationUsersPage";
import { SettingsPage } from "@/features/auth/components/SettingsPage";
import { ChangePasswordPage } from "@/features/auth/components/ChangePasswordPage";
import { useAuth } from "@/features/auth/model/AuthProvider";
import { AppShell } from "./AppShell";
import {
  createChatRoute,
  createDataDocumentRoute,
  createDataRoute,
  createModelsRoute,
  createReportsRoute,
  createMemoryRoute,
  createOrganizationRoute,
  createSettingsRoute,
  createToolDetailRoute,
  createToolsRoute,
  createSkillDetailRoute,
  createSkillsRoute,
} from "./routing/paths";
import type { AppRoute } from "./routing/types";
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
import type { DataFile } from "@/features/data/model/types";
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
  const chatDataScope = useChatDataScope(
    auth.user?.organization_id ?? "",
    dataWorkspace.selectedWorkspace?.id ?? "",
  );
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
  const [chatExecutionMode, setChatExecutionMode] = useState<ChatExecutionMode>(
    DEFAULT_CHAT_EXECUTION_MODE,
  );
  const [selectedModelAlias, setSelectedModelAlias] = useState<string | null>(
    null,
  );
  const [focusComposerRequest, setFocusComposerRequest] = useState(0);
  const [toolsViewState, setToolsViewState] = useState<ToolCatalogViewState>(
    defaultToolCatalogViewState,
  );
  const [skillsViewState, setSkillsViewState] = useState<SkillCatalogViewState>(
    defaultSkillCatalogViewState,
  );
  const processInspector = useProcessInspector(
    chat.history,
    chat.processEvents,
  );
  const skipNextHydrationRef = useRef<string | null>(null);
  const llmModelOptions: ChatModelOption[] = useMemo(
    () =>
      toChatModelOptions(
        Object.values(llmRegistry.modelsByProvider)
          .flat()
          .filter((model) => model.capability === "llm")
          .map((model) => ({
            id: model.resource_id,
            alias: model.resource_id,
            label: model.name || model.model_id,
            status: model.status,
          })),
      ),
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

  useEffect(() => {
    if (
      route.surface === "chat" &&
      route.page === "compose" &&
      chat.activeConversationId &&
      chat.stage !== "welcome"
    ) {
      if (skipNextHydrationRef.current === chat.activeConversationId) return;
      chat.newChat();
    }
  }, [
    chat.activeConversationId,
    chat.newChat,
    chat.stage,
    route.surface === "chat" ? route.page : null,
    route.sessionId,
    route.surface,
  ]);

  const newChat = useCallback(() => {
    setFocusComposerRequest((current) => current + 1);
    chat.newChat();
    navigate(createChatRoute());
  }, [chat.newChat, navigate]);

  const openData = useCallback(() => {
    navigate(createDataRoute());
  }, [navigate]);
  const isDataDocumentRoute =
    route.surface === "data" && route.page === "document";

  const selectWorkspace = useCallback(
    (nextWorkspaceId: string) => {
      const selectedWorkspaceId = dataWorkspace.selectedWorkspace?.id;
      const workspaceIsAssigned = dataWorkspace.workspaces.some(
        (workspace) => workspace.id === nextWorkspaceId,
      );
      if (!workspaceIsAssigned) return;

      dataWorkspace.selectWorkspace(nextWorkspaceId);
      if (selectedWorkspaceId !== nextWorkspaceId && isDataDocumentRoute) {
        navigate(createDataRoute());
      }
    },
    [
      dataWorkspace.selectWorkspace,
      dataWorkspace.selectedWorkspace?.id,
      dataWorkspace.workspaces,
      isDataDocumentRoute,
      navigate,
    ],
  );

  const openIngestionDocument = useCallback(
    (jobId: string, objectKey: string) => {
      const job = ingestion.jobs.find((candidate) => candidate.id === jobId);
      const object = job?.objects.find(
        (candidate) => candidate.key === objectKey,
      );
      if (!job?.batch || !object) return;

      const file = job.batch.files.find(
        (candidate) => candidate.key === objectKey,
      );
      navigate(
        createDataDocumentRoute({
          objectKey,
          bucket: job.batch.bucket,
          filename: file?.filename ?? object.name,
          documentId: object.documentId,
          sourceLabel: job.source === "s3" ? "Amazon S3" : "Uploaded files",
        }),
      );
    },
    [ingestion.jobs, navigate],
  );

  const openDataDocument = useCallback(
    (file: DataFile, sourceLabel: string) => {
      navigate(
        createDataDocumentRoute({
          objectKey: file.key,
          bucket: file.bucket,
          filename: file.name,
          documentId: file.documentId,
          sourceLabel,
        }),
      );
    },
    [navigate],
  );

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

  const openSkills = useCallback(() => {
    navigate(createSkillsRoute());
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

  const openChangePassword = useCallback(() => {
    navigate(createSettingsRoute("password"));
  }, [navigate]);

  const openToolDetail = useCallback(
    (toolName: string, returnViewState: ToolCatalogViewState) => {
      setToolsViewState(returnViewState);
      navigate(createToolDetailRoute(toolName));
    },
    [navigate],
  );

  const openSkillDetail = useCallback(
    (skillId: string, returnViewState: SkillCatalogViewState) => {
      setSkillsViewState(returnViewState);
      navigate(createSkillDetailRoute(skillId));
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

  const selectProcessEvent = useCallback(
    (...args: Parameters<typeof processInspector.selectProcessEvent>) => {
      processInspector.selectProcessEvent(...args);
    },
    [processInspector],
  );

  const submitQuestion = useCallback(
    (question: string, engine: ChatEngine, files: File[] = []) => {
      void chat.submitQuestion({
        question,
        engine,
        files,
        conversationId: route.surface === "chat" ? route.sessionId : null,
        organizationId: auth.user?.organization_id,
        workspaceId: dataWorkspace.selectedWorkspace?.id,
        modelAlias: selectedModelAlias,
        dataScope: chatDataScope.scope,
        executionMode: chatExecutionMode,
        onConversationCreated: (conversationId) => {
          skipNextHydrationRef.current = conversationId;
          navigate(createChatRoute(conversationId));
        },
      });
    },
    [
      auth.user?.organization_id,
      chat.submitQuestion,
      chatDataScope.scope,
      chatExecutionMode,
      dataWorkspace.selectedWorkspace?.id,
      navigate,
      route,
      selectedModelAlias,
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
        onNewChat={newChat}
        onConversationOpen={openConversation}
        onConversationDeleted={handleConversationDeleted}
        onData={openData}
        onReports={openReports}
        onMemory={openMemory}
        onModels={openModels}
        onTools={openTools}
        onSkills={openSkills}
        onSettings={openSettings}
        onOrganizationAdministration={openOrganizationAdministration}
        user={user}
        scope={scope}
        workspaces={dataWorkspace.workspaces}
        selectedWorkspace={dataWorkspace.selectedWorkspace}
        workspacesLoading={dataWorkspace.loading}
        onWorkspaceSelect={selectWorkspace}
        onLogout={auth.logout}
        chatControls={
          route.surface === "chat" ? (
            <ChatModelReasoningSelector
              models={llmModelOptions}
              selectedModelAlias={selectedModelAlias}
              executionMode={chatExecutionMode}
              onModelChange={setSelectedModelAlias}
              onExecutionModeChange={setChatExecutionMode}
            />
          ) : undefined
        }
      >
        {route.surface === "chat" ? (
          <ChatPage
            stage={chat.stage}
            evidenceOpen={chat.evidenceOpen}
            investigation={chat.investigation}
            draft={chat.draft}
            processEvents={chat.processEvents}
            transcript={chat.transcript}
            result={chat.result}
            history={chat.history}
            error={chat.error}
            historyLoading={chat.historyLoading}
            loading={chat.loading}
            canRetry={chat.canRetry}
            activeProcessEventKey={processInspector.activeProcessEventKey}
            onProcessEventSelect={selectProcessEvent}
            engine={chatEngine}
            focusComposerRequest={focusComposerRequest}
            onSubmit={submitQuestion}
            onEngineChange={changeChatEngine}
            onSpecificationChange={chat.updateSpecification}
            onSpecificationRevise={chat.reviseSpecification}
            onResetSpecification={chat.resetSpecification}
            onApproveAndRun={chat.approveAndRun}
            onRetryProcess={chat.retryProcess}
            onCloseEvidence={chat.closeEvidence}
            onStopGeneration={chat.stopGeneration}
            workspaceId={dataWorkspace.selectedWorkspace?.id ?? ""}
            dataScope={chatDataScope.scope}
            dataResources={chatDataScope.resources}
            dataResourcesLoading={chatDataScope.loading}
            dataResourcesError={chatDataScope.error}
            onDataScopeChange={chatDataScope.changeScope}
            onDataResourcesRefresh={chatDataScope.refresh}
          />
        ) : route.surface === "data" ? (
          route.page === "document" ? (
            <IngestionDocumentPage
              objectKey={route.objectKey}
              bucket={route.bucket}
              filename={route.filename}
              documentId={route.documentId}
              sourceLabel={route.sourceLabel}
              onBack={openData}
            />
          ) : (
            <DataPage
              organizationId={user.organization_id}
              selectedDatasourceId={route.sourceId}
              onSelectedDatasourceChange={(datasourceId) =>
                navigate(createDataRoute(datasourceId))
              }
              onCreateIngestion={openDataIngestion}
              onOpenDocument={openDataDocument}
              ingestionControl={
                <GlobalIngestionDock onOpenDetails={openIngestionDocument} />
              }
            />
          )
        ) : route.surface === "reports" ? (
          <ReportsPage
            organizationId={user.organization_id}
            workspaceId={dataWorkspace.selectedWorkspace?.id ?? null}
          />
        ) : route.surface === "memory" ? (
          <MemoryPage />
        ) : route.surface === "models" ? (
          <ModelsPage />
        ) : route.surface === "settings" ? (
          route.page === "password" ? (
            <ChangePasswordPage onBack={openSettings} />
          ) : (
            <SettingsPage onChangePassword={openChangePassword} />
          )
        ) : route.surface === "organization" ? (
          <OrganizationUsersPage
            initialTab={route.tab}
            onBack={newChat}
            organizationName={scope?.organization.name ?? user.organization_id}
          />
        ) : route.surface === "skills" ? (
          route.page === "detail" && route.skillId ? (
            <SkillDetailPage
              skillId={route.skillId}
              workspaceId={dataWorkspace.selectedWorkspace?.id ?? null}
              onBack={openSkills}
            />
          ) : (
            <SkillsPage
              workspaceId={dataWorkspace.selectedWorkspace?.id ?? null}
              onOpenSkill={openSkillDetail}
              viewState={skillsViewState}
              onViewStateChange={setSkillsViewState}
            />
          )
        ) : route.page === "detail" && route.toolName ? (
          <ToolDetailPage
            toolName={route.toolName}
            onBack={openTools}
            availabilityScope={{
              organizationName:
                scope?.organization.name ?? user.organization_id,
              workspaceName: scope?.workspace?.name ?? "All workspaces",
            }}
          />
        ) : (
          <ToolsPage
            onOpenTool={openToolDetail}
            viewState={toolsViewState}
            onViewStateChange={setToolsViewState}
            availabilityScope={{
              organizationName:
                scope?.organization.name ?? user.organization_id,
              workspaceName: scope?.workspace?.name ?? "All workspaces",
            }}
          />
        )}
      </AppShell>
      <IngestionDialog />
    </>
  );
}
