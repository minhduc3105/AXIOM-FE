import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function RememberSkillAction({
  onRemember,
}: {
  onRemember: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-label="Remember this"
            className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
            onClick={onRemember}
          />
        }
      >
        <SparklesIcon data-icon="inline-start" />
        Remember this
      </TooltipTrigger>
      <TooltipContent>Ask the agent to remember this workflow</TooltipContent>
    </Tooltip>
  );
}
