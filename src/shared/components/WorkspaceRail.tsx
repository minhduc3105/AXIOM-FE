import {
  SettingsIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react";
import type { AuthUser } from "@/features/auth/model/types";
import type { ChatStage } from "@/features/chat/model/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WorkspaceNavigationTooltip } from "./workspace-rail/WorkspaceNavigationTooltip";
import type { AppSurface } from "@/app/routing/types";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { cn } from "@/shared/lib/utils";
import { WorkspacePrimaryNavigation } from "./workspace-rail/WorkspacePrimaryNavigation";
import { WorkspaceConversationList } from "./workspace-rail/WorkspaceConversationList";

type WorkspaceRailProps = {
  activeStage: ChatStage;
  surface: AppSurface;
  expanded: boolean;
  activeConversationId: string | null;
  onExpandedChange: (expanded: boolean) => void;
  onNewChat: () => void;
  onConversationOpen: (conversationId: string) => void;
  onConversationDeleted?: (conversationId: string) => void;
  onData: () => void;
  onReports: () => void;
  onMemory: () => void;
  onModels: () => void;
  onTools: () => void;
  onSkills: () => void;
  onSettings: () => void;
  onOrganizationAdministration: () => void;
  user: AuthUser | null;
  onLogout: () => void;
};

type RailContentProps = WorkspaceRailProps & {
  moreMenuSide?: "right" | "bottom";
};

function RailContent({
  activeStage,
  activeConversationId,
  surface,
  expanded,
  onExpandedChange,
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
  onLogout,
  moreMenuSide,
}: RailContentProps) {
  return (
    <div
      className={cn(
        "h-full min-h-0 text-sidebar-foreground",
        expanded
          ? "grid min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2 px-2 py-2"
          : "flex w-full flex-col items-center gap-1 px-2 py-2",
      )}
    >
      <div
        className={cn(
          "min-w-0",
          expanded
            ? "flex h-9 items-center justify-between gap-2"
            : "grid justify-items-center",
        )}
      >
        {expanded ? (
          <>
            <Button
              type="button"
              variant="ghost"
              className="h-9 min-w-0 justify-start gap-1.5 rounded-lg px-1 text-left hover:bg-transparent hover:text-inherit"
              onClick={onNewChat}
              aria-label="Start a new chat from AXIOM"
            >
              <img
                src="/assets/logo.png"
                alt=""
                className="size-6 shrink-0 object-contain"
                aria-hidden="true"
              />
              <span className="min-w-0 text-sm font-semibold tracking-[0.04em]">
                AXIOM
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-lg aria-expanded:bg-transparent aria-expanded:text-inherit dark:aria-expanded:bg-transparent"
              aria-label="Close workspace navigation"
              aria-expanded
              onClick={() => onExpandedChange(false)}
            >
              <PanelLeftCloseIcon className="size-[18px]" />
            </Button>
          </>
        ) : (
          <WorkspaceNavigationTooltip
            expanded={false}
            label="Open workspace navigation"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-lg"
              aria-label="Open workspace navigation"
              aria-expanded={false}
              onClick={() => onExpandedChange(true)}
            >
              <PanelLeftOpenIcon className="size-[18px]" />
            </Button>
          </WorkspaceNavigationTooltip>
        )}
      </div>

      <WorkspacePrimaryNavigation
        expanded={expanded}
        surface={surface}
        showOrganization={user?.org_role === "org_admin"}
        moreMenuSide={moreMenuSide}
        onNewChat={onNewChat}
        onData={onData}
        onReports={onReports}
        onMemory={onMemory}
        onModels={onModels}
        onTools={onTools}
        onSkills={onSkills}
        onOrganizationAdministration={onOrganizationAdministration}
      />

      <WorkspaceConversationList
        activeConversationId={activeConversationId}
        activeStage={activeStage}
        expanded={expanded}
        onConversationDeleted={onConversationDeleted}
        onConversationOpen={onConversationOpen}
      />

      <div
        className={cn(
          expanded ? "grid" : "mt-auto grid w-full justify-items-center",
        )}
      >
        <UserSessionMenu
          expanded={expanded}
          user={user}
          onSettings={onSettings}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}

function UserSessionMenu({
  expanded,
  user,
  onSettings,
  onLogout,
}: {
  expanded: boolean;
  user: AuthUser | null;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const label = user?.display_name || user?.email || "AXIOM user";
  const initials = userInitials(user);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-9 min-w-0 cursor-pointer rounded-lg p-0.5 text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground",
              expanded
                ? "w-full justify-start gap-2"
                : "size-9 justify-center p-0",
            )}
            aria-label="Open user session menu"
          />
        }
      >
        <Avatar>
          <AvatarImage src="" alt="" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "min-w-0 leading-tight transition-opacity duration-300",
            expanded ? "grid opacity-100" : "hidden",
          )}
        >
          <strong className="truncate text-sm">{label}</strong>
          <span className="truncate text-xs text-muted-foreground">
            {user?.org_role || "org_member"}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          "border-border bg-popover text-popover-foreground shadow-sm",
          expanded
            ? "max-w-[calc(100vw-1rem)]"
            : "w-64 max-w-[calc(100vw-1rem)]",
        )}
        side={expanded ? "top" : "right"}
        align="start"
        sideOffset={8}
      >
        <div className="grid gap-1 px-2 py-2">
          <span className="truncate text-sm font-semibold text-popover-foreground">
            {label}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user?.email}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground/80">
            Org: {user?.organization_id || "unknown"}
          </span>
        </div>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="cursor-pointer gap-2 px-2 py-2"
          onClick={onSettings}
        >
          <SettingsIcon className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 px-2 py-2"
          onClick={() => void onLogout()}
          variant="destructive"
        >
          <LogOutIcon className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function userInitials(user: AuthUser | null) {
  const source = user?.display_name || user?.email || "AXIOM";
  const words = source
    .replace(/@.*/, "")
    .split(/\s+|[._-]+/)
    .filter(Boolean);
  return (
    words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "AX"
  );
}

