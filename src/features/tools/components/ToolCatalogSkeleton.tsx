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
          className="grid min-h-[280px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-line bg-card shadow-sm"
        >
          <div className="flex gap-3 px-5 pb-3 pt-5">
            <Skeleton className="size-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
          <div className="space-y-2 px-5 pb-5 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="flex min-h-16 items-center justify-between gap-3 border-t border-line bg-soft/55 px-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
