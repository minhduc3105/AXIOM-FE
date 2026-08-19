import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  getBlockOverlayStyle,
  type LayoutBlock,
} from "@/shared/types/document-results";

type SourceBlockOverlayProps = {
  blocks: LayoutBlock[];
  allBlocks: LayoutBlock[];
  activeComponentId: string | null;
  visible: boolean;
  onActivate: (componentId: string) => void;
};

export function SourceBlockOverlay({
  blocks,
  allBlocks,
  activeComponentId,
  visible,
  onActivate,
}: SourceBlockOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      aria-label="Parsed layout boxes"
    >
      {blocks.map((block) => {
        const style = getBlockOverlayStyle(block);
        if (!style) return null;
        const index =
          allBlocks.findIndex(
            (item) => item.component_id === block.component_id,
          ) + 1;
        const active = activeComponentId === block.component_id;
        return (
          <Button
            variant="ghost"
            className={cn(
              "pointer-events-auto absolute h-auto min-h-2 min-w-2 rounded-none border-2 border-primary/70 bg-primary/10 p-0 text-left transition hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring",
              active &&
                "border-primary bg-primary/25 ring-2 ring-background ring-offset-1 ring-offset-primary",
            )}
            key={block.component_id}
            style={style}
            type="button"
            data-block-id={block.component_id}
            aria-pressed={active}
            aria-label={`Select parsed block ${index}: ${block.type}`}
            onClick={() => onActivate(block.component_id)}
          >
            <Badge
              variant="secondary"
              className={cn(
                "absolute -left-0.5 -top-0.5 min-w-5 rounded-none bg-foreground px-1 py-0.5 text-center font-mono text-[9px] font-bold leading-none text-background",
                active && "bg-primary text-primary-foreground",
              )}
            >
              {index.toString().padStart(2, "0")}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}
