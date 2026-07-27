import { Skeleton } from "@/components/ui/skeleton";

export function ToolCatalogSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="grid min-h-[248px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[24px] border border-[#d8d0c2]/80 bg-[#fffdf8]/80 p-5 shadow-[0_18px_52px_rgba(24,24,18,0.06)] backdrop-blur-xl dark:border-[#38372f]/80 dark:bg-[#1a1a17]/80"
        >
          <div className="flex gap-3">
            <Skeleton className="size-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
          <div className="space-y-2 pt-5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="mt-5 h-5 w-full" />
        </div>
      ))}
    </div>
  );
}
