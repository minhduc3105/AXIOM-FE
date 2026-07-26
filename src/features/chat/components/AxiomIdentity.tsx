import { cn } from "@/shared/lib/utils";

export const visibleSkeletonClass =
  "h-3.5 rounded-full bg-[#d8d0c2]/85 shadow-[inset_0_0_0_1px_rgba(25,25,21,0.035)] dark:bg-[#38372f]/90";

export function AxiomIdentity({
  markClassName = "size-11",
  titleClassName = "text-2xl",
  wrapperClassName = "",
}: {
  markClassName?: string;
  titleClassName?: string;
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", wrapperClassName)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-2xl border border-[#d8d0c2]/80 bg-[#fffdf8]/80 p-1.5 dark:border-[#38372f]/80 dark:bg-[#1a1a17]/80",
          markClassName,
        )}
        aria-hidden="true"
      >
        <img
          src="/assets/logo.png"
          alt=""
          className="size-full object-contain"
        />
      </span>
      <strong className={cn("font-semibold leading-tight", titleClassName)}>
        AXIOM
      </strong>
    </div>
  );
}
