import { FileTextIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CitationSource } from "../model/types";

type CitationMarkerProps = {
  marker: ReactNode;
  markerLabel: string;
  source: CitationSource;
};

export function CitationMarker({
  marker,
  markerLabel,
  source,
}: CitationMarkerProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        closeOnClick={false}
        render={
          <button
            type="button"
            aria-label={`Source ${markerLabel}`}
            className="mx-0.5 inline-flex align-baseline text-xs font-medium text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        }
      >
        {marker}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={8}
        className="grid w-[min(24rem,calc(100vw-2rem))] gap-3 whitespace-normal rounded-xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
      >
        <div className="flex min-w-0 items-start gap-2">
          <FileTextIcon
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="grid min-w-0 gap-1">
            <p className="truncate text-sm font-semibold">{source.source}</p>
            <p className="text-xs text-muted-foreground">{source.locator}</p>
          </div>
        </div>
        <blockquote className="max-h-48 overflow-y-auto border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground">
          {source.excerpt}
        </blockquote>
      </TooltipContent>
    </Tooltip>
  );
}
