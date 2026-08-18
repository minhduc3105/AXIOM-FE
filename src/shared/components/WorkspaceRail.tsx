import { useCallback, useEffect, useRef, useState } from "react";
import {
  DatabaseIcon,
  FileTextIcon,
  WrenchIcon,
  BotIcon,
  Building2Icon,
  MenuIcon,
  MessageSquarePlusIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  BrainCircuitIcon,
  LogOutIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react";
import { useTheme } from "@/app/ThemeProvider";
import type { AuthUser } from "@/features/auth/model/types";
import type { ChatStage } from "@/features/chat/model/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  deleteConversation,
  listConversationsPage,
  updateConversation,
} from "@/shared/lib/intelligence-api";
import { cn } from "@/shared/lib/utils";
import type { ConversationSummary } from "@/shared/types/intelligence";
import { toast } from "sonner";

type WorkspaceRailProps = {
  activeStage: ChatStage;
  surface: AppSurface;
  expanded: boolean;
  activeConversationId: string | null;
  onExpandedChange: (expanded: boolean) => void;
  onHome: () => void;
  onNewChat: () => void;
  onConversationOpen: (conversationId: string) => void;
  onConversationDeleted?: (conversationId: string) => void;
  onData: () => void;
  onReports: () => void;
  onMemory: () => void;
  onModels: () => void;
  onTools: () => void;
  onSettings: () => void;
  onOrganizationAdministration: () => void;
  user: AuthUser | null;
  onLogout: () => void;
};

const sidebarButtonIconPadding = "has-data-[icon=inline-start]:pl-3";
const workspaceNavButtonClass =
  "h-11 gap-3 text-[#615b51] hover:bg-[#ebe4d8] hover:text-[#191915] data-[active=true]:border-[#d8d0c2] data-[active=true]:bg-[#fffdf8] data-[active=true]:text-[#1237b4] data-[active=true]:shadow-[0_4px_12px_rgba(25,25,21,0.10)] dark:text-[#eee8dc]/78 dark:hover:bg-white/10 dark:hover:text-white dark:data-[active=true]:border-white/10 dark:data-[active=true]:bg-white/10 dark:data-[active=true]:text-white";
const conversationPageLimit = 20;

function appendUniqueConversations(
  current: ConversationSummary[],
  next: ConversationSummary[],
) {
  const seen = new Set(current.map((item) => item.conversation_id));
  return [
    ...current,
    ...next.filter((item) => {
      if (seen.has(item.conversation_id)) return false;
      seen.add(item.conversation_id);
      return true;
    }),
  ];
}

function isPinnedConversation(conversation: ConversationSummary) {
  return conversation.metadata?.pinned === true;
}

function revealConversationTitle(button: HTMLButtonElement) {
  const title = button.querySelector<HTMLElement>("[data-conversation-title]");
  if (!title) return;

  const distance = Math.max(title.scrollWidth - button.clientWidth + 20, 0);
  const duration = Math.min(Math.max(distance * 50, 1400), 5000);
  title.style.transition = `transform ${duration}ms linear 250ms`;
  title.style.transform = `translateX(-${distance}px)`;
}

function resetConversationTitle(button: HTMLButtonElement) {
  const title = button.querySelector<HTMLElement>("[data-conversation-title]");
  if (!title) return;

  title.style.transition = "transform 180ms ease-out";
  title.style.transform = "translateX(0)";
}

