import { cn } from "@/shared/lib/utils";

type ToolStatusSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  showLabel?: boolean;
};

export function ToolStatusSwitch({
  checked,
  onCheckedChange,
  label,
  showLabel = true,
}: ToolStatusSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${checked ? "Disable" : "Enable"} ${label}`}
      className="group/switch inline-flex h-8 shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-[#2456e8]/30 dark:focus-visible:ring-[#7895ff]/35"
      onClick={(event) => {
        event.stopPropagation();
        onCheckedChange(!checked);
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {showLabel && (
        <span
          className={cn(
            "min-w-12 text-right text-xs font-medium",
            checked
              ? "text-[#1237b4] dark:text-[#bcc9ff]"
              : "text-[#777064] dark:text-[#aaa397]",
          )}
        >
          {checked ? "Active" : "Inactive"}
        </span>
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
    </button>
  );
}
