import type { ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function WorkspaceNavigationTooltip({
  expanded,
  label,
  children,
}: {
  expanded: boolean;
  label: string;
  children: ReactElement;
}) {
  if (expanded) return children;

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" align="center" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
