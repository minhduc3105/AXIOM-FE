import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deleteConversation,
  listConversationsPage,
  updateConversation,
} from "@/shared/lib/intelligence-api";
import type { ConversationSummary } from "@/shared/types/intelligence";

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

export function isPinnedConversation(conversation: ConversationSummary) {
  return conversation.metadata?.pinned === true;
}

export function useWorkspaceConversations({
  expanded,
  activeConversationId,
  onConversationDeleted,
}: {
  expanded: boolean;
  activeConversationId: string | null;
  onConversationDeleted?: (conversationId: string) => void;
}) {
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
    if (!expanded) return;
    // Conversation data belongs to the rail, not to the currently displayed
    // chat stage. Keep the existing list mounted while switching chats so the
    // sidebar does not flash a loading state or reset its scroll position.
    const controller = new AbortController();
    void loadConversationPage(1, controller.signal);

    return () => {
      controller.abort();
      if (loadingConversationPagesRef.current.get(1) === controller.signal) {
        loadingConversationPagesRef.current.delete(1);
      }
    };
  }, [activeConversationId, expanded, loadConversationPage]);

  const loadNextConversationPage = useCallback(() => {
    if (
      conversationsLoading ||
      conversationsLoadingMore ||
      conversationsError ||
      !hasMoreConversations
    ) {
      return;
    }
    void loadConversationPage(conversationPage + 1);
  }, [
    conversationPage,
    conversationsError,
    conversationsLoading,
    conversationsLoadingMore,
    hasMoreConversations,
    loadConversationPage,
  ]);

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

  return {
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
  };
}