function ConversationGroup({
  label,
  conversations,
  activeConversationId,
  activeStage,
  actionPending,
  onOpen,
  onRename,
  onTogglePinned,
  onDelete,
}: {
  label: string;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  activeStage: ChatStage;
  actionPending: string | null;
  onOpen: (conversationId: string) => void;
  onRename: (
    conversation: ConversationSummary,
    title: string,
  ) => Promise<boolean>;
  onTogglePinned: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
}) {
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingTitle, setEditingTitle] = useState("");

  if (conversations.length === 0) return null;

  const startRename = (conversation: ConversationSummary) => {
    setEditingConversationId(conversation.conversation_id);
    setEditingTitle(conversation.title || "");
  };

  const finishRename = async (conversation: ConversationSummary) => {
    if (editingConversationId !== conversation.conversation_id) return;
    const nextTitle = editingTitle.trim();
    if (!nextTitle || nextTitle === (conversation.title || "")) {
      setEditingConversationId(null);
      return;
    }

    if (await onRename(conversation, nextTitle)) {
      setEditingConversationId(null);
    }
  };

  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8377] dark:text-[#eee8dc]/55">
        {label}
      </div>
      <div className="grid gap-1">
        {conversations.map((conversation) => {
          const title = conversation.title || "Untitled conversation";
          const pinned = isPinnedConversation(conversation);
          const busy = actionPending === conversation.conversation_id;
          const editing = editingConversationId === conversation.conversation_id;
          const active =
            conversation.conversation_id === activeConversationId &&
            activeStage !== "welcome";

          return (
            <div
              className={cn(
                "group flex min-h-10 min-w-0 w-full items-center overflow-hidden rounded-xl border border-transparent pr-1 text-[#625d53] transition-colors data-[active=true]:border-[#2456e8]/25 data-[active=true]:bg-[#edf2ff] data-[active=true]:text-[#111827] dark:text-[#eee8dc]/72 dark:data-[active=true]:border-[#7895ff]/28 dark:data-[active=true]:bg-white/10 dark:data-[active=true]:text-white",
                !editing &&
                  "hover:border-[#d8d0c2] hover:bg-[#fffaf1] hover:text-[#191915] dark:hover:border-white/10 dark:hover:bg-white/8 dark:hover:text-white",
              )}
              data-active={!editing && active}
              key={conversation.conversation_id}
            >
              {editing ? (
                <Input
                  aria-label="Conversation name"
                  autoFocus
                  className="h-8 min-w-0 flex-1 !shrink border-0 bg-transparent px-2.5 text-[13px] font-medium shadow-none focus-visible:!border-0 focus-visible:!ring-0"
                  value={editingTitle}
                  disabled={busy}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onBlur={() => void finishRename(conversation)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void finishRename(conversation);
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setEditingConversationId(null);
                    }
                  }}
                />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-w-0 flex-1 !shrink justify-start overflow-hidden rounded-xl px-2.5 py-2 text-left text-[13px] font-medium hover:bg-transparent hover:text-inherit focus-visible:border-[#2456e8]/45 focus-visible:ring-[#2456e8]/18 dark:focus-visible:border-[#7895ff]/45 dark:focus-visible:ring-[#7895ff]/20"
                  onClick={() => onOpen(conversation.conversation_id)}
                  onMouseEnter={(event) =>
                    revealConversationTitle(event.currentTarget)
                  }
                  onMouseLeave={(event) =>
                    resetConversationTitle(event.currentTarget)
                  }
                  onFocus={(event) =>
                    revealConversationTitle(event.currentTarget)
                  }
                  onBlur={(event) =>
                    resetConversationTitle(event.currentTarget)
                  }
                >
                  <span
                    data-conversation-title
                    className="inline-block min-w-full whitespace-nowrap pr-5 leading-[1.22]"
                  >
                    {title}
                  </span>
                </Button>
              )}
              {!editing && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7 !w-0 shrink-0 !p-0 opacity-0 pointer-events-none transition-[width,opacity] duration-150 hover:bg-[#e9e1d4] hover:text-[#191915] focus-visible:!w-7 focus-visible:opacity-100 focus-visible:pointer-events-auto group-hover:!w-7 group-hover:opacity-100 group-hover:pointer-events-auto dark:text-[#c5bcaf]/70 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={`${pinned ? "Unpin" : "Pin"} conversation ${title}`}
                    disabled={busy}
                    onClick={() => onTogglePinned(conversation)}
                  >
                    <PinIcon
                      className={cn(pinned && "fill-current")}
                      aria-hidden="true"
                    />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 !w-0 shrink-0 !p-0 opacity-0 pointer-events-none transition-[width,opacity] duration-150 hover:bg-[#e9e1d4] hover:text-[#191915] focus-visible:!w-8 focus-visible:opacity-100 focus-visible:pointer-events-auto group-hover:!w-8 group-hover:opacity-100 group-hover:pointer-events-auto data-[popup-open]:!w-8 data-[popup-open]:opacity-100 data-[popup-open]:pointer-events-auto dark:text-[#c5bcaf]/70 dark:hover:bg-white/10 dark:hover:text-white"
                          aria-label={`Open conversation actions for ${title}`}
                          disabled={busy}
                        />
                      }
                    >
                      {busy ? (
                        <LoaderCircleIcon
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <MoreHorizontalIcon aria-hidden="true" />
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-44 border-[#d8d0c2] bg-[#fffdf8] text-[#191915] dark:border-[#38372f] dark:bg-[#171714] dark:text-[#eee8dc]"
                    >
                      <DropdownMenuItem
                        onClick={() => startRename(conversation)}
                      >
                        <PencilIcon />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onTogglePinned(conversation)}
                      >
                        <PinIcon />
                        {pinned ? "Unpin chat" : "Pin chat"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(conversation)}
                      >
                        <Trash2Icon />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RailContent({
  activeStage,
  activeConversationId,
  surface,
  expanded,
  onExpandedChange,
  onHome,
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
  onLogout,
}: WorkspaceRailProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const conversationsScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingConversationPagesRef = useRef(
    new Map<number, AbortSignal | null>(),
  );
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsLoadingMore, setConversationsLoadingMore] =
    useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null,
  );
  const [conversationPage, setConversationPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(
    null,
  );
  const [conversationActionPending, setConversationActionPending] = useState<
    string | null
  >(null);

  const loadConversationPage = useCallback(
    async (page: number, signal?: AbortSignal) => {
      if (loadingConversationPagesRef.current.has(page)) return;
      const requestOwner = signal ?? null;
      loadingConversationPagesRef.current.set(page, requestOwner);
      if (page === 1) {
        setConversationsLoading(true);
        setConversationsError(null);
      } else {
        setConversationsLoadingMore(true);
      }

      try {
        const payload = await listConversationsPage(
          { page, limit: conversationPageLimit },
          signal,
        );
        const items = Array.isArray(payload.items) ? payload.items : [];
        setConversations((current) =>
          page === 1 ? items : appendUniqueConversations(current, items),
        );
        setConversationPage(payload.pagination?.page ?? page);
        setHasMoreConversations(
          payload.pagination?.has_next ??
            items.length === conversationPageLimit,
        );
        setConversationsError(null);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setConversationsError(
          error instanceof Error
            ? error.message
            : "Unable to load recent work.",
        );
      } finally {
        if (loadingConversationPagesRef.current.get(page) !== requestOwner)
          return;
        loadingConversationPagesRef.current.delete(page);
        if (page === 1) setConversationsLoading(false);
        else setConversationsLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadConversationPage(1, controller.signal);

    return () => {
      controller.abort();
      if (loadingConversationPagesRef.current.get(1) === controller.signal) {
        loadingConversationPagesRef.current.delete(1);
      }
    };
  }, [activeStage, loadConversationPage]);

  const loadNextConversationPage = useCallback(() => {
    if (
      conversationsLoading ||
      conversationsLoadingMore ||
      conversationsError ||
      !hasMoreConversations
    )
      return;
    void loadConversationPage(conversationPage + 1);
  }, [
    conversationPage,
    conversationsError,
    conversationsLoading,
    conversationsLoadingMore,
    hasMoreConversations,
    loadConversationPage,
  ]);

  useEffect(() => {
    if (!expanded) return;
    const viewport = conversationsScrollRef.current?.querySelector<HTMLElement>(
      "[data-slot='scroll-area-viewport']",
    );
    if (!viewport) return;

    const handleScroll = () => {
      const remaining =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      if (remaining < 96) loadNextConversationPage();
    };

    viewport.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [conversations.length, expanded, loadNextConversationPage]);

  const replaceConversation = useCallback(
    (nextConversation: ConversationSummary) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.conversation_id === nextConversation.conversation_id
            ? {
                ...conversation,
                ...nextConversation,
                metadata: nextConversation.metadata ?? conversation.metadata,
              }
            : conversation,
        ),
      );
    },
    [],
  );

  const renameConversation = useCallback(
    async (conversation: ConversationSummary, title: string) => {
      setConversationActionPending(conversation.conversation_id);
      try {
        const updated = await updateConversation(conversation.conversation_id, {
          title,
        });
        replaceConversation(updated);
        toast.success("Conversation renamed.");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to rename conversation.",
        );
        return false;
      } finally {
        setConversationActionPending(null);
      }
    },
    [replaceConversation],
  );

  const togglePinnedConversation = useCallback(
    async (conversation: ConversationSummary) => {
      setConversationActionPending(conversation.conversation_id);
      const pinned = isPinnedConversation(conversation);
      try {
        const updated = await updateConversation(conversation.conversation_id, {
          metadata: { ...conversation.metadata, pinned: !pinned },
        });
        replaceConversation(updated);
        toast.success(
          pinned ? "Conversation unpinned." : "Conversation pinned.",
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update conversation.",
        );
      } finally {
        setConversationActionPending(null);
      }
    },
    [replaceConversation],
  );

  const confirmDeleteConversation = useCallback(async () => {
    if (!deleteTarget) return;
    const conversationId = deleteTarget.conversation_id;
    setConversationActionPending(conversationId);
    try {
      await deleteConversation(conversationId);
      setConversations((current) =>
        current.filter(
          (conversation) => conversation.conversation_id !== conversationId,
        ),
      );
      setDeleteTarget(null);
      onConversationDeleted?.(conversationId);
      toast.success("Conversation deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete conversation.",
      );
    } finally {
      setConversationActionPending(null);
    }
  }, [deleteTarget, onConversationDeleted]);

  const pinnedConversations = conversations.filter(isPinnedConversation);
  const recentConversations = conversations.filter(
    (conversation) => !isPinnedConversation(conversation),
  );

  return (
    <div
      className={cn(
        "h-full min-h-0 text-[#191915] dark:text-[#eee8dc]",
        expanded
          ? "grid min-w-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-4 px-4 py-4"
          : "flex w-full flex-col items-center gap-3 py-4",
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
        {expanded ? (
          <Button
            type="button"
            variant="ghost"
            className="h-12 min-w-0 justify-start gap-3 rounded-xl px-0 text-left hover:bg-transparent hover:text-inherit hover:opacity-80"
            onClick={onHome}
            aria-label="Go to AXIOM home"
          >
            <img
              src="/assets/logo.png"
              alt=""
              className="size-11 shrink-0 object-contain"
              aria-hidden="true"
            />
            <span className="min-w-0 text-[15px] font-bold tracking-[0.08em]">
              AXIOM
            </span>
          </Button>
        ) : (
          <div className="group/logo relative size-11 shrink-0">
            <img
              src="/assets/logo.png"
              alt=""
              className="size-11 object-contain transition-opacity duration-200 group-hover/logo:opacity-0"
              aria-hidden="true"
            />
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
          </div>
        )}
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

      <Separator
        className={cn(
          "bg-[#d8d0c2]/85 dark:bg-white/10",
          expanded ? "w-full" : "w-8",
        )}
        aria-hidden="true"
      />

      <Button
        className={cn(
          "h-11 gap-3 rounded-xl bg-[#2456e8] text-white shadow-[0_14px_30px_rgba(36,86,232,0.18)] hover:bg-[#1d48c7] dark:bg-[#7895ff] dark:text-[#0e142c] dark:hover:bg-[#9aafff]",
          expanded && sidebarButtonIconPadding,
          expanded
            ? "w-full justify-start px-4"
            : "size-11 justify-center gap-0 !p-0",
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
          expanded ? "flex flex-col opacity-100" : "hidden",
        )}
        aria-label="Conversation vault"
      >
        <div className="min-h-0 min-w-0 flex-1" ref={conversationsScrollRef}>
          <ScrollArea className="h-full min-h-0 w-full min-w-0 overflow-hidden pr-1">
            {conversationsLoading && conversations.length === 0 ? (
              <div className="grid gap-1.5" aria-live="polite">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton className="h-9 rounded-xl" key={index} />
                ))}
              </div>
            ) : conversationsError && conversations.length === 0 ? (
              <Alert variant="destructive">
                <AlertDescription>Unable to load recent work</AlertDescription>
              </Alert>
            ) : conversations.length === 0 ? (
              <Alert>
                <AlertDescription>No recent work yet</AlertDescription>
              </Alert>
            ) : (
              <>
                {pinnedConversations.length > 0 && (
                  <ConversationGroup
                    label="Pinned"
                    conversations={pinnedConversations}
                    activeConversationId={activeConversationId}
                    activeStage={activeStage}
                    actionPending={conversationActionPending}
                    onOpen={onConversationOpen}
                    onRename={renameConversation}
                    onTogglePinned={togglePinnedConversation}
                    onDelete={setDeleteTarget}
                  />
                )}
                <ConversationGroup
                  label="Recent work"
                  conversations={recentConversations}
                  activeConversationId={activeConversationId}
                  activeStage={activeStage}
                  actionPending={conversationActionPending}
                  onOpen={onConversationOpen}
                  onRename={renameConversation}
                  onTogglePinned={togglePinnedConversation}
                  onDelete={setDeleteTarget}
                />
                {conversationsLoadingMore && (
                  <div className="grid gap-1.5 pb-2" aria-live="polite">
                    <Skeleton className="h-9 rounded-xl" />
                    <Skeleton className="h-9 rounded-xl" />
                  </div>
                )}
                {conversationsError && (
                  <Alert className="mb-2" variant="destructive">
                    <AlertDescription>Unable to load more</AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </ScrollArea>
        </div>
      </section>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This removes {deleteTarget?.title || "this conversation"} and its
              messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={
                conversationActionPending === deleteTarget?.conversation_id
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteConversation()}
              disabled={
                conversationActionPending === deleteTarget?.conversation_id
              }
            >
              {conversationActionPending === deleteTarget?.conversation_id && (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!expanded && (
        <Button
          type="button"
          variant="ghost"
          className="min-h-0 h-auto w-full flex-1 cursor-pointer rounded-lg p-0 focus-visible:ring-[#2456e8]/30 dark:focus-visible:ring-[#7895ff]/35"
          aria-label="Expand workspace navigation"
          onClick={() => onExpandedChange(true)}
        />
      )}

      <div
        className={cn(
          expanded ? "grid gap-3" : "grid w-full justify-items-center gap-3",
        )}
      >
        {expanded && (
          <Separator
            className="bg-[#d8d0c2]/85 dark:bg-white/10"
            aria-hidden="true"
          />
        )}

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
                ? "grid gap-1.5"
                : "grid w-full justify-items-center gap-2",
            )}
          >
            <Button
              variant="ghost"
              className={cn(
                workspaceNavButtonClass,
                expanded && sidebarButtonIconPadding,
                expanded
                  ? "w-full justify-start px-3"
                  : "size-11 justify-center gap-0 !p-0",
                "rounded-xl",
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
                workspaceNavButtonClass,
                expanded && sidebarButtonIconPadding,
                expanded
                  ? "w-full justify-start px-3"
                  : "size-11 justify-center gap-0 !p-0",
                "rounded-xl",
              )}
              data-active={surface === "models"}
              onClick={onModels}
              aria-label="Models"
            >
              <BotIcon data-icon="inline-start" />
              <span
                className={cn(
                  "transition-opacity duration-300",
                  expanded
                    ? "opacity-100"
                    : "pointer-events-none w-0 overflow-hidden opacity-0",
                )}
              >
                Models
              </span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                workspaceNavButtonClass,
                expanded && sidebarButtonIconPadding,
                expanded
                  ? "w-full justify-start px-3"
                  : "size-11 justify-center gap-0 !p-0",
                "rounded-xl",
              )}
              data-active={surface === "memory"}
              onClick={onMemory}
              aria-label="Memory settings"
            >
              <BrainCircuitIcon data-icon="inline-start" />
              <span
                className={cn(
                  "transition-opacity duration-300",
                  expanded
                    ? "opacity-100"
                    : "pointer-events-none w-0 overflow-hidden opacity-0",
                )}
              >
                Memory
              </span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                workspaceNavButtonClass,
                expanded && sidebarButtonIconPadding,
                expanded
                  ? "w-full justify-start px-3"
                  : "size-11 justify-center gap-0 !p-0",
                "rounded-xl",
              )}
              data-active={surface === "tools"}
              onClick={onTools}
              aria-label="Tools"
            >
              <WrenchIcon data-icon="inline-start" />
              <span
                className={cn(
                  "transition-opacity duration-300",
                  expanded
                    ? "opacity-100"
                    : "pointer-events-none w-0 overflow-hidden opacity-0",
                )}
              >
                Tools
              </span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                workspaceNavButtonClass,
                expanded && sidebarButtonIconPadding,
                expanded
                  ? "w-full justify-start px-3"
                  : "size-11 justify-center gap-0 !p-0",
                "rounded-xl",
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
            {user?.org_role === "org_admin" && (
              <Button
                variant="ghost"
                className={cn(
                  workspaceNavButtonClass,
                  expanded && sidebarButtonIconPadding,
                  expanded
                    ? "w-full justify-start px-3"
                    : "size-11 justify-center gap-0 !p-0",
                  "rounded-xl",
                )}
                data-active={surface === "organization"}
                onClick={onOrganizationAdministration}
                aria-label="Organization"
              >
                <Building2Icon data-icon="inline-start" />
                <span
                  className={cn(
                    "transition-opacity duration-300",
                    expanded
                      ? "opacity-100"
                      : "pointer-events-none w-0 overflow-hidden opacity-0",
                  )}
                >
                  Organization
                </span>
              </Button>
            )}
          </div>
        </nav>

        {expanded && (
          <Separator
            className="bg-[#d8d0c2]/85 dark:bg-white/10"
            aria-hidden="true"
          />
        )}

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
              "h-auto min-w-0 rounded-xl p-1.5 text-left text-[#191915] hover:bg-[#ebe4d8] dark:text-[#eee8dc] dark:hover:bg-white/10",
              expanded
                ? "w-full justify-start gap-3"
                : "size-11 justify-center p-0",
            )}
            aria-label="Open user session menu"
          />
        }
      >
        <Avatar size="lg">
          <AvatarImage src="" alt="" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "min-w-0 leading-tight transition-opacity duration-300",
            expanded ? "grid opacity-100" : "hidden",
          )}
        >
          <strong className="truncate text-[14px]">{label}</strong>
          <span className="truncate text-xs text-[#8a8377] dark:text-[#eee8dc]/55">
            {user?.org_role || "org_member"}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 border-[#d8d0c2] bg-[#fffdf8] text-[#191915] dark:border-[#38372f] dark:bg-[#171714] dark:text-[#eee8dc]"
        side={expanded ? "top" : "right"}
        align="start"
        sideOffset={8}
      >
        <div className="grid gap-1 px-2 py-2">
          <span className="truncate text-sm font-semibold text-[#191915] dark:text-[#eee8dc]">
            {label}
          </span>
          <span className="truncate text-xs font-normal text-[#6d685e] dark:text-[#eee8dc]/60">
            {user?.email}
          </span>
          <span className="truncate text-xs font-normal text-[#8a8377] dark:text-[#eee8dc]/50">
            Org: {user?.organization_id || "unknown"}
          </span>
        </div>
        <DropdownMenuSeparator className="bg-[#d8d0c2] dark:bg-[#38372f]" />
        <DropdownMenuItem
          className="cursor-pointer gap-2 px-2 py-2"
          onClick={onSettings}
        >
          <SettingsIcon className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 px-2 py-2 text-[#9d2f2f] focus:bg-[#fff1f1] focus:text-[#9d2f2f] dark:text-[#ff9a9a] dark:focus:bg-[#351b1b] dark:focus:text-[#ffb3b3]"
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
              Open conversations, Data, Report, Tools, and account controls.
            </SheetDescription>
          </SheetHeader>
          <RailContent
            {...props}
            expanded
            onExpandedChange={() => setMobileOpen(false)}
            onHome={() => {
              props.onHome();
              setMobileOpen(false);
            }}
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
            onMemory={() => {
              props.onMemory();
              setMobileOpen(false);
            }}
            onModels={() => {
              props.onModels();
              setMobileOpen(false);
            }}
            onTools={() => {
              props.onTools();
              setMobileOpen(false);
            }}
            onSettings={() => {
              props.onSettings();
              setMobileOpen(false);
            }}
            onOrganizationAdministration={() => {
              props.onOrganizationAdministration();
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
