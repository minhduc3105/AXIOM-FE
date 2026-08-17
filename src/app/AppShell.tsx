import { useState } from "react";
import type { ChatStage } from "@/features/chat/model/types";
import type { AuthUser } from "@/features/auth/model/types";
import type { AppSurface } from "@/app/routing/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceCommandBar } from "@/shared/components/WorkspaceCommandBar";
import { WorkspaceRail } from "@/shared/components/WorkspaceRail";
import { AppScopeBar } from "@/shared/components/AppScopeBar";
import { cn } from "@/shared/lib/utils";
import type { AppScopeContext } from "@/shared/types/appScope";

type AppShellProps = {
  activeStage: ChatStage;
  surface: AppSurface;
  activeConversationId: string | null;
  onHome: () => void;
  onNewChat: () => void;
  onConversationOpen: (conversationId: string) => void;
  onData: () => void;
  onReports: () => void;
  onMemory: () => void;
  onModels: () => void;
  showCommandBar?: boolean;
  onTools: () => void;
  onSettings: () => void;
  onOrganizationAdministration: () => void;
  user: AuthUser | null;
  scope: AppScopeContext | null;
  onLogout: () => void;
  children: React.ReactNode;
};

export function AppShell({
  activeStage,
  surface,
  activeConversationId,
  onHome,
  onNewChat,
  onConversationOpen,
  onData,
  onReports,
  onMemory,
  onModels,
  showCommandBar = false,
  onTools,
  onSettings,
  onOrganizationAdministration,
  user,
  scope,
  onLogout,
  children,
}: AppShellProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TooltipProvider>
      <main
        className="relative isolate min-h-screen w-full max-w-full overflow-x-hidden bg-[#f4efe5] text-[#191915] dark:bg-[#11110f] dark:text-[#eee8dc]"
        data-rail-expanded={expanded}
      >
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_78%_8%,rgba(36,86,232,0.18),transparent_32%),radial-gradient(circle_at_12%_74%,rgba(120,75,18,0.14),transparent_34%),linear-gradient(135deg,#f4efe5,#fffaf0)] dark:bg-[radial-gradient(circle_at_76%_10%,rgba(120,149,255,0.16),transparent_34%),linear-gradient(135deg,#11110f,#1a1a17)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(25,25,21,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(25,25,21,0.035)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(circle_at_50%_18%,black,transparent_72%)]"
          aria-hidden="true"
        />
        <WorkspaceRail
          activeStage={activeStage}
          surface={surface}
          expanded={expanded}
          activeConversationId={activeConversationId}
          onExpandedChange={setExpanded}
          onHome={onHome}
          onNewChat={onNewChat}
          onConversationOpen={onConversationOpen}
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
          className={cn(
            "relative z-10 min-h-screen min-w-0 transition-[margin-left] duration-500 ease-out md:ml-[76px]",
            expanded && "md:ml-[304px]",
          )}
        >
          <AppScopeBar scope={scope} />
          {showCommandBar && (
            <WorkspaceCommandBar
              onHome={onHome}
              onNewChat={onNewChat}
              onData={onData}
              onReports={onReports}
            />
          )}
          {children}
        </div>
      </main>
    </TooltipProvider>
  );
}