export function WorkspaceRail(props: WorkspaceRailProps) {
  const compactViewport = useMediaQuery("(max-width: 1279px)");
  const mobile = useMediaQuery("(max-width: 767px)");
  const closeOverlay = () => props.onExpandedChange(false);
  const overlayContent = (
    <RailContent
      {...props}
      expanded
      moreMenuSide="bottom"
      onNewChat={() => {
        props.onNewChat();
        closeOverlay();
      }}
      onConversationOpen={(conversationId) => {
        props.onConversationOpen(conversationId);
        closeOverlay();
      }}
      onData={() => {
        props.onData();
        closeOverlay();
      }}
      onReports={() => {
        props.onReports();
        closeOverlay();
      }}
      onMemory={() => {
        props.onMemory();
        closeOverlay();
      }}
      onModels={() => {
        props.onModels();
        closeOverlay();
      }}
      onTools={() => {
        props.onTools();
        closeOverlay();
      }}
      onSkills={() => {
        props.onSkills();
        closeOverlay();
      }}
      onSettings={() => {
        props.onSettings();
        closeOverlay();
      }}
      onOrganizationAdministration={() => {
        props.onOrganizationAdministration();
        closeOverlay();
      }}
    />
  );

  if (compactViewport) {
    return (
      <>
        {!mobile && (
          <aside
            className="hidden h-dvh min-h-0 w-full self-start overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:block xl:hidden"
            data-expanded={false}
          >
            <RailContent {...props} expanded={false} />
          </aside>
        )}
        <Sheet open={props.expanded} onOpenChange={props.onExpandedChange}>
          <SheetContent
            className="!w-[min(260px,calc(100vw-16px))] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground ease-out motion-reduce:transition-none motion-reduce:data-ending-style:translate-x-0 motion-reduce:data-starting-style:translate-x-0"
            side="left"
            showCloseButton={false}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Workspace navigation</SheetTitle>
              <SheetDescription>
                Open conversations, Data, Report, Tools, and account controls.
              </SheetDescription>
            </SheetHeader>
            {overlayContent}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "hidden h-dvh min-h-0 w-full self-start overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground xl:sticky xl:top-0 xl:block",
      )}
      data-expanded={props.expanded}
    >
      <RailContent {...props} />
    </aside>
  );
}
