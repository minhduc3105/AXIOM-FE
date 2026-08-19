import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/app/ThemeProvider";
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

export function AppTopBar({
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
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const themeLabel = `Use ${nextTheme} theme`;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 shrink-0 border-b border-border bg-background text-foreground md:h-14",
        showPrimaryNavigation && "h-28 md:h-14",
      )}
      aria-label="Application toolbar"
    >
      <div
        className={cn(
          "grid h-full min-w-0 grid-cols-1 items-center gap-2 px-3 pl-16 md:grid-cols-[minmax(0,1fr)_auto] md:px-4 xl:grid-cols-[1fr_auto_1fr]",
          showPrimaryNavigation && "grid-rows-[40px_40px] py-2 md:grid-rows-1 md:py-0",
        )}
      >
        {showPrimaryNavigation && (
          <nav
            className="row-start-2 flex min-w-0 items-center gap-1 overflow-x-auto md:col-start-1 md:row-start-1 xl:col-start-2 xl:grid xl:w-80 xl:grid-cols-4 xl:gap-0 xl:overflow-visible"
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
