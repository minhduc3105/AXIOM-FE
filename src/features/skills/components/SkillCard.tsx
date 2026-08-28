import type { CSSProperties } from "react";
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSkillsState } from "../model/SkillsProvider";
import {
  formatSkillLanguage,
  formatSkillName,
  formatSkillVersion,
  getSkillScope,
} from "../model/skillPresentation";
import type { UserSkillSummary } from "../model/types";
import { SkillStatusSwitch } from "./SkillStatusSwitch";

type SkillCardProps = {
  skill: UserSkillSummary;
  workspaceId: string | null;
  onOpen: (skillId: string) => void;
};

export function SkillCard({ skill, workspaceId, onOpen }: SkillCardProps) {
  const {
    isSkillEnabled,
    isSkillUpdating,
    getSkillUpdateError,
    retrySkillUpdate,
    setSkillEnabled,
  } = useSkillsState();
  const displayName = formatSkillName(skill);
  const enabled = isSkillEnabled(skill.id, skill.user_enabled);
  const updating = isSkillUpdating(skill.id);
  const updateError = getSkillUpdateError(skill.id);
  const transitionName = `skill-${skill.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open ${displayName}`}
      data-status={enabled ? "enabled" : "disabled"}
      style={{ viewTransitionName: transitionName } as CSSProperties}
      className="group relative grid min-h-[292px] cursor-pointer grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-line bg-card outline-none transition-[transform,border-color,box-shadow,background-color] duration-300 animate-in fade-in slide-in-from-bottom-2 hover:-translate-y-0.5 hover:border-muted-foreground/45 hover:shadow-md focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/20"
      onClick={() => onOpen(skill.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(skill.id);
        }
      }}
    >
      <div className="flex min-w-0 items-start gap-3 px-5 pb-3 pt-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <SparklesIcon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <h3 className="min-h-12 min-w-0 flex-1 line-clamp-2 break-words text-base font-semibold leading-6 text-foreground">
              {displayName}
            </h3>
            <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <p className="min-h-[60px] line-clamp-3 text-sm leading-5 text-text-secondary">
          {skill.description || "No description is available for this skill."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="h-6 rounded-full border-line bg-soft px-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-secondary"
          >
            {formatSkillLanguage(skill.language)}
          </Badge>
          <Badge
            variant="outline"
            className="h-6 rounded-full border-line bg-soft px-2.5 text-[10px] font-medium text-text-secondary"
          >
            {formatSkillVersion(skill.version)}
          </Badge>
          <Badge
            variant="outline"
            className="h-6 max-w-full truncate rounded-full border-line bg-soft px-2.5 text-[10px] font-medium text-text-secondary"
          >
            {getSkillScope(skill.path)}
          </Badge>
        </div>
        <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
          <span className="truncate" title={skill.entry}>
            Entry:{" "}
            <code className="text-text-secondary">
              {skill.entry || "SKILL.md"}
            </code>
          </span>
          <span>
            {skill.metadata && typeof skill.metadata.file_count === "number"
              ? `${skill.metadata.file_count} bundled files`
              : "Bundle details on open"}
          </span>
        </div>
      </div>

      <footer className="flex min-h-16 items-center justify-between gap-3 border-t border-line bg-soft/55 px-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {enabled ? "Available to your agent" : "Available but disabled"}
          </p>
          {updateError ? (
            <div
              role="alert"
              className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-destructive"
            >
              <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
              <div className="min-w-0">
                <p className="line-clamp-2">Update failed: {updateError}</p>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className="mt-0 h-auto px-0 text-[11px] text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    void retrySkillUpdate(skill.id, workspaceId);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <RefreshCwIcon /> Retry
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <SkillStatusSwitch
          checked={enabled}
          onCheckedChange={(nextEnabled) =>
            void setSkillEnabled(skill.id, workspaceId, nextEnabled)
          }
          label={displayName}
          disabled={updating}
        />
      </footer>
    </article>
  );
}
