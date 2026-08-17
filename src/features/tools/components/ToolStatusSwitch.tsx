import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/shared/lib/utils";
import { LoaderCircleIcon } from "lucide-react";

type ToolStatusSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  disabledLabel?: string;
  showLabel?: boolean;
};

export function ToolStatusSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  disabledLabel = "Updating",
  showLabel = true,
}: ToolStatusSwitchProps) {
  return (
    <div
      className="flex h-8 shrink-0 items-center gap-2"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {showLabel && (
        <Badge
          variant="outline"
          className={cn(
            "h-6 min-w-16 justify-center rounded-md px-2 text-xs font-medium",
            checked
              ? "border-status-success/30 bg-status-success/10 text-status-success"
              : "bg-muted text-muted-foreground",
          )}
        >
          {disabled ? <LoaderCircleIcon className="size-3 animate-spin" /> : null}
          {disabled ? disabledLabel : checked ? "Active" : "Disabled"}
        </Badge>
      )}
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-busy={disabled || undefined}
        aria-label={`${checked ? "Disable" : "Enable"} ${label}`}
        disabled={disabled}
        className={cn(
          checked
            ? "data-checked:bg-status-success focus-visible:border-status-success focus-visible:ring-status-success/20"
            : "border-line data-unchecked:bg-soft",
        )}
      />
    </div>
  );
}
