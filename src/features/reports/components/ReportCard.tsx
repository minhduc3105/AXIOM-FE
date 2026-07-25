import { ArrowUpRightIcon, Clock3Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import type { Report } from "../model/types";

type ReportCardProps = {
  report: Report;
  featured?: boolean;
  onOpen: (report: Report) => void;
};

export function ReportCard({
  report,
  featured = false,
  onOpen,
}: ReportCardProps) {
  return (
    <article
      className={cn(
        "group min-w-0 border-t border-[#cfc6b7] pt-4 dark:border-[#3b3932]",
        featured &&
          "grid gap-6 border-t-0 pt-0 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:col-span-2",
      )}
    >
      <button
        type="button"
        className={cn(
          "relative block w-full overflow-hidden rounded-[6px] bg-[#ded8cb] text-left outline-none ring-[#2456e8] transition-shadow focus-visible:ring-3 dark:bg-[#292923]",
          featured
            ? "aspect-[16/10] md:h-[420px] md:aspect-auto lg:h-[480px]"
            : "aspect-[16/10]",
        )}
        onClick={() => onOpen(report)}
        aria-label={`Open report: ${report.title}`}
      >
        <img
          src={report.image}
          alt={report.imageAlt}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
        />
        <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[#fffdf8]/92 text-[#191915] opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-[#191915]/92 dark:text-[#eee8dc]">
          <ArrowUpRightIcon className="size-4" aria-hidden="true" />
        </span>
      </button>

      <div className={cn("pt-4", featured && "self-end py-2 md:pt-0")}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase text-[#6d685e] dark:text-[#aaa397]">
          <span className="text-[#2456e8] dark:text-[#8da5ff]">
            {report.category}
          </span>
          <span aria-hidden="true">/</span>
          <span>{report.createdAt}</span>
        </div>

        <button
          type="button"
          className="block w-full text-left outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-[#2456e8]/30"
          onClick={() => onOpen(report)}
        >
          <h2
            className={cn(
              "font-semibold leading-[1.06] tracking-normal text-[#191915] transition-colors group-hover:text-[#2456e8] dark:text-[#eee8dc] dark:group-hover:text-[#8da5ff]",
              featured
                ? "text-[32px] sm:text-[36px] lg:text-[38px]"
                : "text-[25px]",
            )}
          >
            {report.title}
          </h2>
        </button>

        <p
          className={cn(
            "mt-3 text-[#615b51] dark:text-[#b6afa2]",
            featured ? "max-w-xl text-base leading-7" : "text-[14px] leading-6",
          )}
        >
          {report.excerpt}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[#ddd5c8] pt-4 text-xs text-[#6d685e] dark:border-[#38372f] dark:text-[#aaa397]">
          <span>
            <strong className="font-semibold text-[#191915] dark:text-[#eee8dc]">
              {report.author}
            </strong>{" "}
            · {report.source}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3Icon className="size-3.5" aria-hidden="true" />
            {report.readingTime}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {report.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="h-6 rounded-full border-[#d8d0c2] bg-[#fffdf8]/60 px-2.5 text-[10px] text-[#615b51] dark:border-[#403f36] dark:bg-white/5 dark:text-[#c7c0b4]"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </article>
  );
}
