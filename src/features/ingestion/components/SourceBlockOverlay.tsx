import { cn } from "@/shared/lib/utils";
import { getBlockOverlayStyle, type LayoutBlock } from "../model/documentResults";

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
    <div className="pointer-events-none absolute inset-0 z-10" aria-label="Parsed layout boxes">
      {blocks.map((block) => {
        const style = getBlockOverlayStyle(block);
        if (!style) return null;
        const index = allBlocks.findIndex((item) => item.component_id === block.component_id) + 1;
        const active = activeComponentId === block.component_id;
        return (
          <button
            className={cn(
              "pointer-events-auto absolute min-h-2 min-w-2 border-2 border-amber-500/80 bg-amber-300/10 text-left transition hover:z-20 hover:bg-amber-300/25 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
              active && "z-20 border-amber-300 bg-amber-300/30 shadow-[0_0_0_2px_rgba(17,17,15,0.8),0_0_16px_rgba(251,191,36,0.7)]",
            )}
            key={block.component_id}
            style={style}
            type="button"
            aria-pressed={active}
            aria-label={`Select parsed block ${index}: ${block.type}`}
            onMouseEnter={() => onActivate(block.component_id)}
            onClick={() => onActivate(block.component_id)}
          >
            <span
              className={cn(
                "absolute -left-0.5 -top-0.5 min-w-5 bg-[#191915]/90 px-1 py-0.5 text-center font-mono text-[9px] font-bold leading-none text-white",
                active && "bg-amber-300 text-[#191915]",
              )}
            >
              {index.toString().padStart(2, "0")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
