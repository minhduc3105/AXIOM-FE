import {
  BotIcon,
  BrainIcon,
  Building2Icon,
  DatabaseIcon,
  FileTextIcon,
  MessageSquareIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightOpenIcon,
  SettingsIcon,
  SunIcon,
  WrenchIcon,
} from "lucide-react";
import { useTheme } from "@/app/ThemeProvider";
import type { ReactNode } from "react";
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
  navigationOpen: boolean;
  onNavigationToggle: () => void;
  showNavigationToggle?: boolean;
  showInspectorToggle?: boolean;
  onInspectorOpen?: () => void;
  scope: AppScopeContext | null;
  workspaces: AssignedWorkspace[];
  selectedWorkspace: AssignedWorkspace | null;
  workspacesLoading: boolean;
  onWorkspaceSelect: (workspaceId: string) => void;
  chatControls?: ReactNode;
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
  navigationOpen,
  onNavigationToggle,
  showNavigationToggle = false,
  showInspectorToggle = false,
  onInspectorOpen,
  scope,
  workspaces,
  selectedWorkspace,
  workspacesLoading,
  onWorkspaceSelect,
  chatControls,
}: AppTopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const pageContext = getPageContext(route);
  const PageIcon = pageContext.icon;
  const isChat = route.surface === "chat";
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const themeLabel = `Use ${nextTheme} theme`;
  const navigationLabel = navigationOpen
    ? "Close workspace navigation"
    : "Open workspace navigation";

  return (
    <header
      className="sticky top-0 z-30 h-16 shrink-0 bg-background text-foreground"
      aria-label="Application toolbar"
    >
      <div
        className={cn(
          "grid h-full min-w-0 items-center gap-2 px-3 py-2 md:px-6",
          showNavigationToggle
            ? "grid-cols-[auto_minmax(0,1fr)_auto]"
            : "grid-cols-[minmax(0,1fr)_auto]",
        )}
      >
        {showNavigationToggle && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 md:hidden"
                  aria-label={navigationLabel}
                  aria-expanded={navigationOpen}
                  onClick={onNavigationToggle}
                />
              }
            >
              {navigationOpen ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
            </TooltipTrigger>
            <TooltipContent>{navigationLabel}</TooltipContent>
          </Tooltip>
        )}

        <div
          className="min-w-0"
          role={isChat ? "group" : undefined}
          aria-label={isChat ? "Chat controls" : undefined}
        >
          {isChat ? (
            chatControls
          ) : (
            <div className="flex min-w-0 items-start gap-1">
              <span className="grid size-9 shrink-0 place-items-center rounded-md text-primary">
                <PageIcon className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-2xl font-semibold leading-6">
                  {pageContext.title}
                </p>
                <p className="hidden truncate text-sm leading-5 text-muted-foreground md:block">
                  {pageContext.description}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-self-end gap-2">
          <div className="hidden min-w-0 sm:flex">
            <AppScopeBar
              scope={scope}
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              workspacesLoading={workspacesLoading}
              onWorkspaceSelect={onWorkspaceSelect}
            />
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 text-foreground"
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
          {showInspectorToggle && onInspectorOpen && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0 text-foreground"
                    aria-label="Open Logs & Files"
                    aria-controls="process-inspector"
                    aria-expanded={false}
                    onClick={onInspectorOpen}
                  />
                }
              >
                <PanelRightOpenIcon />
              </TooltipTrigger>
              <TooltipContent>Open Logs &amp; Files</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}
