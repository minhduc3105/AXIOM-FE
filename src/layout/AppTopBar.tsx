import {
  BotIcon,
  BrainIcon,
  Building2Icon,
  DatabaseIcon,
  FileTextIcon,
  MessageSquareIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  WrenchIcon,
} from "lucide-react";
import { useTheme } from "@/app/ThemeProvider";
import type { AppRoute } from "@/app/routing/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AssignedWorkspace } from "@/features/auth/api/authzApi";
import { AppScopeBar } from "@/shared/components/AppScopeBar";
import { cn } from "@/shared/lib/utils";
import type { AppScopeContext } from "@/shared/types/appScope";

type AppTopBarProps = {
  route: AppRoute;
  showPrimaryNavigation?: boolean;
  onHome: () => void;
  onNewChat: () => void;
  onData: () => void;
  onReports: () => void;
  scope: AppScopeContext | null;
  workspaces: AssignedWorkspace[];
  selectedWorkspace: AssignedWorkspace | null;
  workspacesLoading: boolean;
  onWorkspaceSelect: (workspaceId: string) => void;
};

function getPageContext(route: AppRoute) {
  switch (route.surface) {
    case "data":
      return {
        icon: DatabaseIcon,
        title: "Data Management",
        description: "Monitor file inventory and processing health.",
      };
    case "reports":
      return {
        icon: FileTextIcon,
        title: "Reports",
        description: "Create and review workspace reports.",
      };
    case "tools":
      return {
        icon: WrenchIcon,
        title:
          route.page === "detail" && route.toolName ? route.toolName : "Tools",
        description:
          route.page === "detail"
            ? "Configure and run this workspace tool."
            : "Explore tools available to your workspace.",
      };
    case "memory":
      return {
        icon: BrainIcon,
        title: "Memory",
        description: "Capture and organize workspace knowledge.",
      };
    case "models":
      return {
        icon: BotIcon,
        title: "Models",
        description: "Manage models, providers, and assignments.",
      };
    case "settings":
      return {
        icon: SettingsIcon,
        title: "Settings",
        description: "Manage your account and preferences.",
      };
    case "organization":
      return {
        icon: Building2Icon,
        title: "Organization",
        description: "Manage members and workspaces.",
      };
    case "chat":
      return {
        icon: MessageSquareIcon,
        title: "Chat",
        description: "Ask questions and explore your workspace.",
      };
  }
}

export function AppTopBar({
  route,
  showPrimaryNavigation = false,
  onHome,
  onNewChat,
  onData,
  onReports,
  scope,
  workspaces,
  selectedWorkspace,
  workspacesLoading,
  onWorkspaceSelect,
}: AppTopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const pageContext = getPageContext(route);
  const PageIcon = pageContext.icon;
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const themeLabel = `Use ${nextTheme} theme`;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 shrink-0 text-foreground  md:h-14",
        showPrimaryNavigation && "h-28 md:h-14",
      )}
      aria-label="Application toolbar"
    >
      <div
        className={cn(
          "grid h-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-6 py-2 pl-16 md:px-6 xl:grid-cols-[1fr_auto_1fr]",
          showPrimaryNavigation &&
            "grid-rows-[40px_40px] py-2 md:grid-rows-1 md:py-0",
        )}
      >
        <div
          className={cn(
            "row-start-1 min-w-0 pr-24 md:col-start-1 md:pr-0",
            showPrimaryNavigation && "md:hidden xl:block",
          )}
        >
          <div className="flex min-w-0 items-center gap-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-md text-primary">
              <PageIcon className="size-6" />
            </span>
            <p className="truncate text-2xl font-semibold leading-6">
              {pageContext.title}
            </p>
          </div>
          <p className="hidden truncate text-sm leading-5 text-muted-foreground md:block">
            {pageContext.description}
          </p>
        </div>

        {showPrimaryNavigation && (
          <nav
            className="col-span-2 row-start-2 flex min-w-0 items-center gap-1 overflow-x-auto md:col-span-1 md:col-start-1 md:row-start-1 xl:col-start-2 xl:grid xl:w-80 xl:grid-cols-4 xl:gap-0 xl:overflow-visible"
            aria-label="Workspace sections"
          >
            <Button
              className="h-10 px-3 text-foreground xl:w-full"
              variant="ghost"
              onClick={onHome}
            >
              Homepage
            </Button>
            <Button
              className="h-10 px-3 text-foreground xl:w-full"
              variant="ghost"
              onClick={onNewChat}
            >
              Chat
            </Button>
            <Button
              className="h-10 px-3 text-foreground xl:w-full"
              variant="ghost"
              onClick={onData}
            >
              Data
            </Button>
            <Button
              className="h-10 px-3 text-foreground xl:w-full"
              variant="ghost"
              onClick={onReports}
            >
              Report
            </Button>
          </nav>
        )}

        <div className="row-start-1 flex min-w-0 items-center justify-self-end gap-2 md:col-start-2 xl:col-start-3">
          <AppScopeBar
            scope={scope}
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            workspacesLoading={workspacesLoading}
            onWorkspaceSelect={onWorkspaceSelect}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0 bg-card text-foreground"
                  aria-label={themeLabel}
                  onClick={() => setTheme(nextTheme)}
                />
              }
            >
              {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              {themeLabel}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
