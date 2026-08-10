import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

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
    <Button
      type="button"
      variant="ghost"
      role="switch"
      aria-checked={checked}
      aria-busy={disabled || undefined}
      aria-label={`${checked ? "Disable" : "Enable"} ${label}`}
      disabled={disabled}
      className="group/switch h-8 shrink-0 gap-2 rounded-lg px-1 disabled:cursor-wait disabled:opacity-65"
      onClick={(event) => {
        event.stopPropagation();
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {showLabel && (
        <Badge
          variant="outline"
          className={cn(
            "h-6 min-w-16 justify-center rounded-md px-2 text-xs font-medium",
            checked
              ? "border-primary/30 bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {disabled ? disabledLabel : checked ? "Active" : "Inactive"}
        </Badge>
      )}
      <span
        className={cn(
          "relative block h-5 w-9 rounded-full border transition-colors duration-200",
          checked
            ? "border-[#2456e8] bg-[#2456e8] dark:border-[#7895ff] dark:bg-[#7895ff]"
            : "border-[#c9c0b2] bg-[#ded8cb] dark:border-[#514f45] dark:bg-[#303029]",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 size-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 dark:bg-[#f4efe5]",
            checked ? "translate-x-[17px]" : "translate-x-0.5",
          )}
        />
      </span>
    </Button>
  );
}
