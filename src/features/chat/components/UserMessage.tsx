import { PaperclipIcon } from "lucide-react";
import type { ChatAttachment } from "../model/types";

export function UserMessage({
  attachments = [],
  question,
}: {
  attachments?: ChatAttachment[];
  question: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="grid max-w-[min(72%,680px)] justify-items-end gap-3">
        <div className="rounded-[18px] bg-primary px-4 py-3 text-primary-foreground shadow-sm">
          <p className="text-sm leading-relaxed break-words">{question}</p>
        </div>
        <AttachmentList attachments={attachments} />
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

function AttachmentChip({ file }: { file: ChatAttachment }) {
  return (
    <span className="inline-flex max-w-[250px] items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
      <PaperclipIcon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{file.name}</span>
    </span>
  );
}
