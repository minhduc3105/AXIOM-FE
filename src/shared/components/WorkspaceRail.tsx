import { useEffect, useState } from "react";
import {
  DatabaseIcon,
  FileTextIcon,
  MenuIcon,
  MessageSquarePlusIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "@/app/ThemeProvider";
import type { ChatStage } from "@/features/chat/model/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AppSurface } from "@/app/routing/types";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { listConversations } from "@/shared/lib/intelligence-api";
import { cn } from "@/shared/lib/utils";
import type { ConversationSummary } from "@/shared/types/intelligence";

type WorkspaceRailProps = {
  activeStage: ChatStage;
  surface: AppSurface;
  expanded: boolean;
  activeConversationId: string | null;
  onExpandedChange: (expanded: boolean) => void;
  onNewChat: () => void;
  onConversationOpen: (conversationId: string) => void;
  onData: () => void;
  onReports: () => void;
};

const sidebarButtonIconPadding = "has-data-[icon=inline-start]:pl-3";

function RailContent({
  activeStage,
  activeConversationId,
  surface,
  expanded,
  onExpandedChange,
  onNewChat,
  onConversationOpen,
  onData,
  onReports,
}: WorkspaceRailProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    setConversationsLoading(true);
    setConversationsError(null);

    listConversations(controller.signal)
      .then((items) => setConversations(items))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setConversationsError(
          error instanceof Error ? error.message : "Unable to load recent work.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setConversationsLoading(false);
      });

    return () => controller.abort();
  }, [activeStage]);

  return (
    <div
      className={cn(
        "min-h-full text-[#191915] dark:text-[#eee8dc]",
        expanded
          ? "grid min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 px-4 py-4"
          : "flex w-full flex-col items-center gap-3 px-2.5 py-4",
      )}
    >
      <div
        className={cn(
          "min-w-0 gap-3",
          expanded
            ? "flex h-12 items-center justify-between"
            : "grid justify-items-center",
        )}
      >
        <div
          className={cn(
            "min-w-0 gap-3",
            expanded ? "flex items-center" : "grid justify-items-center",
          )}
        >
          <div className="group/logo relative size-11 shrink-0">
            <img
              src="/assets/logo.png"
              alt=""
              className={cn(
                "size-11 object-contain transition-opacity duration-200",
                !expanded && "group-hover/logo:opacity-0",
              )}
              aria-hidden="true"
            />
            {!expanded && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute inset-0 size-11 rounded-xl opacity-0 transition-opacity duration-200 pointer-events-none group-hover/logo:pointer-events-auto group-hover/logo:opacity-100 text-[#6d685e] hover:bg-[#ebe4d8] hover:text-[#191915] focus-visible:pointer-events-auto focus-visible:opacity-100 dark:text-[#aaa397] dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Expand workspace navigation"
                      onClick={() => onExpandedChange(true)}
                    />
                  }
                >
                  <PanelLeftOpenIcon />
                </TooltipTrigger>
                <TooltipContent>Expand navigation</TooltipContent>
              </Tooltip>
            )}
          </div>
          <span
            className={cn(
              "min-w-0 text-[15px] font-bold tracking-[0.08em] transition-opacity duration-300",
              expanded ? "opacity-100" : "hidden",
            )}
          >
            AXIOM
          </span>
        </div>
        {expanded && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-xl text-[#6d685e] hover:bg-[#ebe4d8] hover:text-[#191915] dark:text-[#aaa397] dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Collapse workspace navigation"
                  onClick={() => onExpandedChange(false)}
                />
              }
            >
              <PanelLeftCloseIcon />
            </TooltipTrigger>
            <TooltipContent>Collapse navigation</TooltipContent>
          </Tooltip>
        )}
      </div>

      {!expanded && (
        <Separator
          className="w-8"
          aria-hidden="true"
        />
      )}

      <Button
        className={cn(
          "h-11 gap-3 rounded-xl bg-[#2456e8] text-white shadow-[0_14px_30px_rgba(36,86,232,0.18)] hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]",
          sidebarButtonIconPadding,
          expanded
            ? "w-full justify-start px-4"
            : "size-11 justify-center pl-5 pr-0",
        )}
        onClick={onNewChat}
        aria-label="+ New chat"
      >
        <MessageSquarePlusIcon data-icon="inline-start" />
        <span
          className={cn(
            "transition-opacity duration-300",
            expanded
              ? "opacity-100"
              : "pointer-events-none w-0 overflow-hidden opacity-0",
          )}
        >
          New chat
        </span>
      </Button>

      <section
        className={cn(
          "min-h-0 min-w-0 overflow-hidden transition-opacity duration-300",
          expanded ? "opacity-100" : "hidden",
        )}
        aria-label="Conversation vault"
      >
        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8377] dark:text-[#eee8dc]/55">
          Recent work
        </div>
        <ScrollArea className="h-[min(276px,36vh)] w-full min-w-0 overflow-hidden pr-1">
          {conversationsLoading && conversations.length === 0 ? (
            <div className="grid gap-1.5" aria-live="polite">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  className="h-9 rounded-xl"
                  key={index}
                />
              ))}
            </div>
          ) : conversationsError ? (
            <Alert variant="destructive">
              <AlertDescription>Unable to load recent work</AlertDescription>
            </Alert>
          ) : conversations.length === 0 ? (
            <Alert>
              <AlertDescription>No recent work yet</AlertDescription>
            </Alert>
          ) : (
            conversations.map((conversation) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mb-1.5 min-h-8 w-full max-w-full justify-start overflow-hidden rounded-xl border border-transparent px-2.5 py-2 text-left text-[13px] font-medium text-[#625d53] hover:border-[#d8d0c2] hover:bg-[#fffaf1] hover:text-[#191915] focus-visible:border-[#2456e8]/45 focus-visible:ring-[#2456e8]/18 data-[active=true]:border-[#2456e8]/25 data-[active=true]:bg-[#edf2ff] data-[active=true]:text-[#111827] dark:text-[#eee8dc]/72 dark:hover:border-white/10 dark:hover:bg-white/8 dark:hover:text-white dark:focus-visible:border-[#7895ff]/45 dark:focus-visible:ring-[#7895ff]/20 dark:data-[active=true]:border-[#7895ff]/28 dark:data-[active=true]:bg-white/10 dark:data-[active=true]:text-white"
                data-active={
                  conversation.conversation_id === activeConversationId &&
                  activeStage !== "welcome"
                    ? "true"
                    : "false"
                }
                key={conversation.conversation_id}
                onClick={() => onConversationOpen(conversation.conversation_id)}
              >
                <span className="block w-full min-w-0 truncate leading-[1.22]">
                  {conversation.title || "Untitled conversation"}
                </span>
              </Button>
            ))
          )}
        </ScrollArea>
      </section>

      {!expanded && (
        <Button
          type="button"
          variant="ghost"
          className="min-h-0 h-auto w-full flex-1 cursor-pointer rounded-lg p-0 focus-visible:ring-[#2456e8]/30 dark:focus-visible:ring-[#7895ff]/35"
          aria-label="Expand workspace navigation"
          onClick={() => onExpandedChange(true)}
        />
      )}

      {expanded && (
        <Separator
          className="bg-[#d8d0c2]/85 dark:bg-white/10"
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          expanded ? "grid gap-3" : "grid w-full gap-3",
        )}
      >
        <nav
          className={cn(
            "grid",
            expanded ? "gap-1.5" : "w-full justify-items-center gap-2 pt-1",
          )}
          aria-label="Workspace"
        >
          <div
            className={cn(
              expanded
                ? "rounded-[8px] border border-[#d8d0c2] bg-[#f0eadf]/70 p-1 dark:border-[#38372f] dark:bg-white/5"
                : "grid w-full justify-items-center gap-2",
            )}
          >
            <Button
              variant="ghost"
              className={cn(
                "h-11 gap-3 rounded-[6px] text-[#615b51] hover:bg-[#ebe4d8] hover:text-[#191915] data-[active=true]:bg-[#fffdf8] data-[active=true]:text-[#1237b4] data-[active=true]:shadow-sm dark:text-[#eee8dc]/78 dark:hover:bg-white/10 dark:hover:text-white dark:data-[active=true]:bg-white/10 dark:data-[active=true]:text-white",
                sidebarButtonIconPadding,
                expanded
                  ? "w-full justify-start px-3"
                  : "size-11 justify-center px-0",
              )}
              data-active={surface === "data"}
              onClick={onData}
              aria-label="Data"
            >
              <DatabaseIcon data-icon="inline-start" />
              <span
                className={cn(
                  "transition-opacity duration-300",
                  expanded
                    ? "opacity-100"
                    : "pointer-events-none w-0 overflow-hidden opacity-0",
                )}
              >
                Data
              </span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "h-11 gap-3 rounded-[6px] text-[#615b51] hover:bg-[#ebe4d8] hover:text-[#191915] data-[active=true]:bg-[#fffdf8] data-[active=true]:text-[#1237b4] data-[active=true]:shadow-sm dark:text-[#eee8dc]/78 dark:hover:bg-white/10 dark:hover:text-white dark:data-[active=true]:bg-white/10 dark:data-[active=true]:text-white",
                sidebarButtonIconPadding,
                expanded
                  ? "w-full justify-start px-3"
                  : "size-11 justify-center px-0",
              )}
              data-active={surface === "reports"}
              onClick={onReports}
              aria-label="Report"
            >
              <FileTextIcon data-icon="inline-start" />
              <span
                className={cn(
                  "transition-opacity duration-300",
                  expanded
                    ? "opacity-100"
                    : "pointer-events-none w-0 overflow-hidden opacity-0",
                )}
              >
                Report
              </span>
            </Button>
          </div>
          <Button
            variant="ghost"
            className={cn(
              "h-11 gap-3 rounded-xl text-[#615b51] hover:bg-[#ebe4d8] hover:text-[#191915] dark:text-[#eee8dc]/78 dark:hover:bg-white/10 dark:hover:text-white",
              sidebarButtonIconPadding,
              expanded
                ? "w-full justify-start px-3"
                : "size-11 justify-center px-0",
            )}
            aria-label="Settings"
          >
            <SettingsIcon data-icon="inline-start" />
            <span
              className={cn(
                "transition-opacity duration-300",
                expanded
                  ? "opacity-100"
                  : "pointer-events-none w-0 overflow-hidden opacity-0",
              )}
            >
              Settings
            </span>
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "h-11 gap-3 rounded-xl text-[#615b51] hover:bg-[#ebe4d8] hover:text-[#191915] dark:text-[#eee8dc]/78 dark:hover:bg-white/10 dark:hover:text-white",
              sidebarButtonIconPadding,
              expanded
                ? "w-full justify-start px-3"
                : "size-11 justify-center px-0",
            )}
            aria-label={
              resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"
            }
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme === "dark" ? (
              <SunIcon data-icon="inline-start" />
            ) : (
              <MoonIcon data-icon="inline-start" />
            )}
            <span
              className={cn(
                "transition-opacity duration-300",
                expanded
                  ? "opacity-100"
                  : "pointer-events-none w-0 overflow-hidden opacity-0",
              )}
            >
              {resolvedTheme === "dark" ? "Use light theme" : "Use dark theme"}
            </span>
          </Button>
        </nav>

        {expanded && (
          <Separator
            className="bg-[#d8d0c2]/85 dark:bg-white/10"
            aria-hidden="true"
          />
        )}

        <div
          className={cn(
            "min-w-0",
            expanded ? "flex items-center gap-3" : "grid w-full justify-items-center",
          )}
        >
          <Avatar
            size="lg"
            className="ring-2 ring-[#fffaf1] dark:ring-[#151512]"
          >
            <AvatarImage
              src="https://www.figma.com/api/mcp/asset/456e95e3-44c6-4626-9d3e-f10a9b6c8e2e"
              alt="Andrew Neilson"
            />
            <AvatarFallback>AN</AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "min-w-0 leading-tight transition-opacity duration-300",
              expanded ? "grid opacity-100" : "hidden",
            )}
          >
            <strong className="truncate text-[15px]">Andrew Neilson</strong>
            <span className="text-xs text-[#6d685e] dark:text-[#eee8dc]/60">
              Research lead
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceRail(props: WorkspaceRailProps) {
  const mobile = useMediaQuery("(max-width: 767px)");
  const [mobileOpen, setMobileOpen] = useState(false);

  if (mobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={
            <Button
              className="fixed left-3 top-3 z-50 size-12 rounded-2xl border-[#d8d0c2] bg-[#fffdf8]/90 shadow-[0_12px_34px_rgba(0,0,0,0.16)] backdrop-blur-xl md:hidden"
              variant="outline"
              size="icon"
              aria-label="Open workspace navigation"
            />
          }
        >
          <MenuIcon />
        </SheetTrigger>
        <SheetContent
          className="!w-[min(326px,calc(100vw-20px))] gap-0 border-[#d8d0c2] bg-[#fffaf1]/96 p-0 shadow-[18px_0_60px_rgba(24,24,18,0.18)] backdrop-blur-2xl dark:border-[#30302a] dark:bg-[#0b0b0a]/96"
          side="left"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Workspace navigation</SheetTitle>
            <SheetDescription>
              Open conversations, Data, Report, and account controls.
            </SheetDescription>
          </SheetHeader>
          <RailContent
            {...props}
            expanded
            onExpandedChange={() => setMobileOpen(false)}
            onNewChat={() => {
              props.onNewChat();
              setMobileOpen(false);
            }}
            onConversationOpen={(conversationId) => {
              props.onConversationOpen(conversationId);
              setMobileOpen(false);
            }}
            onData={() => {
              props.onData();
              setMobileOpen(false);
            }}
            onReports={() => {
              props.onReports();
              setMobileOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-[#d8d0c2]/85 bg-[#fffaf1]/82 text-[#191915] shadow-[18px_0_64px_rgba(24,24,18,0.10)] backdrop-blur-2xl transition-[width] duration-500 ease-out md:block dark:border-[#393831]/80 dark:bg-[#0b0b0a]/90 dark:text-[#eee8dc] dark:shadow-[18px_0_64px_rgba(0,0,0,0.22)]",
        props.expanded ? "w-[304px]" : "w-[76px]",
      )}
      data-expanded={props.expanded}
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#2456e8]/28 to-transparent dark:via-[#7895ff]/24"
        aria-hidden="true"
      />
      <RailContent {...props} />
    </aside>
  );
}
