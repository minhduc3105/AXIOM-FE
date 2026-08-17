import type { CSSProperties } from "react";
import { AlertTriangleIcon, ArrowUpRightIcon, RefreshCwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToolsState } from "../model/ToolsProvider";
import { formatToolKind, formatToolName } from "../model/toolPresentation";
import type { ToolSummary } from "../model/types";
import { ToolKindIcon } from "./ToolKindIcon";
import { ToolStatusSwitch } from "./ToolStatusSwitch";

type ToolCardProps = {
  tool: ToolSummary;
  enabled?: boolean;
  onOpen: (toolName: string) => void;
  availabilityScope?: {
    organizationName: string;
    workspaceName: string;
  };
};

export function ToolCard({
  tool,
  enabled: enabledProp,
  onOpen,
  availabilityScope,
}: ToolCardProps) {
  const {
    isToolEnabled,
    isToolUpdating,
    getToolUpdateError,
    retryToolUpdate,
    setToolEnabled,
  } = useToolsState();
  const enabled = enabledProp ?? isToolEnabled(tool.name, tool.enabled);
  const updating = isToolUpdating(tool.name);
  const updateError = getToolUpdateError(tool.name);
  const displayName = formatToolName(tool.name);
  const transitionName = `tool-${tool.name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open ${displayName}`}
      data-status={enabled ? "active" : "disabled"}
      style={{ viewTransitionName: transitionName } as CSSProperties}
      className="group relative grid min-h-[280px] cursor-pointer grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-line bg-card outline-none transition-[transform,border-color,box-shadow,background-color] duration-300 animate-in fade-in slide-in-from-bottom-2 hover:-translate-y-0.5 hover:border-muted-foreground/45 hover:shadow-md focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
      onClick={() => onOpen(tool.name)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(tool.name);
        }
      }}
    >
      <div className="flex min-w-0 items-start gap-3 px-5 pb-3 pt-5">
        <ToolKindIcon kind={tool.kind} className="rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="min-h-12 min-w-0 flex-1 line-clamp-2 break-words text-base font-semibold leading-6 text-foreground">
              {displayName}
            </h3>
            <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
          </div>
          <code className="mt-1 block truncate text-xs text-muted-foreground">
            {tool.name}
          </code>
        </div>
      </div>

      <div className="px-5 pb-5">
        <p className="min-h-[60px] line-clamp-3 text-sm leading-5 text-text-secondary">
          {tool.description || "No description is available for this tool."}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant="outline"
            className="h-6 max-w-[calc(100%-112px)] truncate rounded-full border-line bg-soft px-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-secondary"
          >
            {formatToolKind(tool.kind)}
          </Badge>
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
            {tool.param_count} {tool.param_count === 1 ? "parameter" : "parameters"}
          </span>
        </div>
      </div>

      <footer className="flex min-h-16 items-center justify-between gap-3 border-t border-line bg-soft/55 px-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {enabled ? "Active in current process" : "Disabled in current process"}
          </p>
          {availabilityScope ? (
            <p className="mt-1 truncate text-[11px] text-muted-foreground" title={`Organization: ${availabilityScope.organizationName} · Workspace: ${availabilityScope.workspaceName}`}>
              {availabilityScope.organizationName} · {availabilityScope.workspaceName}
            </p>
          ) : null}
          {updateError ? (
            <div role="alert" className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-destructive">
              <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
              <div className="min-w-0">
                <p className="line-clamp-2">Update failed. Previous status restored: {updateError}</p>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className="mt-0 h-auto px-0 text-[11px] text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    void retryToolUpdate(tool.name);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <RefreshCwIcon /> Retry update
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <ToolStatusSwitch
          checked={enabled}
          onCheckedChange={(nextEnabled) => setToolEnabled(tool.name, nextEnabled)}
          label={displayName}
          disabled={updating}
        />
      </footer>
    </article>
  );
}
