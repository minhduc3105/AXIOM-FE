import { DatabaseIcon, PaperclipIcon } from "lucide-react";
import type { ChatAttachment } from "../model/types";
import {
  chatDataScopeLabel,
  type ChatDataScope,
} from "../model/chatDataScope";

export function UserMessage({
  attachments = [],
  dataScope,
  question,
}: {
  attachments?: ChatAttachment[];
  dataScope?: ChatDataScope;
  question: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="grid max-w-[min(72%,680px)] justify-items-end gap-3">
        <div className="rounded-[18px] bg-primary px-4 py-3 text-primary-foreground shadow-sm">
          <p className="text-sm leading-relaxed break-words">{question}</p>
        </div>
        <div className="flex min-w-0 flex-wrap justify-end gap-2">
          {dataScope && <DataScopeChip scope={dataScope} />}
          <AttachmentList attachments={attachments} />
        </div>
      </div>
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: ChatAttachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-wrap justify-end gap-2" aria-label="Attached files">
      {attachments.map((file, index) => (
        <AttachmentChip file={file} key={`${file.name}-${file.size}-${index}`} />
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
      <PaperclipIcon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{file.name}</span>
    </span>
  );
}
