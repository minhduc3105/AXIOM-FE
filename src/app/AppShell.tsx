import { useState, type ReactNode } from "react";
import type { ChatStage } from "@/features/chat/model/types";
import type { AuthUser } from "@/features/auth/model/types";
import type { AppRoute, AppSurface } from "@/app/routing/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppTopBar } from "@/layout/AppTopBar";
import { WorkspaceRail } from "@/shared/components/WorkspaceRail";
import { cn } from "@/shared/lib/utils";
import type { AppScopeContext } from "@/shared/types/appScope";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";

type AppShellProps = {
  route: AppRoute;
  activeStage: ChatStage;
  surface: AppSurface;
  activeConversationId: string | null;
  processInspectorOpen: boolean;
  showInspectorToggle: boolean;
  onInspectorOpen: () => void;
  onNewChat: () => void;
  onConversationOpen: (conversationId: string) => void;
  onConversationDeleted: (conversationId: string) => void;
  onData: () => void;
  onReports: () => void;
  onMemory: () => void;
  onModels: () => void;
  onTools: () => void;
  onSettings: () => void;
  onOrganizationAdministration: () => void;
  user: AuthUser | null;
  scope: AppScopeContext | null;
  workspaces: AssignedWorkspace[];
  selectedWorkspace: AssignedWorkspace | null;
  workspacesLoading: boolean;
  onWorkspaceSelect: (workspaceId: string) => void;
  onLogout: () => void;
  chatControls?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  route,
  activeStage,
  surface,
  activeConversationId,
  processInspectorOpen,
  showInspectorToggle,
  onInspectorOpen,
  onNewChat,
  onConversationOpen,
  onConversationDeleted,
  onData,
  onReports,
  onMemory,
  onModels,
  onTools,
  onSettings,
  onOrganizationAdministration,
  user,
  scope,
  workspaces,
  selectedWorkspace,
  workspacesLoading,
  onWorkspaceSelect,
  onLogout,
  chatControls,
  children,
}: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <TooltipProvider>
      <main
        className={cn(
          "grid min-h-dvh w-full max-w-full grid-cols-1 overflow-x-clip bg-background text-foreground transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none md:grid-cols-[56px_minmax(0,1fr)]",
          navigationOpen && "xl:grid-cols-[260px_minmax(0,1fr)]",
        )}
        data-rail-expanded={navigationOpen}
      >
        <WorkspaceRail
          activeStage={activeStage}
          surface={surface}
          expanded={navigationOpen}
          activeConversationId={activeConversationId}
          onExpandedChange={setNavigationOpen}
          onNewChat={onNewChat}
          onConversationOpen={onConversationOpen}
          onConversationDeleted={onConversationDeleted}
          onData={onData}
          onReports={onReports}
          onMemory={onMemory}
          onModels={onModels}
          onTools={onTools}
          onSettings={onSettings}
          onOrganizationAdministration={onOrganizationAdministration}
          user={user}
          onLogout={onLogout}
        />
        <div
          className="relative z-10 flex min-h-dvh min-w-0 flex-col [--app-top-bar-height:4rem]"
        >
          <AppTopBar
            route={route}
            navigationOpen={navigationOpen}
            onNavigationToggle={() => setNavigationOpen((open) => !open)}
            showNavigationToggle
            showInspectorToggle={showInspectorToggle && !processInspectorOpen}
            onInspectorOpen={onInspectorOpen}
            scope={scope}
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            workspacesLoading={workspacesLoading}
            onWorkspaceSelect={onWorkspaceSelect}
            chatControls={chatControls}
          />
          <div className="min-h-[calc(100dvh-var(--app-top-bar-height))] min-w-0 flex-1">
            {children}
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
