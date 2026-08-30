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
  processInspectorOpen?: boolean;
  showInspectorToggle?: boolean;
  onInspectorOpen?: () => void;
  onNewChat: () => void;
  onConversationOpen: (conversationId: string) => void;
  onConversationDeleted: (conversationId: string) => void;
  onData: () => void;
  onReports: () => void;
  onMemory: () => void;
  onModels: () => void;
  onTools: () => void;
  onSkills: () => void;
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
  desktopInspector?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  route,
  activeStage,
  surface,
  activeConversationId,
  processInspectorOpen = false,
  showInspectorToggle = false,
  onInspectorOpen,
  onNewChat,
  onConversationOpen,
  onConversationDeleted,
  onData,
  onReports,
  onMemory,
  onModels,
  onTools,
  onSkills,
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
  desktopInspector,
  children,
}: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const managesOwnScroll = surface === "chat" || surface === "data";

  return (
    <TooltipProvider>
      <main
        className={cn(
          "grid h-dvh min-h-0 w-full max-w-full grid-cols-1 overflow-hidden bg-background text-foreground transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none md:grid-cols-[56px_minmax(0,1fr)]",
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
          onSkills={onSkills}
          onSettings={onSettings}
          onOrganizationAdministration={onOrganizationAdministration}
          user={user}
          onLogout={onLogout}
        />
        <div
          className={cn(
            "grid h-dvh min-h-0 min-w-0 overflow-hidden transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none",
            desktopInspector
              ? "xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]"
              : "grid-cols-1",
          )}
        >
          <div className="relative z-10 flex h-dvh min-h-0 min-w-0 flex-col [--app-top-bar-height:3.5rem]">
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
            <div
              data-testid="app-content-outlet"
              className={cn(
                "min-h-0 min-w-0 flex-1",
                managesOwnScroll ? "overflow-hidden" : "overflow-y-auto",
              )}
            >
              {children}
            </div>
          </div>
          {desktopInspector && (
            <aside
              id="process-inspector"
              className="h-dvh min-h-0 min-w-0 overflow-hidden border-l border-border bg-card"
              data-process-inspector
              aria-label="Process details"
            >
              {desktopInspector}
            </aside>
          )}
        </div>
      </main>
    </TooltipProvider>
  );
}
