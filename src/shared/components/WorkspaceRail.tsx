import { useCallback, useEffect, useRef, useState } from "react";
import {
  SettingsIcon,
  LogOutIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  ChevronDownIcon,
  Trash2Icon,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AppSurface } from "@/app/routing/types";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import {
  deleteConversation,
  listConversationsPage,
  updateConversation,
} from "@/shared/lib/intelligence-api";
import { cn } from "@/shared/lib/utils";
import type { ConversationSummary } from "@/shared/types/intelligence";
import { WorkspacePrimaryNavigation } from "./workspace-rail/WorkspacePrimaryNavigation";
import { toast } from "sonner";

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
  onSettings: () => void;
  onOrganizationAdministration: () => void;
  user: AuthUser | null;
  onLogout: () => void;
};

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
  hideLabel = false,
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
  hideLabel?: boolean;
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
    <div className="mb-2 last:mb-0">
      {!hideLabel && (
        <div className="mb-1 h-8 px-2 text-[13px] font-medium leading-8 text-muted-foreground">
          {label}
        </div>
      )}
      <div className="grid gap-0.5">
        {conversations.map((conversation) => {
          const title = conversation.title || "Untitled conversation";
          const pinned = isPinnedConversation(conversation);
          const busy = actionPending === conversation.conversation_id;
          const editing =
            editingConversationId === conversation.conversation_id;
          const active =
            conversation.conversation_id === activeConversationId &&
            activeStage !== "welcome";

          return (
            <div
              className={cn(
                "group flex h-9 min-w-0 w-full items-center overflow-hidden rounded-lg pr-1 text-muted-foreground transition-colors data-[active=true]:bg-muted/80 data-[active=true]:text-foreground dark:data-[active=true]:bg-muted/55",
                !editing &&
                  "hover:bg-muted/60 hover:text-foreground dark:hover:bg-muted/40",
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
                  className="h-9 min-w-0 flex-1 !shrink justify-start overflow-hidden rounded-lg px-2.5 text-left text-[13px] font-normal hover:bg-transparent hover:text-inherit"
                  onClick={() => onOpen(conversation.conversation_id)}
                  title={title}
                >
                  <span className="block min-w-0 truncate">{title}</span>
                </Button>
              )}
              {!editing && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 !w-0 shrink-0 !p-0 opacity-0 pointer-events-none transition-[width,opacity] duration-150 hover:bg-muted focus-visible:!w-7 focus-visible:opacity-100 focus-visible:pointer-events-auto group-hover:!w-7 group-hover:opacity-100 group-hover:pointer-events-auto data-[popup-open]:!w-7 data-[popup-open]:opacity-100 data-[popup-open]:pointer-events-auto"
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
  onSettings,
  onOrganizationAdministration,
  user,
  onLogout,
  moreMenuSide,
}: RailContentProps) {
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
  const [recentWorkExpanded, setRecentWorkExpanded] = useState(true);

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
    if (!expanded) return;
    const controller = new AbortController();
    void loadConversationPage(1, controller.signal);

    return () => {
      controller.abort();
      if (loadingConversationPagesRef.current.get(1) === controller.signal) {
        loadingConversationPagesRef.current.delete(1);
      }
    };
  }, [activeStage, expanded, loadConversationPage]);

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
        onOrganizationAdministration={onOrganizationAdministration}
      />

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

      <section
        className={cn(
          "min-h-0 min-w-0 overflow-hidden transition-opacity duration-300",
          expanded ? "flex flex-col opacity-100" : "hidden",
        )}
        aria-label="Conversation vault"
      >
        <div className="min-h-0 min-w-0 flex-1" ref={conversationsScrollRef}>
          <ScrollArea className="h-full min-h-0 w-full min-w-0 overflow-hidden pr-1 [&_[data-slot=scroll-area-viewport]]:pr-3 [&_[data-slot=scroll-area-scrollbar]]:w-1.5 [&_[data-slot=scroll-area-thumb]]:bg-border/70">
            {!conversationsLoading &&
              !conversationsError &&
              pinnedConversations.length > 0 && (
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

            <Button
              type="button"
              variant="ghost"
              className="mb-1 h-8 w-full justify-start gap-1 rounded-lg px-2 text-[13px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-muted-foreground dark:aria-expanded:bg-transparent"
              aria-label={`${recentWorkExpanded ? "Collapse" : "Expand"} recent work`}
              aria-expanded={recentWorkExpanded}
              onClick={() => setRecentWorkExpanded((current) => !current)}
            >
              <span>Recent work</span>
              <ChevronDownIcon
                className={cn(
                  "size-3.5 transition-transform duration-150",
                  !recentWorkExpanded && "-rotate-90",
                )}
                aria-hidden="true"
              />
            </Button>

            {recentWorkExpanded && (
              <>
                {conversationsLoading && conversations.length === 0 ? (
                  <div className="grid gap-1.5" aria-live="polite">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton className="h-9 rounded-lg" key={index} />
                    ))}
                  </div>
                ) : conversationsError && conversations.length === 0 ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Unable to load recent work
                    </AlertDescription>
                  </Alert>
                ) : recentConversations.length === 0 ? (
                  <Alert>
                    <AlertDescription>No recent work yet</AlertDescription>
                  </Alert>
                ) : (
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
                    hideLabel
                  />
                )}
                {conversationsLoadingMore && (
                  <div className="grid gap-1.5 pb-2" aria-live="polite">
                    <Skeleton className="h-9 rounded-lg" />
                    <Skeleton className="h-9 rounded-lg" />
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

      <div
        className={cn(
          expanded
            ? "grid"
            : "mt-auto grid w-full justify-items-center",
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
              "h-9 min-w-0 rounded-lg p-0.5 text-left text-[#191915] hover:bg-muted aria-expanded:bg-muted dark:text-[#eee8dc] dark:hover:bg-muted/50 dark:aria-expanded:bg-muted/50",
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
            className="hidden h-dvh min-h-0 w-full overflow-hidden border-r border-border bg-card text-foreground md:block xl:hidden"
            data-expanded={false}
          >
            <RailContent {...props} expanded={false} />
          </aside>
        )}
        <Sheet open={props.expanded} onOpenChange={props.onExpandedChange}>
          <SheetContent
            className="!w-[min(260px,calc(100vw-16px))] gap-0 border-border bg-card p-0"
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
        "hidden h-dvh min-h-0 w-full overflow-hidden border-r border-border bg-card text-foreground xl:block",
      )}
      data-expanded={props.expanded}
    >
      <RailContent {...props} />
    </aside>
  );
}
