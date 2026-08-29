import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, LoaderCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatStage } from "@/features/chat/model/types";
import { cn } from "@/shared/lib/utils";
import { ConversationGroup } from "./WorkspaceConversationRow";
import {
  isPinnedConversation,
  useWorkspaceConversations,
} from "./useWorkspaceConversations";

type WorkspaceConversationListProps = {
  activeConversationId: string | null;
  activeStage: ChatStage;
  expanded: boolean;
  onConversationDeleted?: (conversationId: string) => void;
  onConversationOpen: (conversationId: string) => void;
};

function ConversationSectionToggle({
  label,
  accessibleName,
  expanded,
  onToggle,
}: {
  label: string;
  accessibleName: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="mb-1 h-8 w-full cursor-pointer justify-start gap-1 rounded-lg px-2 text-[13px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-muted-foreground dark:aria-expanded:bg-transparent"
      aria-label={`${expanded ? "Collapse" : "Expand"} ${accessibleName}`}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <span>{label}</span>
      <ChevronDownIcon
        className={cn(
          "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
          !expanded && "-rotate-90",
        )}
        aria-hidden="true"
      />
    </Button>
  );
}

export function WorkspaceConversationList({
  activeConversationId,
  activeStage,
  expanded,
  onConversationDeleted,
  onConversationOpen,
}: WorkspaceConversationListProps) {
  const conversationsScrollRef = useRef<HTMLDivElement | null>(null);
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [recentWorkExpanded, setRecentWorkExpanded] = useState(true);
  const {
    conversationActionPending,
    conversations,
    conversationsError,
    conversationsLoading,
    conversationsLoadingMore,
    deleteTarget,
    confirmDeleteConversation,
    loadNextConversationPage,
    renameConversation,
    setDeleteTarget,
    togglePinnedConversation,
  } = useWorkspaceConversations({
    activeConversationId,
    expanded,
    onConversationDeleted,
  });

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

  const pinnedConversations = conversations.filter(isPinnedConversation);
  const recentConversations = conversations.filter(
    (conversation) => !isPinnedConversation(conversation),
  );

  return (
    <>
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-semibold text-destructive">
                &quot;{deleteTarget?.title || "this conversation"}&quot;
              </span>{" "}
              and its messages. This action cannot be undone.
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
          "min-h-0 min-w-0 overflow-hidden transition-opacity duration-300 motion-reduce:transition-none",
          expanded ? "flex flex-col opacity-100" : "hidden",
        )}
        aria-label="Conversation vault"
      >
        <div className="min-h-0 min-w-0 flex-1" ref={conversationsScrollRef}>
          <div
            data-slot="scroll-area-viewport"
            className="h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden pr-3"
          >
            {!conversationsLoading &&
              !conversationsError &&
              pinnedConversations.length > 0 && (
                <>
                  <ConversationSectionToggle
                    label="Pinned"
                    accessibleName="pinned conversations"
                    expanded={pinnedExpanded}
                    onToggle={() => setPinnedExpanded((current) => !current)}
                  />
                  {pinnedExpanded && (
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
                      hideLabel
                    />
                  )}
                </>
              )}

            <ConversationSectionToggle
              label="Recent work"
              accessibleName="recent work"
              expanded={recentWorkExpanded}
              onToggle={() => setRecentWorkExpanded((current) => !current)}
            />

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
          </div>
        </div>
      </section>
    </>
  );
}
