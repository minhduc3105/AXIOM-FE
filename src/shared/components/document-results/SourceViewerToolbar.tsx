import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FocusIcon,
  RotateCcwIcon,
  ScanSearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SourceViewerToolbarProps = {
  positionLabel?: string;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  zoom?: number;
  zoomOutDisabled?: boolean;
  zoomInDisabled?: boolean;
  onZoomOut?: () => void;
  onZoomIn?: () => void;
  onFitWidth?: () => void;
  onResetZoom?: () => void;
  showBoxes?: boolean;
  onShowBoxesChange?: (visible: boolean) => void;
};

function ToolbarButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label={label}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function SourceViewerToolbar({
  positionLabel,
  previousDisabled,
  nextDisabled,
  onPrevious,
  onNext,
  zoom,
  zoomOutDisabled,
  zoomInDisabled,
  onZoomOut,
  onZoomIn,
  onFitWidth,
  onResetZoom,
  showBoxes,
  onShowBoxesChange,
}: SourceViewerToolbarProps) {
  const hasPosition = Boolean(positionLabel && onPrevious && onNext);
  const hasZoom =
    typeof zoom === "number" && Boolean(onZoomOut && onZoomIn && onFitWidth);

  return (
    <div
      className="flex min-h-11 min-w-0 flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
      role="toolbar"
      aria-label="Source preview controls"
    >
      {hasPosition && (
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolbarButton
            label="Previous page"
            disabled={previousDisabled}
            onClick={onPrevious}
          >
            <ChevronLeftIcon />
          </ToolbarButton>
          <span className="min-w-16 text-center text-xs font-medium tabular-nums">
            {positionLabel}
          </span>
          <ToolbarButton
            label="Next page"
            disabled={nextDisabled}
            onClick={onNext}
          >
            <ChevronRightIcon />
          </ToolbarButton>
        </div>
      )}

      {hasPosition && hasZoom && <span className="mx-1 h-5 w-px bg-border" />}

      {hasZoom && (
        <div className="flex shrink-0 items-center gap-0.5">
          <ToolbarButton
            label="Zoom out"
            disabled={zoomOutDisabled}
            onClick={onZoomOut}
          >
            <ZoomOutIcon />
          </ToolbarButton>
          <span className="min-w-12 text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <ToolbarButton
            label="Zoom in"
            disabled={zoomInDisabled}
            onClick={onZoomIn}
          >
            <ZoomInIcon />
          </ToolbarButton>
          <ToolbarButton label="Fit width" onClick={onFitWidth}>
            <FocusIcon />
          </ToolbarButton>
          {onResetZoom && (
            <ToolbarButton label="Reset zoom" onClick={onResetZoom}>
              <RotateCcwIcon />
            </ToolbarButton>
          )}
        </div>
      )}

      {typeof showBoxes === "boolean" && onShowBoxesChange && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                className="ml-auto"
                variant="outline"
                size="sm"
                pressed={showBoxes}
                onPressedChange={onShowBoxesChange}
                aria-label="Toggle parsed layout boxes"
              />
            }
          >
            <ScanSearchIcon />
            <span className="max-sm:sr-only">Boxes</span>
          </TooltipTrigger>
          <TooltipContent>Toggle parsed layout boxes</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
