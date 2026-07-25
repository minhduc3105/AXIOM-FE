import { DatabaseZapIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type DataEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function DataEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: DataEmptyStateProps) {
  return (
    <div className="grid min-h-[340px] place-items-center px-5 py-12 text-center">
      <div className="max-w-md rounded-[24px] border border-[#d8d0c2]/78 bg-[#fffdf8]/72 p-7 shadow-[0_18px_48px_rgba(24,24,18,0.07)] backdrop-blur-xl dark:border-[#38372f]/82 dark:bg-white/5">
        <span className="mx-auto flex size-12 items-center justify-center rounded-[14px] border border-[#d8d0c2]/84 bg-[#f4efe5]/86 text-[#2456e8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.36)] dark:border-[#38372f] dark:bg-[#292923] dark:text-[#9aafff]">
          <DatabaseZapIcon className="size-5" />
        </span>
        <h3 className="mt-5 text-lg font-semibold text-[#191915] dark:text-[#f4efe5]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#6d685e] dark:text-[#aaa397]">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button className="mt-6 h-10 rounded-full px-5" onClick={onAction}>
            <PlusIcon data-icon="inline-start" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
