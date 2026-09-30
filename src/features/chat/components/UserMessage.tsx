import { DatabaseIcon, PaperclipIcon } from "lucide-react";
import type { ChatAttachment } from "../model/types";
import { chatDataScopeLabel, type ChatDataScope } from "../model/chatDataScope";

export function UserMessage({
  attachments = [],
  dataScope,
  question,
  replyContext,
}: {
  attachments?: ChatAttachment[];
  dataScope?: ChatDataScope;
  question: string;
  replyContext?: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="grid w-full max-w-[min(72%,680px)] justify-items-end gap-2">
        {replyContext && (
          <div
            className="flex max-w-full min-w-0 items-center gap-2 border-l-2 border-muted-foreground/25 py-0.5 pl-2.5 text-left"
            data-reply-preview
            title={replyContext}
          >
            <span
              aria-hidden="true"
              className="shrink-0 text-xs leading-4 text-muted-foreground"
            >
              ↳
            </span>
            <p className="min-w-0 truncate text-xs leading-4 text-muted-foreground">
              {replyContext}
            </p>
          </div>
        )}
        <div className="w-fit max-w-full rounded-[18px] bg-primary px-4 py-3 text-primary-foreground shadow-sm">
          <p className="text-sm leading-relaxed break-words">{question}</p>
        </div>
        <div className="flex min-w-0 flex-wrap justify-end gap-2">
          <AttachmentList attachments={attachments} />
        </div>
      </div>
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: ChatAttachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div
      className="flex min-w-0 flex-wrap justify-end gap-2"
      aria-label="Attached files"
    >
      {attachments.map((file, index) => (
        <AttachmentChip
          file={file}
          key={`${file.name}-${file.size}-${index}`}
        />
      ))}
    </div>
  );
}

function DataScopeChip({ scope }: { scope: ChatDataScope }) {
  const label = chatDataScopeLabel(scope);
  const title =
    scope.mode === "selected" ? scope.resourceNames.join(", ") : label;

  return (
    <span
      className="inline-flex max-w-[280px] items-center gap-2 rounded-full border border-primary/20 bg-primary/7 px-3 py-1.5 text-sm font-medium text-primary"
      title={title}
    >
      <DatabaseIcon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

function AttachmentChip({ file }: { file: ChatAttachment }) {
  return (
    <span className="inline-flex max-w-[250px] items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
      <span className="min-w-0 truncate">{file.name}</span>
    </span>
  );
}
