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
    <div className="grid min-h-[300px] place-items-center px-5 py-12 text-center">
      <div className="max-w-sm">
        <span className="mx-auto flex size-11 items-center justify-center rounded-[8px] border border-[#d8d0c2] bg-[#f4efe5] text-[#2456e8] dark:border-[#38372f] dark:bg-[#292923] dark:text-[#9aafff]">
          <DatabaseZapIcon className="size-5" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-[#191915] dark:text-[#f4efe5]">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-6 text-[#6d685e] dark:text-[#aaa397]">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button className="mt-5 h-9 rounded-[7px]" onClick={onAction}>
            <PlusIcon data-icon="inline-start" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
