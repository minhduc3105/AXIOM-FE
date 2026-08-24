import { useState } from "react";
import {
  LoaderCircleIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PinIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ChatStage } from "@/features/chat/model/types";
import { cn } from "@/shared/lib/utils";
import type { ConversationSummary } from "@/shared/types/intelligence";
import { isPinnedConversation } from "./useWorkspaceConversations";

type ConversationCallbacks = {
  onDelete: (conversation: ConversationSummary) => void;
  onOpen: (conversationId: string) => void;
  onRename: (conversation: ConversationSummary, title: string) => Promise<boolean>;
  onTogglePinned: (conversation: ConversationSummary) => void;
};

type WorkspaceConversationRowProps = ConversationCallbacks & {
  active: boolean;
  busy: boolean;
  conversation: ConversationSummary;
};

function WorkspaceConversationRow({
  active,
  busy,
  conversation,
  onDelete,
  onOpen,
  onRename,
  onTogglePinned,
}: WorkspaceConversationRowProps) {
  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const title = conversation.title || "Untitled conversation";
  const pinned = isPinnedConversation(conversation);

  const startRename = () => {
    setEditing(true);
    setEditingTitle(conversation.title || "");
  };

  const finishRename = async () => {
    const nextTitle = editingTitle.trim();
    if (!nextTitle || nextTitle === (conversation.title || "")) {
      setEditing(false);
      return;
    }

    if (await onRename(conversation, nextTitle)) setEditing(false);
  };

  return (
    <div
      className={cn(
        "group flex h-9 min-w-0 w-full items-center overflow-hidden rounded-lg pr-1 text-muted-foreground transition-colors data-[active=true]:bg-muted/80 data-[active=true]:text-foreground dark:data-[active=true]:bg-muted/55",
        !editing && "hover:bg-muted/60 hover:text-foreground dark:hover:bg-muted/40",
      )}
      data-active={!editing && active}
    >
      {editing ? (
        <Input
          aria-label="Conversation name"
          autoFocus
          className="h-8 min-w-0 flex-1 !shrink border-0 bg-transparent px-2.5 text-[13px] font-medium shadow-none focus-visible:!border-0 focus-visible:!ring-0"
          value={editingTitle}
          disabled={busy}
          onChange={(event) => setEditingTitle(event.target.value)}
          onBlur={() => void finishRename()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void finishRename();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setEditing(false);
            }
          }}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 min-w-0 flex-1 !shrink cursor-pointer justify-start overflow-hidden rounded-lg px-2.5 text-left text-[13px] font-normal hover:bg-transparent hover:text-inherit"
          onClick={() => onOpen(conversation.conversation_id)}
          aria-label={title}
          title={title}
        >
          {pinned && (
            <MessageCircleIcon
              className="size-[18px] shrink-0"
              role="img"
              aria-label="Pinned conversation"
            />
          )}
          <span className="block min-w-0 truncate">{title}</span>
        </Button>
      )}
      {!editing && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "size-7 !w-0 shrink-0 !p-0 opacity-0 pointer-events-none transition-[width,opacity] duration-150 hover:bg-muted focus-visible:!w-7 focus-visible:opacity-100 focus-visible:pointer-events-auto group-hover:!w-7 group-hover:opacity-100 group-hover:pointer-events-auto cursor-pointer",
              busy && "mr-1 !w-7 opacity-100",
            )}
            aria-label={`${pinned ? "Unpin" : "Pin"} conversation ${title}`}
            disabled={busy}
            onClick={() => onTogglePinned(conversation)}
          >
            {busy ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <PinIcon className={cn(pinned && "fill-current")} aria-hidden="true" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 !w-0 shrink-0 !p-0 opacity-0 pointer-events-none transition-[width,opacity] duration-150 hover:bg-muted focus-visible:!w-7 focus-visible:opacity-100 focus-visible:pointer-events-auto group-hover:!w-7 group-hover:opacity-100 group-hover:pointer-events-auto data-[popup-open]:!w-7 data-[popup-open]:opacity-100 data-[popup-open]:pointer-events-auto cursor-pointer"
                  aria-label={`Open conversation actions for ${title}`}
                  disabled={busy}
                />
              }
            >
              <MoreHorizontalIcon aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 border-[#d8d0c2] bg-[#fffdf8] text-[#191915] dark:border-[#38372f] dark:bg-[#171714] dark:text-[#eee8dc]"
            >
              <DropdownMenuItem onClick={startRename}>
                <PencilIcon />
                Rename
              </DropdownMenuItem>
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
}

export function ConversationGroup({
  label,
  conversations,
  activeConversationId,
  activeStage,
  actionPending,
  hideLabel = false,
  onDelete,
  onOpen,
  onRename,
  onTogglePinned,
}: ConversationCallbacks & {
  actionPending: string | null;
  activeConversationId: string | null;
  activeStage: ChatStage;
  conversations: ConversationSummary[];
  hideLabel?: boolean;
  label: string;
}) {
  if (conversations.length === 0) return null;

  return (
    <div className="mb-2 last:mb-0">
      {!hideLabel && (
        <div className="mb-1 h-8 px-2 text-[13px] font-medium leading-8 text-muted-foreground">
          {label}
        </div>
      )}
      <div className="grid gap-0.5">
        {conversations.map((conversation) => (
          <WorkspaceConversationRow
            active={
              conversation.conversation_id === activeConversationId &&
              activeStage !== "welcome"
            }
            busy={actionPending === conversation.conversation_id}
            conversation={conversation}
            key={conversation.conversation_id}
            onDelete={onDelete}
            onOpen={onOpen}
            onRename={onRename}
            onTogglePinned={onTogglePinned}
          />
        ))}
      </div>
    </div>
  );
}
